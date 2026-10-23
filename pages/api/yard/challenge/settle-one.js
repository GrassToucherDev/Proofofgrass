// Settles ONE finished challenge from real proofs. Safe for anyone to trigger: the result is computed server-side
// from Submissions and the call is idempotent (a settled challenge is never recomputed).
import { adminClient } from "../../../../utils/requireOwner";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const slug = String(req.body?.slug || "");
  if (!slug || slug.length > 120) return res.status(400).json({ error: "Missing challenge." });
  const db = adminClient();
  const { data: ch } = await db.from("Challenges").select("id,status,ends_at").eq("slug", slug).maybeSingle();
  if (!ch) return res.status(404).json({ error: "Challenge not found." });
  if (ch.status !== "active" || !ch.ends_at || new Date(ch.ends_at) > new Date()) return res.status(200).json({ ok: true, settled: false });
  const { data, error } = await db.rpc("yard_settle_challenge", { p_id: ch.id });
  if (error) { console.error("[yard/settle-one]", error); return res.status(500).json({ error: "Could not settle." }); }
  return res.status(200).json({ ok: true, settled: !!data?.result, result: data?.result || null });
}
