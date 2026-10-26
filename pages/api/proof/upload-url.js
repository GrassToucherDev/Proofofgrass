// POST { username } -> { path, token }  A one-time signed link for uploading TODAY's proof photo for this username.
// Browsers can no longer write to the proof-photo folders with the public key, so nobody can overwrite or pre-claim
// another person's photo slot unless they're allowed to log proofs for that username.
import { adminClient, cleanUsername } from "../../../utils/requireOwner";
import { authorizeProofActor, BUCKET, proofPath, todayUTC } from "../../../utils/proofAccess";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const username = cleanUsername(req.body?.username);
  if (!/^[\w.\-]{1,64}$/.test(username)) return res.status(400).json({ error: "Invalid username.", code: "bad_username" });
  const db = adminClient();
  const who = await authorizeProofActor(req, res, db, username);
  if (!who) return;

  // Once today's proof is logged the photo is final.
  const { data: st } = await db.from("Streaks").select("last_submission_date").ilike("username", username).maybeSingle();
  if (st?.last_submission_date && String(st.last_submission_date).slice(0, 10) >= todayUTC()) {
    return res.status(409).json({ error: "Today's proof is already logged.", code: "already_logged" });
  }

  const path = proofPath(username);
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (error || !data?.token) { console.error("[proof/upload-url]", error?.message); return res.status(500).json({ error: "Could not start the upload.", code: "upload_url_failed" }); }
  return res.status(200).json({ path, token: data.token });
}
