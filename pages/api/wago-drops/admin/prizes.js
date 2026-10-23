// Admin: list / create / update prizes and generate single-use codes.
import { createClient } from "@supabase/supabase-js";
import { hashCode, makeCode, prizeCounts } from "../../../../utils/prizes";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const isAdmin = (req) => { const s = req.headers["x-wago-admin-secret"]; return !!s && s === process.env.WAGO_ADMIN_SECRET; };
const str = (v, n) => (v == null || String(v).trim() === "" ? null : String(v).trim().slice(0, n));

async function addCodes(prizeId, n) {
  const codes = [];
  for (let attempt = 0; codes.length < n && attempt < 5; attempt++) {
    const batch = Array.from({ length: n - codes.length }, makeCode);
    const rows = batch.map(c => ({ prize_id: prizeId, code_hash: hashCode(prizeId, c) }));
    const { data } = await supabase.from("wago_prize_codes").upsert(rows, { onConflict: "prize_id,code_hash", ignoreDuplicates: true }).select("code_hash");
    const ok = new Set((data || []).map(r => r.code_hash));
    batch.forEach((c, i) => { if (ok.has(rows[i].code_hash)) codes.push(c); });
  }
  return codes;
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const { data, error } = await supabase.from("wago_prizes").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const counts = await prizeCounts(supabase, data.map(p => p.id));
    return res.status(200).json({ prizes: data.map(p => ({ ...p, ...(counts[p.id] || { total: 0, remaining: 0 }) })) });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const lat = Number(b.lat), lng = Number(b.lng), qty = Math.min(Math.max(parseInt(b.quantity) || 1, 1), 200);
    if (!str(b.title, 120) || !str(b.sponsor_name, 80)) return res.status(400).json({ error: "Title and sponsor name are required." });
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ error: "Valid latitude and longitude are required." });
    const { data: p, error } = await supabase.from("wago_prizes").insert({
      kind: "found", title: str(b.title, 120), description: str(b.description, 600), image_url: str(b.image_url, 500),
      value_text: str(b.value_text, 120), sponsor_name: str(b.sponsor_name, 80), sponsor_url: str(b.sponsor_url, 300),
      sponsor_logo_url: str(b.sponsor_logo_url, 500), lat, lng, hint: str(b.hint, 200),
      reveal_radius_m: Number(b.reveal_radius_m) || 100, claim_radius_m: Number(b.claim_radius_m) || 25,
      ends_at: b.ends_at || null, status: b.status === "active" ? "active" : "draft",
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    const codes = await addCodes(p.id, qty);
    return res.status(201).json({ prize: p, codes });
  }

  if (req.method === "PATCH") {
    const { id, status, addCodes: more } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    if (status) {
      if (!["draft", "active", "ended"].includes(status)) return res.status(400).json({ error: "bad status" });
      const { error } = await supabase.from("wago_prizes").update({ status }).eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
    }
    const codes = more ? await addCodes(id, Math.min(Math.max(parseInt(more) || 0, 0), 200)) : [];
    return res.status(200).json({ ok: true, codes });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
