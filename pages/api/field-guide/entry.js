// POST { username, collection_slug, slot_number, photo_url, storage_path, label, ai_confidence, exp, proof }
// Saves an approved Field Guide entry, but only one that /api/field-guide/classify just signed for this user.
import { adminClient, cleanUsername } from "../../../utils/requireOwner";
import { verifyApproval } from "../../../utils/fieldGuideProof";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body || {};
  const username = cleanUsername(b.username);
  const slot = Number(b.slot_number);
  if (!username || !b.collection_slug || !Number.isInteger(slot) || slot < 0 || slot > 200) return res.status(400).json({ error: "Invalid entry." });
  const label = String(b.label ?? "").slice(0, 120);
  const confidence = b.ai_confidence == null ? "" : String(b.ai_confidence);
  if (!verifyApproval({ username, collectionSlug: b.collection_slug, label, confidence, exp: b.exp, proof: b.proof })) {
    return res.status(403).json({ error: "This photo wasn't verified. Please try again." });
  }
  const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  if (b.photo_url && !String(b.photo_url).startsWith(base)) return res.status(400).json({ error: "Invalid photo." });

  const db = adminClient();
  const { data, error } = await db.from("FieldGuideEntries").insert([{
    username, collection_slug: b.collection_slug, slot_number: slot, photo_url: b.photo_url || null,
    storage_path: String(b.storage_path ?? "").slice(0, 300), label: label || "outdoor nature photo",
    ai_label: label || "outdoor nature photo", ai_confidence: confidence || null, status: "approved", submitted_at: new Date().toISOString(),
  }]).select("id").single();
  if (error) return res.status(error.code === "23505" ? 409 : 500).json({ error: error.code === "23505" ? "This slot is already filled." : "Failed to save entry.", code: error.code });
  return res.status(200).json({ ok: true, id: data.id });
}
