// GET ?username= — wallet state for a profile. Public callers only learn whether a verified wallet is linked;
// the address itself is returned only to the Google account that owns the username.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const username = cleanUsername(req.query.username);
  if (!username || username.length > 40 || /[^a-z0-9 _.\-]/.test(username)) return res.status(400).json({ error: "Bad username." });
  const db = adminClient();
  const { data: p } = await db.from("Profiles").select("wallet_address, wallet_verified").ilike("username", username).maybeSingle();
  const linked = !!(p?.wallet_verified && p?.wallet_address);
  const session = await getServerSession(req, res, authOptions);
  const gid = session?.user?.google_id || null;
  let mine = false;
  if (gid) {
    const { data: c } = await db.from("username_claims").select("google_id").eq("username", username).maybeSingle();
    mine = !!(c && c.google_id === gid);
  }
  return res.status(200).json({
    linked,
    verified: !!p?.wallet_verified,
    address: mine ? (p?.wallet_address ?? null) : null,
  });
}
