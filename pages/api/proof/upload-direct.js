// POST { username, image: <base64 jpeg/png/webp> } -> { ok, path }
// Last-resort path for people whose phone/network can't reach Supabase storage directly: the server stores the
// (already shrunk) photo instead. Same authorization and "today's proof is final" rule as /api/proof/upload-url.
import { adminClient, cleanUsername } from "../../../utils/requireOwner";
import { authorizeProofActor, BUCKET, proofPath, todayUTC, isSafeProofUsername } from "../../../utils/proofAccess";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const username = cleanUsername(req.body?.username);
  if (!isSafeProofUsername(username)) return res.status(400).json({ error: "Invalid username.", code: "bad_username" });
  const db = adminClient();
  const who = await authorizeProofActor(req, res, db, username);
  if (!who) return;

  const { data: st } = await db.from("Streaks").select("last_submission_date").ilike("username", username).maybeSingle();
  if (st?.last_submission_date && String(st.last_submission_date).slice(0, 10) >= todayUTC()) {
    return res.status(409).json({ error: "Today's proof is already logged.", code: "already_logged" });
  }

  const raw = String(req.body?.image || "").replace(/^data:[^,]*,/, "");
  const buf = Buffer.from(raw, "base64");
  if (buf.length < 1000 || buf.length > 3_200_000) return res.status(400).json({ error: "Photo is missing or too large.", code: "bad_image" });
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8, isPng = buf[0] === 0x89 && buf[1] === 0x50, isWebp = buf.slice(8, 12).toString() === "WEBP";
  if (!isJpg && !isPng && !isWebp) return res.status(400).json({ error: "Unsupported photo format.", code: "bad_image" });

  const path = proofPath(username);
  const { error } = await db.storage.from(BUCKET).upload(path, buf, { upsert: true, contentType: isJpg ? "image/jpeg" : isPng ? "image/png" : "image/webp" });
  if (error) { console.error("[proof/upload-direct]", error.message); return res.status(500).json({ error: "Could not save the photo.", code: "upload_failed" }); }
  return res.status(200).json({ ok: true, path });
}
