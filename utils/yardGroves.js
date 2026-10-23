// Server helpers for Grove vs Grove. Everything here reads public Grove data and server-computed scores.
export const WEEK_MS = 7 * 864e5;
export const target = (size) => Math.ceil((size * 2) / 3);   // members who must post for the Grove to hit its daily target

// id -> { id, name, owner, size, banner:{id,art_path}|null }. `rosterSizes` overrides live counts (frozen rosters).
export async function loadGroves(db, ids, rosterSizes = {}) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return {};
  const [{ data: gs }, { data: mem }] = await Promise.all([
    db.from("groves").select("id, name, owner_username, active_banner_id").in("id", uniq),
    db.from("grove_members").select("grove_id").in("grove_id", uniq).is("left_at", null),
  ]);
  const counts = {};
  (mem || []).forEach((m) => { counts[m.grove_id] = (counts[m.grove_id] || 0) + 1; });
  const bids = [...new Set((gs || []).map((g) => g.active_banner_id).filter(Boolean))];
  let banners = {};
  if (bids.length) {
    const { data: bs } = await db.from("grove_banners").select("id, art_path").in("id", bids);
    banners = Object.fromEntries((bs || []).map((b) => [b.id, { id: b.id, art_path: b.art_path }]));
  }
  return Object.fromEntries((gs || []).map((g) => [g.id, {
    id: g.id, name: g.name, owner: String(g.owner_username || "").toLowerCase(),
    size: counts[g.id] || 0, banner: banners[g.active_banner_id] || null,
  }]));
}

// Turns raw grove_challenges rows into what the UI shows, from `myGrove`'s point of view.
// Active rows get a live score; active rows already past their end get settled first (idempotent).
export async function shapeGroveChallenges(db, rows, myGroveId) {
  const due = rows.filter((c) => c.status === "active" && c.ends_at && new Date(c.ends_at) <= new Date()).slice(0, 20);
  if (due.length) {
    await Promise.all(due.map((c) => db.rpc("yard_grove_settle", { p_id: c.id })));
    const { data: again } = await db.from("grove_challenges").select("*").in("id", rows.map((c) => c.id));
    if (again) { const m = Object.fromEntries(again.map((r) => [r.id, r])); rows = rows.map((r) => m[r.id] || r); }
  }
  const groves = await loadGroves(db, rows.flatMap((c) => [c.challenger_grove, c.challenged_grove]));
  const out = [];
  for (const c of rows) {
    const a = groves[c.challenger_grove], b = groves[c.challenged_grove];
    if (!a || !b) continue;
    const sizeA = c.roster_challenger?.length || a.size, sizeB = c.roster_challenged?.length || b.size;
    const o = {
      id: c.id, slug: c.slug, status: c.status, duration_days: c.duration_days, message: c.message,
      created_at: c.created_at, started_at: c.started_at, ends_at: c.ends_at, result: c.result, settled_at: c.settled_at,
      challenger: { ...a, size: sizeA, daily_target: target(sizeA), days: c.days_challenger, posts: c.posts_challenger },
      challenged: { ...b, size: sizeB, daily_target: target(sizeB), days: c.days_challenged, posts: c.posts_challenged },
      winner_grove: c.winner_grove,
      you_challenged: c.challenger_grove === myGroveId,
    };
    if (c.status === "active") {
      const { data: live } = await db.rpc("yard_grove_result", { p_id: c.id });
      if (live) {
        o.challenger.days = live.days_challenger; o.challenger.posts = live.posts_challenger;
        o.challenged.days = live.days_challenged; o.challenged.posts = live.posts_challenged;
        o.leader = live.result === "won" ? live.winner_grove : null;   // provisional
      }
    }
    out.push(o);
  }
  return out;
}
