// POST { username } — binds the signed-in Google account to a username (one each).
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id;
  if (!googleId) return res.status(401).json({ error: "Sign in with Google first.", code: "not_signed_in" });

  const username = cleanUsername(req.body?.username);
  if (!username || username.length > 64) return res.status(400).json({ error: "Invalid username." });

  const db = adminClient();
  // The username must already exist on the platform (has posted).
  const { data: known } = await db.from("Streaks").select("username").ilike("username", username).limit(1);
  if (!known?.length) return res.status(400).json({ error: "Post a proof first, then secure your username." });

  const { data: mine } = await db.from("username_claims").select("username").eq("google_id", googleId).maybeSingle();
  if (mine) {
    return mine.username === username
      ? res.status(200).json({ ok: true, username, already: true })
      : res.status(409).json({ error: `Your Google account already secures @${mine.username}.`, code: "account_has_claim" });
  }
  const { error } = await db.from("username_claims").insert([{ username, google_id: googleId }]);
  if (error) {
    if (error.code === "23505") return res.status(409).json({ error: "That username is already secured by another account.", code: "taken" });
    console.error("[username/claim]", error);
    return res.status(500).json({ error: "Could not secure username." });
  }
  return res.status(200).json({ ok: true, username });
}
