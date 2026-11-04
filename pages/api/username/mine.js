// GET — the username secured by the signed-in Google account, if any.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");
  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id;
  if (!googleId) return res.status(200).json({ signedIn: false, username: null });
  const { data } = await adminClient().from("username_claims").select("username").eq("google_id", googleId).maybeSingle();
  return res.status(200).json({ signedIn: true, username: data?.username || null });
}
