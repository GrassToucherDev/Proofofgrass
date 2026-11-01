import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = (f) => readFileSync(join(__dirname, "..", "supabase_migrations", f), "utf8");

const STUBS = `
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create table "UserInventory"(username text, item_id text, owned boolean, equipped boolean, purchased_at timestamptz);
create table grass_draw_entries(id bigserial primary key, cycle_id uuid, username text, entry_type text, source_id text, raw_amount numeric, weighted_amount numeric, multiplier numeric, notes text, metadata jsonb);
`;

const OFFICIAL = [
  ["WAGO: Crashberry", "A berry-themed little monster with a market-crashing bite."],
  ["WAGO: Dusty Trails", "Fresh out of the ancient hiking trails."],
  ["WAGO: Count Canopy", "Lurking beneath the treetops after sunset."],
  ["WAGO: Rotwood", "The forest’s most stubborn undead wanderer."],
  ["WAGO: Howlwood", "When the full moon rises, the wilderness answers."],
  ["WAGO: Moonbloom", "Casting spells under the stars."],
  ["WAGO: Bonebranch", "All bones, no leaves."],
  ["WAGO: Captain Driftwood", "Hunting treasure across forgotten shores."],
  ["WAGO: Patchroot", "Guardian of the autumn fields."],
  ["WAGO: Mistwalker", "A mysterious spirit drifting through foggy trails."],
];

let db, wheel, n;
const one = async (q, p) => (await db.query(q, p)).rows[0];
const all = async (q, p) => (await db.query(q, p)).rows;

async function freshDb() {
  const d = new PGlite();
  await d.exec(STUBS);
  await d.exec(sql("wheel_core.sql"));
  await d.exec(sql("wheel_no_prize.sql"));
  await d.exec(sql("fright_bits.sql"));
  return d;
}

