// Server-side ownership check for value-moving routes.
// Usage: const who = await requireOwner(req, res, username); if (!who) return;
// Returns { username, googleId } when the signed-in Google account has claimed `username`.
// On failure it sends the response itself (401 not signed in, 403 not the owner / unclaimed).
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "../pages/api/auth/[...nextauth]";

export const cleanUsername = (v) => String(v ?? "").replace(/@/g, "").toLowerCase().trim();

export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function requireOwner(req, res, rawUsername) {
  const username = cleanUsername(rawUsername);
  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id;
  if (!googleId) { res.status(401).json({ error: "Sign in with Google to continue.", code: "not_signed_in" }); return null; }
  if (!username) { res.status(400).json({ error: "Missing username." }); return null; }
  const { data, error } = await adminClient().from("username_claims").select("google_id").eq("username", username).maybeSingle();
  if (error) { res.status(500).json({ error: "Could not verify ownership." }); return null; }
  if (!data) { res.status(403).json({ error: "Secure this username first.", code: "unclaimed" }); return null; }
  if (data.google_id !== googleId) { res.status(403).json({ error: "This username belongs to another account.", code: "not_owner" }); return null; }
  return { username, googleId };
}
