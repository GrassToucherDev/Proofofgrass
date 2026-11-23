// GET /api/x/start?username=  — begins linking an X account. Needs the signed-in Google account that secured `username`.
// This is a browser navigation (a link), so problems redirect home with ?x_link=<reason> instead of returning JSON.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";
import { xConfig, makePkce, authorizeUrl, seal, cookieHeader } from "../../../utils/xLink";

const hits = new Map(); // ip -> { n, t } small throttle so this can't be used to hammer X
const go = (res, why) => { res.setHeader("Cache-Control", "no-store"); res.redirect(302, `/?x_link=${why}`); };

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const cfg = xConfig();
  if (!cfg.ok || !(process.env.NEXTAUTH_SECRET || "").trim()) return go(res, "unavailable");
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown", h = hits.get(ip);
  if (h && Date.now() - h.t < 600000 && h.n >= 20) return go(res, "slow_down");
  hits.set(ip, h && Date.now() - h.t < 600000 ? { n: h.n + 1, t: h.t } : { n: 1, t: Date.now() });

  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id;
  if (!googleId) return go(res, "signin");
  const username = cleanUsername(req.query.username);
  if (!username) return go(res, "not_owner");
  const { data: claim } = await adminClient().from("username_claims").select("google_id").eq("username", username).maybeSingle();
  if (!claim || claim.google_id !== googleId) return go(res, "not_owner");

  const pk = makePkce();
  res.setHeader("Set-Cookie", cookieHeader(seal({ u: username, g: googleId, s: pk.state, v: pk.verifier }), 600));
  res.setHeader("Cache-Control", "no-store");
  return res.redirect(302, authorizeUrl(cfg, pk));
}
