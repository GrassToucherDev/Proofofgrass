import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = (f) => readFileSync(join(__dirname, "..", "supabase_migrations", f), "utf8");
// grove_day_counts comes straight from groves.sql so the test uses the real definition
const dayCounts = /create or replace function grove_day_counts[\s\S]*?\n\$\$;/.exec(sql("groves.sql"))[0];
const STUBS = `
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create table groves(id uuid primary key default gen_random_uuid(), name text, disbanded_at timestamptz);
create table grove_members(grove_id uuid, username text, joined_at timestamptz default now(), left_at timestamptz);
create table "Submissions"(username text, status text, created_at timestamptz);
`;
let db, seq = 0;
const one = async (q, p) => (await db.query(q, p)).rows[0];

// day offsets are days before today (UTC); `who` is the members who submitted that day
async function grove(n, days) {
  const g = (await one(`insert into groves(name) values ('G') returning id`)).id;
  const k = ++seq;
  const names = Array.from({ length: n }, (_, i) => `g${k}m${i + 1}`);
  for (const u of names) await db.query(`insert into grove_members(grove_id, username, joined_at) values ($1,$2, now() - interval '30 days')`, [g, u]);
  for (const [off, count] of Object.entries(days))
    for (const u of names.slice(0, count))
      await db.query(`insert into "Submissions" values ($1,'approved', (date_trunc('day', now() at time zone 'UTC') - ($2 || ' days')::interval) + interval '12 hours')`, [u, off]);
  return g;
}
const perfect = async (g) => (await one(`select grove_perfect($1) p`, [g])).p;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(dayCounts);
  await db.exec(sql("grove_perfect_days.sql"));
}, 60000);

describe("grove perfect days", { timeout: 60000 }, () => {
  it("counts only days when every member locked in", async () => {
    const g = await grove(3, { 1: 3, 2: 3, 3: 3, 4: 2, 5: 3 });   // day 4: only 2 of 3 -> not perfect
    const p = await perfect(g);
    expect(p.total).toBe(4);
    expect(p.current).toBe(3);       // days 1-3, ending yesterday (today has no posts yet)
    expect(p.best).toBe(3);
    expect(p.bracket).toBe("3-4");
    expect(p.tier).toBe(0);
  });

  it("a day with no submission from a member (e.g. a shield-covered day) is never perfect", async () => {
    const g = await grove(3, { 1: 3, 2: 2, 3: 3 });
    const p = await perfect(g);
    expect(p.total).toBe(2);
    expect(p.current).toBe(1);
  });

  it("fewer than 3 members never earns perfect days", async () => {
    const g = await grove(2, { 1: 2, 2: 2 });
    expect((await perfect(g)).total).toBe(0);
  });

  it("5-6 member groves use the lower targets", async () => {
    const g = await grove(6, { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 });
    const p = await perfect(g);
    expect(p.bracket).toBe("5-6");
    expect(p.targets).toEqual([5, 20, 60]);
    expect(p.tier).toBe(1);
    expect(p.next_target).toBe(20);
  });

  it("3-4 member groves need 7 for the first tier", async () => {
    const g = await grove(4, { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4 });
    const p = await perfect(g);
    expect(p.bracket).toBe("3-4");
    expect(p.tier).toBe(1);
  });

  it("today counts when everyone is in", async () => {
    const g = await grove(3, { 0: 3, 1: 3 });
    const p = await perfect(g);
    expect(p.today_perfect).toBe(true);
    expect(p.current).toBe(2);
  });

  it("the board lists groves that have perfect days, split by size in the data", async () => {
    await grove(3, { 1: 3, 2: 3 });
    await grove(6, { 1: 6 });
    await grove(3, { 1: 2 });   // none
    const b = (await one(`select grove_perfect_board(50) b`)).b;
    expect(b).toHaveLength(2);
    expect(b[0].perfect.total).toBe(2);
    expect(b.map((x) => x.perfect.bracket).sort()).toEqual(["3-4", "5-6"]);
  });
});
