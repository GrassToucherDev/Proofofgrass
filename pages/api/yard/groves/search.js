// GET ?q= — Groves a challenge can target: name prefix match, active, 3+ members. Public Grove data only.
import { adminClient } from "../../../../utils/requireOwner";
import { loadGroves } from "../../../../utils/yardGroves";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const q = String(req.query.q || "").trim().slice(0, 40);
  if (q.length < 2) return res.status(200).json({ groves: [] });
  const db = adminClient();
  const safe = q.replace(/[%_\\]/g, (c) => "\\" + c);
  const { data, error } = await db.from("groves").select("id").is("disbanded_at", null).ilike("name", `${safe}%`).limit(12);
  if (error) { console.error("[yard/groves/search]", error); return res.status(500).json({ error: "Search failed." }); }
  const info = await loadGroves(db, (data || []).map((g) => g.id));
  return res.status(200).json({ groves: Object.values(info).filter((g) => g.size >= 3).slice(0, 6) });
}
