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
let db, wheel, bigRare;
const one = async (q, p) => (await db.query(q, p)).rows[0];

async function spin(user = "alice") {
  const it = await one(`insert into wheel_intents(wheel_id,google_id,username,price_tokens,lock_amount,eco_amount,expires_at)
    values ($1,$2,$3,100,75,25, now()+interval '10 minutes') returning id`, [wheel, "g-" + user, user]);
  return (await one(`select wheel_spin_settle($1,$2,'wallet',100) r`, [it.id, "sig-" + it.id])).r;
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  for (const f of ["wheel_core.sql", "wheel_no_prize.sql", "fright_bits.sql", "wheel_meter_reset_on_rare.sql", "fright_bits_meter_guarantee.sql"]) await db.exec(sql(f));
  wheel = (await one(`insert into wheels(slug,name,status,visibility,featured,price_mode,price_usd,meter_enabled,meter_spins,meter_min_rarity)
     values ('test-wheel','Test Wheel','active','public',true,'usd',5,true,3,'rare') returning id`)).id;
  await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,weight,rarity,active) values ($1,'Nothing','nothing',1000,'common',true)`, [wheel]);
  bigRare = (await one(`insert into wheel_prizes(wheel_id,name,reward_type,weight,rarity,active) values ($1,'Big Rare','nothing',100000,'rare',false) returning id`, [wheel])).id;
  await db.query(`insert into wheel_prizes(wheel_id,name,reward_type,reward_config,weight,rarity,active) values ($1,'Base Pack','cosmetic_pack','{"item_id":"base"}',50,'common',true)`, [wheel]);
  await db.exec(sql("fright_bits_seed.sql"));
  await db.query(`select fright_bits_set_legal_gate('fright-bits', true)`);
  await db.query(`select fright_bits_start('fright-bits')`);
  await db.query(`update wheel_prizes set weight = 0.0001 where reward_type = 'collectible'`);   // monsters almost never come up naturally
}, 90000);

describe("Fright Bits meter guarantee", { timeout: 90000 }, () => {
  it("the guaranteed spin is a monster even when a much heavier Rare exists", async () => {
    await spin(); await spin();                         // meter 2
    await db.query(`update wheel_prizes set active = true where id = $1`, [bigRare]);
    const r = await spin();                             // 3rd spin: guaranteed
    expect(r.spin.meter_guaranteed).toBe(true);
    expect(r.spin.prize.reward_type).toBe("collectible");
  });

  it("after the event is paused the guarantee is the normal Rare or better", async () => {
    await db.query(`select fright_bits_pause('fright-bits')`);
    await spin(); await spin();
    await db.query(`update wheel_prizes set active = true where id = $1`, [bigRare]);
    const r = await spin();
    expect(r.spin.meter_guaranteed).toBe(true);
    expect(r.spin.prize.name).toBe("Big Rare");
  });

  it("a monster win resets the meter", async () => {
    await spin(); await spin();
    await spin();
    expect((await one(`select count from wheel_meters where google_id='g-alice'`)).count).toBe(0);
  });
});