async function setup({ seed = true } = {}) {
  db = await freshDb();
  n = 0;
  wheel = (await one(`insert into wheels(slug,name,status,visibility,featured,price_mode,price_usd)
     values ('test-wheel','Test Wheel','active','public',true,'usd',5) returning id`)).id;
  // ordinary prizes: an unlimited 'nothing' and a limited shield
  await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,weight,rarity,active) values ($1,'Nothing','nothing',50,'common',true)`, [wheel]);
  await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,weight,rarity,active,inventory_total,inventory_remaining) values ($1,'Shield','shield',50,'common',true,2,2)`, [wheel]);
  await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,reward_config,weight,rarity,active) values ($1,'Base Pack','cosmetic_pack','{"item_id":"base"}',50,'common',true)`, [wheel]);
  if (seed) await db.exec(sql("fright_bits_seed.sql"));
}

async function openAndStart() {
  await db.query(`select fright_bits_set_legal_gate('fright-bits', true)`);
  return (await one(`select fright_bits_start('fright-bits') r`)).r;
}
// make collectibles overwhelmingly likely so a spin deterministically lands on one
async function favourCollectibles() {
  await db.query(`update wheel_prizes set weight = 1000000 where reward_type='collectible'`);
}
async function favourOrdinary() {
  await db.query(`update wheel_prizes set weight = 0.0001 where reward_type='collectible'`);
  await db.query(`update wheel_prizes set weight = 1000 where reward_type='nothing'`);
}
async function spin(user = "user" + (++n), createdAt = null) {
  const it = await one(`insert into wheel_intents(wheel_id,google_id,username,price_tokens,lock_amount,eco_amount,expires_at${createdAt ? ",created_at" : ""})
    values ($1,$2,$3,100,75,25, now()+interval '10 minutes'${createdAt ? ",$4" : ""}) returning id`, createdAt ? [wheel, "g-" + user, user, createdAt] : [wheel, "g-" + user, user]);
  const r = (await one(`select wheel_spin_settle($1,$2,'wallet',100) r`, [it.id, "sig-" + it.id])).r;
  return { r, intent: it.id, user };
}
const activeNames = async () => (await all(`select name from collectibles where status='active' order by reserve_order`)).map((x) => x.name);

describe("Fright Bits", { timeout: 60000 }, () => {
  beforeEach(setup);

  it("seeds the ten official names and descriptions, all Rare, stock 1, switched off", async () => {
    const rows = await all(`select p.name, p.description, p.rarity, p.inventory_total, p.inventory_remaining, p.active, p.reward_type, k.name kn, k.description kd, k.status, k.rarity kr
       from collectibles k join wheel_prizes p on p.id = k.prize_id order by k.number`);
    expect(rows).toHaveLength(10);
    rows.forEach((r, i) => {
      expect(r.name).toBe(OFFICIAL[i][0]); expect(r.kn).toBe(OFFICIAL[i][0]);
      expect(r.description).toBe(OFFICIAL[i][1]); expect(r.kd).toBe(OFFICIAL[i][1]);
      expect(r.rarity).toBe("rare"); expect(r.kr).toBe("rare");
      expect(r.inventory_total).toBe(1); expect(r.inventory_remaining).toBe(1);
      expect(r.active).toBe(false); expect(r.status).toBe("reserve"); expect(r.reward_type).toBe("collectible");
    });
    const c = await one(`select * from collectible_collections`);
    expect(c.status).toBe("draft"); expect(c.paid_eligibility_enabled).toBe(false);
    // Nov 6 2026 11:59:59 PM EST = Nov 7 04:59:59 UTC
    expect(new Date(c.ends_at).toISOString()).toBe("2026-11-07T04:59:59.000Z");
  });

  it("seed is idempotent and never resets live state", async () => {
    await openAndStart(); await favourCollectibles(); await spin();
    await db.exec(sql("fright_bits_seed.sql"));
    expect(await all(`select 1 from collectibles`)).toHaveLength(10);
    expect(await one(`select count(*)::int c from collectibles where status='claimed'`)).toEqual({ c: 1 });
  });

  it("legal gate: cannot start while paid eligibility is off, and nothing can be won", async () => {
    expect((await one(`select fright_bits_start('fright-bits') r`)).r).toEqual({ ok: false, error: "legal_gate_closed" });
    await favourCollectibles();
    const s = await spin();
    expect(s.r.ok).toBe(true);
    expect(s.r.spin.prize.reward_type).not.toBe("collectible");
    expect(await one(`select count(*)::int c from collectible_ownership`)).toEqual({ c: 0 });
  });

  it("start activates the first five in reserve order", async () => {
    expect(await openAndStart()).toEqual({ ok: true });
    expect(await activeNames()).toEqual(OFFICIAL.slice(0, 5).map((x) => x[0]));
    expect(await one(`select count(*)::int c from wheel_prizes where reward_type='collectible' and active`)).toEqual({ c: 5 });
  });

  it("a collectible win records one owner, removes it, and promotes the next reserve", async () => {
    await openAndStart(); await favourCollectibles();
    const s = await spin("alice");
    expect(s.r.ok).toBe(true);
    const won = s.r.spin.prize.name;
    expect(s.r.spin.fulfillment_status).toBe("completed");
    const own = await one(`select o.username, k.name, k.status from collectible_ownership o join collectibles k on k.id=o.collectible_id`);
    expect(own).toEqual({ username: "alice", name: won, status: "claimed" });
    expect(await one(`select active from wheel_prizes where name=$1`, [won])).toEqual({ active: false });
    const act = await activeNames();
    expect(act).toHaveLength(5);
    expect(act).not.toContain(won);
    expect(act).toContain("WAGO: Moonbloom");
    expect((await all(`select kind from collectible_events order by id`)).map((e) => e.kind)).toEqual(expect.arrayContaining(["claimed", "activated"]));
  });

  it("all ten can be won exactly once each by different people, then the pool is empty of them", async () => {
    await openAndStart(); await favourCollectibles();
    const names = new Set();
    for (let i = 0; i < 10; i++) { const s = await spin(); expect(s.r.spin.prize.reward_type).toBe("collectible"); names.add(s.r.spin.prize.name); expect(await activeNames()).toHaveLength(Math.max(0, Math.min(5, 9 - i))); }
    expect(names.size).toBe(10);
    expect(await one(`select count(distinct collectible_id)::int c, count(*)::int t from collectible_ownership`)).toEqual({ c: 10, t: 10 });
    const next = await spin();
    expect(next.r.spin.prize.reward_type).not.toBe("collectible");
  });

  it("ordinary wins do not rotate anything or write events", async () => {
    await openAndStart(); await favourOrdinary();
    const before = await activeNames(); const ev = await one(`select count(*)::int c from collectible_events`);
    for (let i = 0; i < 5; i++) await spin();
    expect(await activeNames()).toEqual(before);
    expect(await one(`select count(*)::int c from collectible_events`)).toEqual(ev);
    expect(await one(`select count(*)::int c from collectible_ownership`)).toEqual({ c: 0 });
  });

  it("replaying a payment signature never creates a second owner", async () => {
    await openAndStart(); await favourCollectibles();
    const s = await spin("bob");
    const again = (await one(`select wheel_spin_settle($1,$2,'wallet',100) r`, [s.intent, "sig-" + s.intent])).r;
    expect(again.replay).toBe(true);
    expect(await one(`select count(*)::int c from collectible_ownership`)).toEqual({ c: 1 });
    const other = await one(`insert into wheel_intents(wheel_id,google_id,username,price_tokens,lock_amount,eco_amount,expires_at) values ($1,'g-x','x',100,75,25,now()+interval '5 min') returning id`, [wheel]);
    expect((await one(`select wheel_spin_settle($1,$2,'w',100) r`, [other.id, "sig-" + s.intent])).r.error).toBe("signature_used");
  });

  it("ownership is append-only and unique per collectible", async () => {
    await openAndStart(); await favourCollectibles(); await spin("carol");
    await expect(db.query(`update collectible_ownership set username='mallory'`)).rejects.toThrow(/append-only/);
    await expect(db.query(`delete from collectible_ownership`)).rejects.toThrow(/append-only/);
    const o = await one(`select * from collectible_ownership`);
    await expect(db.query(`insert into collectible_ownership(collectible_id,spin_id,google_id,username) values ($1,$2,'g','dave')`, [o.collectible_id, o.spin_id])).rejects.toThrow();
  });

  it("cutoff: intents created after it cannot win; intents created before it still can; no reserve promotion after end", async () => {
    await openAndStart(); await favourCollectibles();
    // move the cutoff to one hour ago
    await db.query(`update wheel_prizes set available_until = now() - interval '1 hour' where reward_type='collectible'`);
    const late = await spin("late");
    expect(late.r.spin.prize.reward_type).not.toBe("collectible");
    const early = await spin("early", new Date(Date.now() - 2 * 3600e3).toISOString());
    expect(early.r.spin.prize.reward_type).toBe("collectible");
    // collection end passed: replenish must not promote
    await db.query(`update collectible_collections set ends_at = now() - interval '1 minute'`);
    const before = await activeNames();
    await db.query(`update wheel_prizes set available_until = null where reward_type='collectible'`);
    const s = await spin("after");
    expect(s.r.spin.prize.reward_type).toBe("collectible");
    expect((await activeNames()).length).toBe(before.length - 1);
  });

  it("pause takes everything off the wheel and resume restores the same active set", async () => {
    await openAndStart(); const before = await activeNames();
    await db.query(`select fright_bits_pause('fright-bits')`);
    expect(await one(`select count(*)::int c from wheel_prizes where reward_type='collectible' and active`)).toEqual({ c: 0 });
    await favourCollectibles();
    expect((await spin()).r.spin.prize.reward_type).not.toBe("collectible");
    await db.query(`select fright_bits_start('fright-bits')`);
    expect(await activeNames()).toEqual(before);
    expect(await one(`select count(*)::int c from wheel_prizes where reward_type='collectible' and active`)).toEqual({ c: 5 });
  });

  it("closing the legal gate while live pauses the collection", async () => {
    await openAndStart();
    await db.query(`select fright_bits_set_legal_gate('fright-bits', false)`);
    expect((await one(`select status from collectible_collections`)).status).toBe("paused");
    expect(await one(`select count(*)::int c from wheel_prizes where reward_type='collectible' and active`)).toEqual({ c: 0 });
  });

  it("end retires unclaimed characters but keeps ownership", async () => {
    await openAndStart(); await favourCollectibles(); await spin("erin");
    await db.query(`select fright_bits_end('fright-bits')`);
    expect(await one(`select count(*)::int c from collectibles where status='claimed'`)).toEqual({ c: 1 });
    expect(await one(`select count(*)::int c from collectibles where status='retired'`)).toEqual({ c: 9 });
    expect(await one(`select count(*)::int c from collectible_ownership`)).toEqual({ c: 1 });
    expect((await one(`select fright_bits_start('fright-bits') r`)).r.error).toBe("ended");
  });

  it("admin can change reserve order, and the new order drives promotion", async () => {
    await db.query(`select fright_bits_configure('fright-bits', null, null, array['mistwalker','patchroot'])`);
    await openAndStart();
    expect(await activeNames()).toContain("WAGO: Mistwalker");
  });

  it("a promoted character takes the wheel slice the winner left, and slots fill from the reserved list", async () => {
    await db.query(`select fright_bits_configure('fright-bits', null, null, null, array[1,3,5,7,9])`);
    await openAndStart();
    const segs = (await all(`select p.segment from wheel_prizes p join collectibles k on k.prize_id=p.id where k.status='active' order by k.number`)).map((r) => r.segment);
    expect(segs).toEqual([1, 3, 5, 7, 9]);
    await favourCollectibles();
    const s = await spin();
    const won = s.r.spin.segment;
    const promoted = await one(`select p.segment from wheel_prizes p join collectibles k on k.prize_id=p.id where k.name='WAGO: Moonbloom'`);
    expect(promoted.segment).toBe(won);
    const live = (await all(`select p.segment from wheel_prizes p where p.reward_type='collectible' and p.active`)).map((r) => r.segment);
    expect(new Set(live).size).toBe(5);
  });

  it("replace_packs: packs step aside, characters take their combined odds, and everything is restored on pause", async () => {
    await db.query(`delete from wheel_prizes where reward_type='cosmetic_pack'`);
    await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,reward_config,weight,rarity,active) values ($1,'Pack A','cosmetic_pack','{"item_id":"a"}',20,'common',true),($1,'Pack B','cosmetic_pack','{"item_id":"b"}',10,'common',true),($1,'Pack Off','cosmetic_pack','{"item_id":"c"}',99,'common',false)`, [wheel]);
    await openAndStart();
    expect(await one(`select count(*)::int c from wheel_prizes where reward_type='cosmetic_pack' and active`)).toEqual({ c: 0 });
    const ws = (await all(`select weight from wheel_prizes where reward_type='collectible' and active`)).map((r) => Number(r.weight));
    expect(ws).toEqual([6, 6, 6, 6, 6]);                   // 30 total / 5
    expect(ws.reduce((a, b) => a + b, 0)).toBe(30);
    // claiming one keeps the per-character odds, and the next reserve joins at the same weight
    await favourCollectibles(); await spin();
    await db.query(`select fright_bits_pause('fright-bits')`);
    const packs = await all(`select name from wheel_prizes where reward_type='cosmetic_pack' and active order by name`);
    expect(packs.map((r) => r.name)).toEqual(["Pack A", "Pack B"]);   // the one that was off stays off
    await db.query(`select fright_bits_start('fright-bits')`);
    expect(await one(`select count(*)::int c from wheel_prizes where reward_type='cosmetic_pack' and active`)).toEqual({ c: 0 });
    await db.query(`select fright_bits_end('fright-bits')`);
    expect(await one(`select count(*)::int c from wheel_prizes where reward_type='cosmetic_pack' and active`)).toEqual({ c: 2 });
  });

  it("replace_packs refuses to start when there are no active packs; manual mode leaves packs alone", async () => {
    await db.query(`delete from wheel_prizes where reward_type='cosmetic_pack'`);
    await db.query(`select fright_bits_set_legal_gate('fright-bits', true)`);
    expect((await one(`select fright_bits_start('fright-bits') r`)).r.error).toBe("no_packs_to_replace");
    expect((await one(`select status from collectible_collections`)).status).toBe("draft");
    await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,reward_config,weight,rarity,active) values ($1,'Pack A','cosmetic_pack','{"item_id":"a"}',20,'common',true)`, [wheel]);
    await db.query(`select fright_bits_configure('fright-bits', null, null, null, null, 'manual')`);
    expect((await one(`select fright_bits_start('fright-bits') r`)).r.ok).toBe(true);
    expect(await one(`select count(*)::int c from wheel_prizes where reward_type='cosmetic_pack' and active`)).toEqual({ c: 1 });
    expect((await one(`select fright_bits_configure('fright-bits', null, null, null, null, 'replace_packs') r`)).r.error).toBe("pause_first");
  });

  it("state hides reserve identity in silhouette mode and shows it in artwork mode", async () => {
    await openAndStart();
    let st = (await one(`select fright_bits_state('fright-bits') r`)).r;
    const reserve = st.items.filter((i) => i.status === "reserve");
    expect(reserve).toHaveLength(5);
    reserve.forEach((i) => { expect(i.name).toBeNull(); expect(i.image_url).toBeNull(); expect(i.description).toBeNull(); expect(i.silhouette).toBe(true); });
    expect(st.collection.purchasable).toBe(true);
    await db.query(`select fright_bits_configure('fright-bits','artwork')`);
    st = (await one(`select fright_bits_state('fright-bits') r`)).r;
    st.items.filter((i) => i.status === "reserve").forEach((i) => expect(i.name).toMatch(/^WAGO: /));
  });

  it("for_user lists only that account's collectibles", async () => {
    await openAndStart(); await favourCollectibles(); const s = await spin("frank");
    const mine = (await one(`select fright_bits_for_user('g-frank') r`)).r;
    expect(mine).toHaveLength(1); expect(mine[0].name).toBe(s.r.spin.prize.name);
    expect((await one(`select fright_bits_for_user('g-nobody') r`)).r).toEqual([]);
  });

  it("the settle patch is idempotent and Wheel economics columns are untouched", async () => {
    await db.exec(sql("fright_bits.sql"));
    const def = (await one(`select pg_get_functiondef('public.wheel_spin_settle(uuid,text,text,numeric)'::regprocedure) d`)).d;
    expect(def.match(/p.available_until is null/g)).toHaveLength(3);
    await openAndStart(); await favourCollectibles(); await spin();
    const sp = await one(`select amount_locked, eco_amount, spin_price from wheel_spins`);
    expect(Number(sp.amount_locked)).toBe(75); expect(Number(sp.eco_amount)).toBe(25); expect(Number(sp.spin_price)).toBe(100);
  });

  it("without Fright Bits seeded the ordinary Wheel behaves as before (inventory still decrements)", async () => {
    await setup({ seed: false });
    await db.query(`update wheel_prizes set weight = 0.0001 where reward_type='nothing'`);
    await db.query(`update wheel_prizes set weight = 1000 where reward_type='shield'`);
    const s = await spin();
    expect(s.r.spin.prize.reward_type).toBe("shield");
    expect((await one(`select inventory_remaining r from wheel_prizes where reward_type='shield'`)).r).toBe(1);
    expect(s.r.spin.fulfillment_status).toBe("pending");
  });

  it("rollback script ends the collection safely and keeps owners", async () => {
    await openAndStart(); await favourCollectibles(); await spin();
    await db.exec(sql("fright_bits_rollback.sql")); await db.exec(sql("fright_bits_rollback.sql"));
    expect((await one(`select status from collectible_collections`)).status).toBe("ended");
    expect(await one(`select count(*)::int c from collectible_ownership`)).toEqual({ c: 1 });
  });
});
