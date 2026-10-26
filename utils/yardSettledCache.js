// Server only. The Yard boards read every settled challenge. Cache that list for a minute per server instance so
// varying ?username= (which skips the CDN cache) can't make each request re-read the whole table.
const TTL = 60_000;
const memo = {};
async function cached(key, load) {
  const hit = memo[key];
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const v = await load();
  if (!v.error) memo[key] = { t: Date.now(), v };
  return v;
}
export const settled1v1 = (db) => cached("1v1", () =>
  db.from("Challenges").select("challenger, challenged, winner, result").not("result", "is", null).limit(20000));
export const settledGroves = (db) => cached("groves", () =>
  db.from("grove_challenges").select("challenger_grove, challenged_grove, winner_grove, result").not("result", "is", null).limit(5000));
