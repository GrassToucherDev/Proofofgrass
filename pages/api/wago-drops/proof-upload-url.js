// POST { claimId } -> { path, token }  One-time signed upload link for the WAGO Drops proof photo of YOUR claim.
// Browsers can't write to the proof-photos bucket with the public key any more, so uploads go through here.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient } from "../../../utils/requireOwner";
import { PROOF_WINDOW_HOURS } from "../../../utils/wagoProofBonus";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id;
  if (!googleId) return res.status(401).json({ error: "Not authenticated" });
  const claimId = String(req.body?.claimId || "");
  if (!/^[0-9a-f-]{36}$/i.test(claimId)) return res.status(400).json({ error: "Invalid claim" });

  const db = adminClient();
  const { data: claim } = await db.from("wago_drop_claims").select("id, google_id, claimed_at").eq("id", claimId).maybeSingle();
  if (!claim || claim.google_id !== googleId) return res.status(403).json({ error: "Not your claim" });
  if (Date.now() > new Date(claim.claimed_at).getTime() + PROOF_WINDOW_HOURS * 3600 * 1000) {
    return res.status(400).json({ error: `The ${PROOF_WINDOW_HOURS}h Proof bonus window for this claim has closed.` });
  }
  const { data: existing } = await db.from("wago_drop_proofs").select("id").eq("claim_id", claimId).maybeSingle();
  if (existing) return res.status(400).json({ error: "A proof photo was already submitted for this claim." });

  const path = `wago-drops/${claimId}.jpg`;
  const { data, error } = await db.storage.from("proof-photos").createSignedUploadUrl(path, { upsert: true });
  if (error || !data?.token) { console.error("[wago proof-upload-url]", error?.message); return res.status(500).json({ error: "Could not start the upload." }); }
  return res.status(200).json({ path, token: data.token });
}
