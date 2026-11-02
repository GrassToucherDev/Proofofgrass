import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = (f) => readFileSync(join(__dirname, "..", "supabase_migrations", f), "utf8");
const STUBS = `
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create table "UserInventory"(username text, item_id text, owned boolean, equipped boolean, purchased_at timestamptz);
create table grass_draw_entries(id bigserial primary key, cycle_id uuid, username text, entry_type text, source_id text, raw_amount numeric, weighted_amount numeric, multiplier numeric, notes text, metadata jsonb);
create table username_claims(username text primary key, google_id text not null unique);
`;
let db, wheel;
const one = async (q, p) => (await db.query(q, p)).rows[0];
const all = async (q, p) => (await db.query(q, p)).rows;
const future = "now() + interval '5 days'";

beforeEach(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  for (const f of ["wheel_core.sql", "wheel_no_prize.sql", "fright_bits.sql", "wheel_free_spins.sql"]) await db.exec(sql(f));
  wheel = (await one(`insert into wheels(slug,name,status,visibility,featured,price_mode,price_usd) values ('test-wheel','Test Wheel','active','public',true,'usd',5) returning id`)).id;
  await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,weight,rarity,active) values ($1,'Nothing','nothing',100,'common',true)`, [wheel]);
  await db.exec(`insert into username_claims values ('alice','g-alice'),('bob','g-bob')`);
}, 60000);

const grant = (users, n = 5, batch = "b1") => one(`select wheel_free_spin_grant($1, $2, ${future}, $3, 'test', 'admin') r`, [users, n, batch]).then((x) => x.r);

describe("free spins", { timeout: 60000 }, () => {
  it("grants N credits per claimed username and reports unknown names", async () => {
    const r = await grant(["@Alice", "ghost"]);
    expect(r.results).toEqual([{ username: "alice", result: "granted", count: 5 }, { username: "ghost", result: "unknown_username" }]);
    expect((await one(`select wheel_free_spin_count('g-alice') c`)).c).toBe(5);
    expect((await one(`select wheel_free_spin_count('g-bob') c`)).c).toBe(0);
  });

  it("the same batch can't be granted twice", async () => {
    await grant(["alice"]);
    const again = await grant(["alice"]);
    expect(again.results[0].result).toBe("already_granted");
    expect((await one(`select wheel_free_spin_count('g-alice') c`)).c).toBe(5);
  });

  it("validates count, expiry and batch", async () => {
    expect((await grant(["alice"], 0)).error).toBe("bad_count");
    expect((await grant(["alice"], 51)).error).toBe("bad_count");
    expect((await grant(["alice"], 5, " ")).error).toBe("batch_required");
    expect((await one(`select wheel_free_spin_grant(array['alice'], 5, now() - interval '1 day', 'x', null, null) r`)).r.error).toBe("bad_expiry");
  });

  it("spending a credit makes a normal spin with zero money, uses exactly one credit, and can't be replayed", async () => {
    await grant(["alice"]);
    const r = (await one(`select wheel_free_spin('g-alice','alice') r`)).r;
    expect(r.ok).toBe(true); expect(r.remaining).toBe(4);
    const s = await one(`select * from wheel_spins`);
    expect(s.payment_tx).toMatch(/^free:/); expect(Number(s.spin_price)).toBe(0);
    expect(Number(s.amount_locked)).toBe(0); expect(Number(s.eco_amount)).toBe(0);
    expect(s.username).toBe("alice");
    const used = await all(`select spin_id from wheel_free_spin_credits where used_at is not null`);
    expect(used).toHaveLength(1); expect(used[0].spin_id).toBe(s.id);
    // the locked-total bookkeeping is untouched
    expect(Number((await one(`select coalesce(sum(amount_locked),0) t from wheel_spins`)).t)).toBe(0);
  });

  it("five credits give exactly five spins, then no_credit", async () => {
    await grant(["alice"]);
    for (let i = 0; i < 5; i++) expect((await one(`select wheel_free_spin('g-alice','alice') r`)).r.ok).toBe(true);
    expect((await one(`select wheel_free_spin('g-alice','alice') r`)).r.error).toBe("no_credit");
    expect((await one(`select count(*)::int c from wheel_spins`)).c).toBe(5);
  });

  it("credits belong to one account only", async () => {
    await grant(["alice"]);
    expect((await one(`select wheel_free_spin('g-bob','bob') r`)).r.error).toBe("no_credit");
  });

  it("expired and revoked credits can't be used", async () => {
    await grant(["alice"], 2, "old");
    await db.query(`update wheel_free_spin_credits set expires_at = now() - interval '1 minute' where batch = 'old'`);
    expect((await one(`select wheel_free_spin('g-alice','alice') r`)).r.error).toBe("no_credit");
    await grant(["bob"], 3, "rev");
    expect((await one(`select wheel_free_spin_revoke('rev') r`)).r.revoked).toBe(3);
    expect((await one(`select wheel_free_spin('g-bob','bob') r`)).r.error).toBe("no_credit");
  });

  it("revoke leaves already-used credits alone", async () => {
    await grant(["alice"], 3, "r2");
    await db.query(`select wheel_free_spin('g-alice','alice')`);
    expect((await one(`select wheel_free_spin_revoke('r2') r`)).r.revoked).toBe(2);
    expect((await one(`select count(*)::int c from wheel_free_spin_credits where used_at is not null`)).c).toBe(1);
  });

  it("the wheel must be open and playable; the credit is untouched when it isn't", async () => {
    await grant(["alice"]);
    await db.query(`update wheels set status = 'ended'`);
    expect((await one(`select wheel_free_spin('g-alice','alice') r`)).r.error).toBe("not_active");
    await db.query(`update wheels set status = 'active'`);
    await db.query(`update wheel_prizes set active = false`);
    expect((await one(`select wheel_free_spin('g-alice','alice') r`)).r.error).toBe("not_playable");
    expect((await one(`select wheel_free_spin_count('g-alice') c`)).c).toBe(5);
  });

  it("a failed settle rolls everything back and keeps the credit", async () => {
    await grant(["alice"]);
    // only a limited, already-empty prize is active, plus the playable check bypassed by an unlimited-but-inactive row
    await db.query(`update wheel_prizes set weight = 100`);
    await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,weight,rarity,active,inventory_total,inventory_remaining) values ($1,'Empty','shield',100,'common',true,1,0)`, [wheel]);
    await db.query(`update wheel_prizes set active = false where name = 'Nothing'`);
    await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,weight,rarity,active) values ($1,'Gate','nothing',0.0001,'common',false)`, [wheel]);
    // make wheel_is_playable true via an active unlimited prize that the settle can never pick: available_until in the past
    await db.query(`update wheel_prizes set active = true, available_until = now() - interval '1 day' where name = 'Gate'`);
    await expect(db.query(`select wheel_free_spin('g-alice','alice')`)).rejects.toThrow(/free_spin_failed:pool_empty/);
    expect((await one(`select count(*)::int c from wheel_spins`)).c).toBe(0);
    expect((await one(`select count(*)::int c from wheel_intents`)).c).toBe(0);
    expect((await one(`select wheel_free_spin_count('g-alice') c`)).c).toBe(5);
  });

  it("free spins can find a Fright Bits monster and the normal rotation runs", async () => {
    await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,reward_config,weight,rarity,active) values ($1,'Pack','cosmetic_pack','{"item_id":"p"}',50,'common',true)`, [wheel]);
    await db.exec(sql("fright_bits_seed.sql"));
    await db.query(`select fright_bits_set_legal_gate('fright-bits', true)`);
    expect((await one(`select fright_bits_start('fright-bits') r`)).r.ok).toBe(true);
    await db.query(`update wheel_prizes set weight = 1000000 where reward_type='collectible'`);
    await grant(["alice"], 5);
    const r = (await one(`select wheel_free_spin('g-alice','alice') r`)).r;
    expect(r.spin.prize.reward_type).toBe("collectible");
    expect((await one(`select username from collectible_ownership`)).username).toBe("alice");
    expect((await one(`select count(*)::int c from collectibles where status='active'`)).c).toBe(5);
  });

  it("paid intents still need a positive price", async () => {
    await expect(db.query(`insert into wheel_intents(wheel_id,google_id,username,price_tokens,lock_amount,eco_amount,expires_at) values ($1,'g','u',-1,0,0,now())`, [wheel])).rejects.toThrow();
  });
});
