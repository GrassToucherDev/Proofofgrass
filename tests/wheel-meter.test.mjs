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
let db, wheel, common, rare;
const one = async (q, p) => (await db.query(q, p)).rows[0];
const meter = async () => (await one(`select count from wheel_meters where google_id='g-a'`))?.count ?? 0;
const spin = async () => (await one(`select wheel_free_spin('g-a','alice') r`)).r;
const only = async (id) => db.query(`update wheel_prizes set active = (id = $1) where wheel_id = $2`, [id, wheel]);

beforeEach(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  for (const f of ["wheel_core.sql", "wheel_no_prize.sql", "fright_bits.sql", "wheel_free_spins.sql", "wheel_meter_reset_on_rare.sql"]) await db.exec(sql(f));
  wheel = (await one(`insert into wheels(slug,name,status,visibility,featured,price_mode,price_usd,meter_enabled,meter_spins,meter_min_rarity) values ('test-wheel','Test Wheel','active','public',true,'usd',5,true,3,'rare') returning id`)).id;
  common = (await one(`insert into wheel_prizes(wheel_id,name,reward_type,weight,rarity,active) values ($1,'Nothing','nothing',100,'common',true) returning id`, [wheel])).id;
  rare = (await one(`insert into wheel_prizes(wheel_id,name,reward_type,weight,rarity,active) values ($1,'Big','nothing',100,'rare',true) returning id`, [wheel])).id;
  await db.exec(`insert into username_claims values ('alice','g-a')`);
  await db.exec(`select wheel_free_spin_grant(array['alice'], 20, now() + interval '5 days', 'b', 't', 'admin')`);
}, 60000);

describe("meter reset on rare", { timeout: 60000 }, () => {
  it("a lucky Rare resets the meter", async () => {
    await only(common);
    await spin();
    expect(await meter()).toBe(1);
    await only(rare);                       // a normal (not guaranteed) Rare
    const r = await spin();
    expect(r.spin.meter_guaranteed).toBe(false);
    expect(await meter()).toBe(0);          // reset by the Rare
  });

  it("the Nth spin since the last Rare is guaranteed, then resets", async () => {
    await db.query(`update wheel_prizes set weight = 1 where id = $1`, [rare]);   // rare is very unlikely, common is not
    await db.query(`update wheel_prizes set weight = 100000 where id = $1`, [common]);
    // force the first two spins to be commons, then let the 3rd be guaranteed
    await only(common); await spin(); await spin();
    await db.query(`update wheel_prizes set active = true`);
    const r = await spin();
    expect(r.spin.meter_guaranteed).toBe(true);
    expect(r.spin.rarity).toBe("rare");
    expect(await meter()).toBe(0);
  });

  it("a common leaves the count growing", async () => {
    await only(common);
    await spin();
    expect(await meter()).toBe(1);
  });
});
