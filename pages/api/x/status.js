// GET ?username= — { enabled, linked, mine, handle }. The @handle is only revealed to the signed-in owner of the username.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";
import { xConfig, X_LINK_BONUS } from "../../../utils/xLink";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const username = cleanUsername(req.query.username);
  if (!username) return res.status(400).json({ error: "Missing username." });
  const enabled = xConfig().ok;
  const session = await getServerSession(req, res, authOptions);
  const gid = session?.user?.google_id || null;
  const db = adminClient();
  const [{ data: claim }, { data: link }] = await Promise.all([
    db.from("username_claims").select("google_id").eq("username", username).maybeSingle(),
    db.from("x_links").select("x_username").eq("username", username).maybeSingle(),
  ]);
  const mine = !!(claim && gid && claim.google_id === gid);
  let bonus = 0;
  if (mine) { try { const { data } = await db.rpc("x_link_bonus_available", { p_username: username }); if (data === true) bonus = X_LINK_BONUS; } catch {} }
  return res.status(200).json({ enabled, linked: !!link, mine, handle: mine && link ? link.x_username : null, bonus });
}
