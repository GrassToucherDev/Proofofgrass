// GET ?code= — public preview of an invite (grove name + spots left). No member names.
import { adminClient } from "../../../utils/requireOwner";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const code = String(req.query.code || "").trim().toLowerCase();
  if (!/^[a-f0-9]{10}$/.test(code)) return res.status(200).json({ valid: false });
  const db = adminClient();
  const { data: inv } = await db.from("grove_invites").select("grove_id,expires_at").eq("code", code).maybeSingle();
  if (!inv || new Date(inv.expires_at) < new Date()) return res.status(200).json({ valid: false });
  const { data: g } = await db.from("groves").select("name,slots,disbanded_at").eq("id", inv.grove_id).maybeSingle();
  if (!g || g.disbanded_at) return res.status(200).json({ valid: false });
  const { count } = await db.from("grove_members").select("id", { count: "exact", head: true }).eq("grove_id", inv.grove_id).is("left_at", null);
  return res.status(200).json({ valid: true, name: g.name, members: count || 0, slots: g.slots, full: (count || 0) >= g.slots });
}
