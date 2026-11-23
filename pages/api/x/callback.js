// GET /api/x/callback — X sends the person back here. Verifies the flow is the one we started (encrypted cookie + state),
// that the same Google account is still signed in and still owns the username, asks X who they are, and saves the link.
// The X access token is used once and discarded; nothing about X is stored except the id, @handle and display name.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient } from "../../../utils/requireOwner";
import { xConfig, open, readCookie, cookieHeader, sameText, exchangeCode, fetchMe, X_COOKIE } from "../../../utils/xLink";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", cookieHeader("", 0)); // one use only
  const go = (why) => res.redirect(302, `/?x_link=${why}`);
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const cfg = xConfig();
  if (!cfg.ok) return go("unavailable");
  if (req.query.error) return go("denied");

  const flow = open(readCookie(req, X_COOKIE));
  if (!flow || !req.query.state || !sameText(req.query.state, flow.s) || !req.query.code) return go("expired");

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id || session.user.google_id !== flow.g) return go("signin");
  const db = adminClient();
  const { data: claim } = await db.from("username_claims").select("google_id").eq("username", flow.u).maybeSingle();
  if (!claim || claim.google_id !== flow.g) return go("not_owner");

  let me;
  try { me = await fetchMe(await exchangeCode(cfg, { code: String(req.query.code), verifier: flow.v })); }
  catch (e) { console.error("[x/callback] X lookup failed:", e?.message, e?.status || ""); return go("x_failed"); }

  const now = new Date().toISOString();
  const { error } = await db.from("x_links").upsert({ username: flow.u, x_user_id: me.id, x_username: me.username, x_name: me.name || null, refreshed_at: now }, { onConflict: "username" });
  if (error) {
    if (error.code === "23505") return go("x_taken"); // that X account is already linked to another username
    console.error("[x/callback] save failed:", error.code);
    return go("failed");
  }
  return go("ok");
}
