// Server only. Account pauses (table account_pauses). A paused account can't upload or log a proof, its proofs are left
// out of the community gallery and Grove feeds, its streak is frozen (kept alive) if it was alive when paused, and it is
// left out of any Grass Draw whose month overlaps the pause. If the table doesn't exist yet, nothing is paused.
import { cleanUsername } from "./requireOwner";

export const DEFAULT_PAUSE_MESSAGE =
  "Your account is paused while we review recent posts. Proofs need to be real outdoor photos taken today. Message the Touch Grass team on X if you think this is a mistake.";

export const pauseIsActive = (r) => !!r && !r.resumed_at && (!r.paused_until || new Date(r.paused_until) > new Date());
const dayUTC = (offset = 0) => new Date(Date.now() + offset * 86400_000).toISOString().slice(0, 10);

export async function getActivePause(db, username) {
  const { data, error } = await db.from("account_pauses").select("*").eq("username", cleanUsername(username)).maybeSingle();
  if (error) return null;
  return pauseIsActive(data) ? data : null;
}

export async function getPausedSet(db, names) {
  const set = new Set();
  const list = [...new Set((names || []).map(cleanUsername))].filter(Boolean);
  if (!list.length) return set;
  const { data, error } = await db.from("account_pauses").select("*").in("username", list);
  if (error) return set;
  (data || []).forEach((r) => { if (pauseIsActive(r)) set.add(r.username); });
  return set;
}

// Streak freeze. The streak is worked out from Streaks.last_submission_date, so freezing = keeping that date at
// "yesterday" (UTC) every day of the pause. Only done when the streak was alive at the moment of the pause.
export async function freezeEligible(db, username) {
  const { data } = await db.from("Streaks").select("current_streak,last_submission_date").ilike("username", cleanUsername(username)).maybeSingle();
  const last = data?.last_submission_date ? String(data.last_submission_date).slice(0, 10) : null;
  return !!last && last >= dayUTC(-1) && (data?.current_streak || 0) > 0;
}
async function bumpLastDate(db, username) {
  const { data } = await db.from("Streaks").select("last_submission_date").ilike("username", cleanUsername(username)).maybeSingle();
  const last = data?.last_submission_date ? String(data.last_submission_date).slice(0, 10) : null;
  if (!last || last >= dayUTC(-1)) return false;
  const { error } = await db.from("Streaks").update({ last_submission_date: dayUTC(-1) }).ilike("username", cleanUsername(username));
  return !error;
}
// End a pause (you resumed, or its days ran out). A frozen streak is left alive for today, so the next proof continues it.
export async function thawPause(db, row, endedAt = new Date().toISOString()) {
  if (row?.frozen) await bumpLastDate(db, row.username);
  await db.from("account_pauses").update({ resumed_at: endedAt }).eq("username", row.username);
}
// Used on the proof routes: an expired timed pause is closed (and the streak thawed) before the player is let through.
export async function resolvePause(db, username) {
  const { data, error } = await db.from("account_pauses").select("*").eq("username", cleanUsername(username)).maybeSingle();
  if (error || !data || data.resumed_at) return null;
  if (data.paused_until && new Date(data.paused_until) <= new Date()) { await thawPause(db, data, data.paused_until); return null; }
  return data;
}
// Daily: keep every frozen streak alive, and close pauses whose days have run out.
export async function tickFrozenPauses(db) {
  const { data, error } = await db.from("account_pauses").select("*").is("resumed_at", null);
  if (error) return { frozen: 0, ended: 0, skipped: true };
  let frozen = 0, ended = 0;
  for (const r of data || []) {
    if (r.paused_until && new Date(r.paused_until) <= new Date()) { await thawPause(db, r, r.paused_until); ended++; continue; }
    if (r.frozen && (await bumpLastDate(db, r.username))) frozen++;
  }
  return { frozen, ended };
}
// Usernames paused at any time during [startIso, endIso] (a draw month). Used to leave them out of that month's draw.
export async function getPausedDuring(db, startIso, endIso) {
  const set = new Set();
  const { data, error } = await db.from("account_pauses").select("*").lte("paused_at", endIso);
  if (error) return set;
  const start = new Date(startIso).getTime();
  (data || []).forEach((r) => {
    const ends = [r.resumed_at, r.paused_until].filter(Boolean).map((t) => new Date(t).getTime());
    const last = ends.length ? Math.min(...ends) : Infinity;
    if (last >= start) set.add(String(r.username).toLowerCase());
  });
  return set;
}
