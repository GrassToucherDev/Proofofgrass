// GET ?username= — who nudged me today (only while I haven't logged). Used by the home page banner. Quiet (empty) on any problem.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  const empty = () => res.status(200).json({ from: [] });
  try {
    const session = await getServerSession(req, res, authOptions);
    const gid = session?.user?.google_id, username = cleanUsername(req.query.username);
    if (!gid || !username) return empty();
    const db = adminClient();
    const { data: claim } = await db.from("username_claims").select("google_id").eq("username", username).maybeSingle();
    if (!claim || claim.google_id !== gid) return empty();
    const today = new Date().toISOString().slice(0, 10);
    const { data: done } = await db.from("Submissions").select("id").eq("username", username).in("status", ["pending", "approved"]).gte("created_at", today + "T00:00:00Z").limit(1);
    if (done?.length) return empty();
    const { data } = await db.from("grove_nudges").select("from_user").eq("to_user", username).eq("day", today);
    return res.status(200).json({ from: [...new Set((data || []).map((n) => n.from_user))] });
  } catch (e) { return empty(); }
}
