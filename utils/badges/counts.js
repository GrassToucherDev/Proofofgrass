// utils/badges/counts.js — server side: the numbers behind each badge line for one username. A failed lookup counts as 0.
export async function computeBadgeCounts(db, rawName) {
  const orig = String(rawName || "").replace(/^@/, "").trim();
  const low = orig.toLowerCase();
  const names = Array.from(new Set([orig, low]));
  const safe = async (fn) => { try { return (await fn()) || 0; } catch { return 0; } };
  const head = (q) => q.then(r => (r.error ? 0 : r.count || 0));

  const [streakRow, profileRow, proofs, spins, lucky, groveMember, groveFounder, drawEntries, drawWins, owned, chal] = await Promise.all([
    safe(async () => (await db.from("Streaks").select("best_streak,current_streak,shield_count").in("username", names).limit(1)).data?.[0]),
    safe(async () => (await db.from("Profiles").select("grass_score,referral_count_successful").in("username", names).limit(1)).data?.[0]),
    safe(() => head(db.from("Submissions").select("id", { count: "exact", head: true }).in("username", names).in("status", ["pending", "approved"]))),
    safe(() => head(db.from("wheel_spins").select("id", { count: "exact", head: true }).eq("username", low))),
    safe(() => head(db.from("wheel_spins").select("id", { count: "exact", head: true }).eq("username", low).in("rarity", ["rare", "epic", "legendary"]))),
    safe(async () => { const r = await db.from("grove_members").select("grove_id").eq("username", low); return new Set((r.data || []).map(x => x.grove_id)).size; }),
    safe(() => head(db.from("groves").select("id", { count: "exact", head: true }).in("created_by", names))),
    safe(async () => { const r = await db.from("grass_draw_entries").select("cycle_id").in("username", names); return new Set((r.data || []).map(x => x.cycle_id)).size; }),
    safe(async () => { const r = await db.from("grass_draw_winners").select("cycle_id,voided").in("username", names); return new Set((r.data || []).filter(x => !x.voided).map(x => x.cycle_id)).size; }),
    safe(() => head(db.from("UserInventory").select("item_id", { count: "exact", head: true }).in("username", names).eq("owned", true))),
    safe(async () => { const r = await db.from("Challenges").select("status").or(`challenger.in.(${names.join(",")}),challenged.in.(${names.join(",")})`).limit(500); return (r.data || []).filter(c => c.status === "completed").length; }),
  ]);

  const sr = streakRow || {};
  const pr = profileRow || {};
  return {
    "streak": Math.max(sr.best_streak || 0, sr.current_streak || 0),
    "proofs": proofs,
    "grass-score": pr.grass_score || 0,
    "shield": sr.shield_count || 0,
    "challenger": chal,
    "grove-member": groveMember,
    "grove-founder": groveFounder,
    "wheel-spinner": spins,
    "lucky-pull": lucky,
    "draw-entrant": drawEntries,
    "draw-winner": drawWins,
    "collector": owned,
    "recruiter": pr.referral_count_successful || 0,
  };
}
