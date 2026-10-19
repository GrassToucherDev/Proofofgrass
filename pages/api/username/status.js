// GET ?username= — { claimed, mine }. Never exposes who owns it.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const username = cleanUsername(req.query.username);
  if (!username) return res.status(400).json({ error: "Missing username." });
  const session = await getServerSession(req, res, authOptions);
  const gid = session?.user?.google_id || null;
  const { data } = await adminClient().from("username_claims").select("google_id").eq("username", username).maybeSingle();
  return res.status(200).json({ claimed: !!data, mine: !!(data && gid && data.google_id === gid), signedIn: !!gid });
}
