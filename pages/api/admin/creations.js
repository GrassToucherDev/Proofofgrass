// Admin for Community Creations (x-admin-secret).
// GET: newest 60 creations with like and report counts. POST { action: "hide"|"unhide"|"delete", id }.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/requireOwner";
import { CREATIONS_BUCKET } from "../../../utils/createCommunity";

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  if (req.method === "GET") {
    const { data, error } = await db.from("community_creations").select("*").order("created_at", { ascending: false }).limit(60);
    if (error) return res.status(200).json({ items: [], needsSql: /does not exist|schema cache/i.test(error.message), error: error.message });
    const ids = (data || []).map((r) => r.id);
    const [lk, rp] = await Promise.all([
      ids.length ? db.from("community_creation_likes").select("creation_id").in("creation_id", ids) : { data: [] },
      ids.length ? db.from("community_creation_reports").select("creation_id").in("creation_id", ids) : { data: [] },
    ]);
    const n = (arr) => (arr.data || []).reduce((m, r) => ((m[r.creation_id] = (m[r.creation_id] || 0) + 1), m), {});
    const likes = n(lk), reports = n(rp);
    return res.status(200).json({ items: (data || []).map((r) => ({ ...r, url: db.storage.from(CREATIONS_BUCKET).getPublicUrl(r.image_path).data.publicUrl, likes: likes[r.id] || 0, reports: reports[r.id] || 0 })) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { action } = req.body || {}, id = String(req.body?.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Bad id" });
  if (action === "hide" || action === "unhide") {
    const { error } = await db.from("community_creations").update({ hidden: action === "hide" }).eq("id", id);
    return error ? res.status(500).json({ error: error.message }) : res.status(200).json({ ok: true });
  }
  if (action === "delete") {
    const { data: c } = await db.from("community_creations").select("image_path").eq("id", id).maybeSingle();
    if (c) await db.storage.from(CREATIONS_BUCKET).remove([c.image_path]).catch(() => {});
    const { error } = await db.from("community_creations").delete().eq("id", id);
    return error ? res.status(500).json({ error: error.message }) : res.status(200).json({ ok: true });
  }
  return res.status(400).json({ error: "Unknown action" });
}
