// Admin: list / create / update prizes and generate single-use codes.
import { wagoSecretOk } from "../../../../utils/wagoAdminAuth";
import { createClient } from "@supabase/supabase-js";
import { hashCode, makeCode, loadSpots } from "../../../../utils/prizes";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const isAdmin = (req) => { const s = req.headers["x-wago-admin-secret"]; return !!s && wagoSecretOk(s, req); };
const str = (v, n) => (v == null || String(v).trim() === "" ? null : String(v).trim().slice(0, n));

async function addCodes(prizeId, spotId, n) {
  const codes = [];
  for (let attempt = 0; codes.length < n && attempt < 5; attempt++) {
    const batch = Array.from({ length: n - codes.length }, makeCode);
    const rows = batch.map(c => ({ prize_id: prizeId, spot_id: spotId, code_hash: hashCode(prizeId, c) }));
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
    const ids = data.map(p => p.id);
    const { spots, codes } = await loadSpots(supabase, ids);
    const spotIds = Object.values(spots).flat().map(s => s.id);
    const gone = {};
    if (spotIds.length) {
      const { data: reps } = await supabase.from("wago_prize_reports").select("spot_id, google_id, kind, at").in("spot_id", spotIds).eq("kind", "gone");
      const seen = Object.fromEntries(Object.values(spots).flat().map(s => [s.id, s.last_seen_at]));
      (reps || []).forEach(r => { if (!seen[r.spot_id] || r.at > seen[r.spot_id]) (gone[r.spot_id] ||= new Set()).add(r.google_id); });
    }
    return res.status(200).json({
      prizes: data.map(p => {
        const cs = codes[p.id] || [];
        return { ...p, total: cs.length, remaining: cs.filter(c => !c.claimed_at).length,
          spots: (spots[p.id] || []).map(s => {
            const sc = cs.filter(c => c.spot_id === s.id);
            return { ...s, total: sc.length, remaining: sc.filter(c => !c.claimed_at).length, gone_reports: gone[s.id]?.size || 0 };
          }) };
      }),
    });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const spots = Array.isArray(b.spots) ? b.spots.slice(0, 20) : [];
    if (!str(b.title, 120) || !str(b.sponsor_name, 80)) return res.status(400).json({ error: "Title and sponsor name are required." });
    if (!spots.length) return res.status(400).json({ error: "Add at least one spot." });
    const clean = spots.map(s => ({ lat: Number(s.lat), lng: Number(s.lng), hint: str(s.hint, 200), qty: Math.min(Math.max(parseInt(s.quantity) || 1, 1), 50) }));
    if (clean.some(s => !isFinite(s.lat) || !isFinite(s.lng) || Math.abs(s.lat) > 90 || Math.abs(s.lng) > 180))
      return res.status(400).json({ error: "Every spot needs a valid latitude and longitude." });
    if (clean.reduce((n, s) => n + s.qty, 0) > 200) return res.status(400).json({ error: "Max 200 codes per prize." });
    const { data: p, error } = await supabase.from("wago_prizes").insert({
      kind: "found", title: str(b.title, 120), description: str(b.description, 600), image_url: str(b.image_url, 500),
      value_text: str(b.value_text, 120), sponsor_name: str(b.sponsor_name, 80), sponsor_url: str(b.sponsor_url, 300),
      sponsor_logo_url: str(b.sponsor_logo_url, 500), lat: clean[0].lat, lng: clean[0].lng, hint: clean[0].hint,
      reveal_radius_m: Number(b.reveal_radius_m) || 100, claim_radius_m: Number(b.claim_radius_m) || 25,
      ends_at: b.ends_at || null, status: b.status === "active" ? "active" : "draft",
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    const { data: rows, error: sErr } = await supabase.from("wago_prize_spots")
      .insert(clean.map(s => ({ prize_id: p.id, lat: s.lat, lng: s.lng, hint: s.hint, last_seen_at: new Date().toISOString() }))).select("id");
    if (sErr) return res.status(500).json({ error: sErr.message });
    const out = [];
    for (let i = 0; i < rows.length; i++) out.push({ spot: i + 1, hint: clean[i].hint, codes: await addCodes(p.id, rows[i].id, clean[i].qty) });
    return res.status(201).json({ prize: p, spots: out });
  }

  if (req.method === "PATCH") {
    const { id, status, spotId, spotStatus, addCodes: more } = req.body || {};
    if (status && id) {
      if (!["draft", "active", "ended"].includes(status)) return res.status(400).json({ error: "bad status" });
      const { error } = await supabase.from("wago_prizes").update({ status }).eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
    }
    if (spotId && spotStatus) {
      if (!["active", "hidden"].includes(spotStatus)) return res.status(400).json({ error: "bad status" });
      // Marking a spot active means you checked it is stocked: reset its "last seen" so old reports stop counting.
      const upd = spotStatus === "active" ? { status: "active", last_seen_at: new Date().toISOString() } : { status: "hidden" };
      const { error } = await supabase.from("wago_prize_spots").update(upd).eq("id", spotId);
      if (error) return res.status(500).json({ error: error.message });
    }
    let codes = [];
    if (spotId && more) {
      const { data: sp } = await supabase.from("wago_prize_spots").select("prize_id").eq("id", spotId).maybeSingle();
      if (!sp) return res.status(404).json({ error: "Spot not found" });
      codes = await addCodes(sp.prize_id, spotId, Math.min(Math.max(parseInt(more) || 0, 0), 50));
    }
    return res.status(200).json({ ok: true, codes });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
