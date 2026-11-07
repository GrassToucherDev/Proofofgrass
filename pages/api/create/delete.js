// POST { as, id } — delete one of your own creations (row, likes, reports and the image).
import { adminClient, requireOwner } from "../../../utils/requireOwner";
import { CREATIONS_BUCKET } from "../../../utils/createCommunity";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.as);
  if (!who) return;
  const id = String(req.body?.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Bad request." });
  const db = adminClient();
  const { data: c } = await db.from("community_creations").select("username,image_path").eq("id", id).maybeSingle();
  if (!c) return res.status(200).json({ ok: true });
  if (c.username !== who.username) return res.status(403).json({ error: "That isn't yours." });
  await db.storage.from(CREATIONS_BUCKET).remove([c.image_path]).catch(() => {});
  const { error } = await db.from("community_creations").delete().eq("id", id);
  if (error) return res.status(500).json({ error: "Could not delete that." });
  return res.status(200).json({ ok: true });
}
