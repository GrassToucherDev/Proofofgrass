// GET ?username=  ->  { best, spotlight }
// best = the highest streak this player has ever reached (max of best_streak / current_streak); it decides which tier rings
// unlock in the PFP tool. spotlight = true if they are an active Community Spotlight. Cosmetic only, nothing sensitive.
import { adminClient, cleanUsername } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, max-age=60");
  const u = cleanUsername(req.query.username);
  if (!u) return res.status(200).json({ best: 0, spotlight: false });
  try {
    const db = adminClient();
    const [{ data: st }, { data: sp }] = await Promise.all([
      db.from("Streaks").select("best_streak,current_streak").ilike("username", u).maybeSingle(),
      db.from("CommunitySpotlights").select("id").ilike("username", u).eq("status", "active").limit(1),
    ]);
    return res.status(200).json({ best: Math.max(st?.best_streak || 0, st?.current_streak || 0), spotlight: !!sp?.length });
  } catch {
    return res.status(200).json({ best: 0, spotlight: false });
  }
}
