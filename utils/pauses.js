// Server only. Account pauses (table account_pauses). A paused account can't upload or log a proof, and its proofs
// are left out of the community gallery and Grove feeds. If the table doesn't exist yet, nothing is paused.
import { cleanUsername } from "./requireOwner";

export const DEFAULT_PAUSE_MESSAGE =
  "Your account is paused while we review recent posts. Proofs need to be real outdoor photos taken today. Message the Touch Grass team on X if you think this is a mistake.";

export const pauseIsActive = (r) => !!r && !r.resumed_at && (!r.paused_until || new Date(r.paused_until) > new Date());

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
