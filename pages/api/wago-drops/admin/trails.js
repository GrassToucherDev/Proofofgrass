// pages/api/wago-drops/admin/trails.js — Trail Builder API (header x-wago-admin-secret).
//   GET                                   → all Trails with stops + participation counts
//   POST { action: "save", trail, stops } → create/update. Stops (3–5) are only editable before anyone starts.
//   POST { action: "replace_stop", trail_id, position, campaign_id, location_id, label? }
//                                         → swap a stop mid-flight; completed progress is preserved per position
//   POST { action: "set_status", id, status }
import { solToLamports, maxSolPerClaim } from "../../../../utils/wagoPayout.mjs";
import { sb, loadStops } from "../../../../utils/wagoTrailsServer";
import { routeDistanceM, estimateMinutes, TRAIL_MIN_STOPS, TRAIL_MAX_STOPS } from "../../../../utils/wagoTrails";

const isAdmin = req => {
  const s = req.headers["x-wago-admin-secret"] || req.query._s;
  return !!s && s === process.env.WAGO_ADMIN_SECRET;
};

const FIELDS = ["name", "description", "city", "cover_image_url", "completion_mode", "starts_at", "ends_at",
  "reward_type", "reward_amount", "reward_token_mint", "reward_symbol", "reward_logo_url", "reward_tickets", "reward_badge"];

const blank = v => (v === "" || v === undefined ? null : v);

function cleanTrail(t) {
  const out = {};
  FIELDS.forEach(k => { if (k in t) out[k] = blank(t[k]); });
  if (!out.name || !String(out.name).trim()) throw new Error("Trail name is required.");
  out.name = String(out.name).trim();
  out.completion_mode = out.completion_mode === "any_order" ? "any_order" : "ordered";
  out.reward_type = ["none", "spl_token", "sol"].includes(out.reward_type) ? out.reward_type : "none";
  out.reward_amount = out.reward_amount == null ? null : Number(out.reward_amount);
  out.reward_tickets = out.reward_tickets == null ? null : Math.max(0, parseInt(out.reward_tickets, 10) || 0);
  if (out.reward_type !== "none") {
    if (!(out.reward_amount > 0)) throw new Error("Reward amount must be greater than 0.");
    if (out.reward_type === "spl_token" && !out.reward_token_mint) throw new Error("Token rewards need a mint address.");
  } else { out.reward_amount = null; out.reward_token_mint = null; out.reward_symbol = null; out.reward_logo_url = null; }
  if (out.reward_type === "sol") {
    out.reward_token_mint = null; out.reward_symbol = "SOL";
    if (solToLamports(out.reward_amount) == null) throw new Error("SOL amounts can have at most 9 decimal places.");
    const cap = maxSolPerClaim(process.env);
    if (out.reward_amount > cap) throw new Error(`SOL reward is above the per-claim limit of ${cap} SOL.`);
  }
  if (out.starts_at && out.ends_at && new Date(out.ends_at) <= new Date(out.starts_at)) throw new Error("End date must be after the start date.");
  return out;
}

// Checks each (campaign, location) pair is real, distinct, and returns rows with coordinates.
async function validateStops(stops) {
  if (stops.length < TRAIL_MIN_STOPS || stops.length > TRAIL_MAX_STOPS) throw new Error(`A Trail needs ${TRAIL_MIN_STOPS}–${TRAIL_MAX_STOPS} stops.`);
  const locIds = stops.map(s => s.location_id);
  if (new Set(locIds).size !== locIds.length) throw new Error("Each stop must be a different pin.");
  const { data: locs } = await sb.from("wago_drop_locations").select("id, lat, lng, campaign_id, is_active").in("id", locIds);
  const L = Object.fromEntries((locs || []).map(l => [l.id, l]));
  stops.forEach((s, i) => {
    const l = L[s.location_id];
    if (!l) throw new Error(`Stop ${i + 1}: pin not found.`);
    if (l.campaign_id !== s.campaign_id) throw new Error(`Stop ${i + 1}: pin doesn't belong to that campaign.`);
    if (!l.is_active) throw new Error(`Stop ${i + 1}: pin is inactive.`);
  });
  return stops.map(s => L[s.location_id]);
}

async function recomputeRoute(trailId) {
  const stops = ((await loadStops([trailId]))[trailId] || []).filter(s => !s.replaced_at).sort((a, b) => a.position - b.position);
  const pts = stops.map(s => s.location).filter(Boolean);
  const distance_m = routeDistanceM(pts);
  await sb.from("wago_trails").update({ distance_m, est_minutes: estimateMinutes(distance_m, stops.length), updated_at: new Date().toISOString() }).eq("id", trailId);
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    if (req.method === "GET") {
      const { data: trails } = await sb.from("wago_trails").select("*").order("created_at", { ascending: false });
      const ids = (trails || []).map(t => t.id);
      const stopsBy = await loadStops(ids);
      const { data: prog } = ids.length ? await sb.from("wago_trail_progress").select("trail_id, status, reward_status").in("trail_id", ids) : { data: [] };
      const counts = {};
      (prog || []).forEach(p => {
        const c = (counts[p.trail_id] ||= { started: 0, completed: 0, expired: 0, rewards_pending: 0 });
        c.started++; if (p.status === "completed") c.completed++; if (p.status === "expired") c.expired++;
        if (["pending", "awaiting_wallet", "failed", "unclaimed"].includes(p.reward_status) && p.status === "completed") c.rewards_pending++;
      });
      return res.status(200).json({
        trails: (trails || []).map(t => ({
          ...t, counts: counts[t.id] || { started: 0, completed: 0, expired: 0, rewards_pending: 0 },
          stops: (stopsBy[t.id] || []).sort((a, b) => a.position - b.position).map(s => ({
            id: s.id, position: s.position, campaign_id: s.campaign_id, location_id: s.location_id, label: s.label,
            campaign_name: s.campaign?.name || null, hint: s.location?.hint || null, replaced_at: s.replaced_at,
            lat: s.location?.lat, lng: s.location?.lng,
          })),
        })),
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { action } = req.body || {};

    if (action === "save") {
      const fields = cleanTrail(req.body.trail || {});
      const stopsIn = (req.body.stops || []).map(s => ({ campaign_id: s.campaign_id, location_id: s.location_id, label: blank(s.label) }));
      const id = req.body.trail?.id;

      if (!id) {
        await validateStops(stopsIn);
        const { data: t, error } = await sb.from("wago_trails").insert({ ...fields, status: "draft" }).select().single();
        if (error) throw new Error(error.message);
        const { error: sErr } = await sb.from("wago_trail_stops").insert(stopsIn.map((s, i) => ({ ...s, trail_id: t.id, position: i + 1 })));
        if (sErr) { await sb.from("wago_trails").delete().eq("id", t.id); throw new Error(sErr.message); }
        await recomputeRoute(t.id);
        return res.status(200).json({ ok: true, id: t.id });
      }

      const { count: started } = await sb.from("wago_trail_progress").select("id", { count: "exact", head: true }).eq("trail_id", id);
      const { error } = await sb.from("wago_trails").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
      let stopsLocked = false;
      if (req.body.stops) {
        if ((started || 0) > 0) stopsLocked = true;   // use replace_stop once people have started
        else {
          await validateStops(stopsIn);
          const { error: dErr } = await sb.from("wago_trail_stops").delete().eq("trail_id", id);
          if (dErr) throw new Error(dErr.message);
          const { error: iErr } = await sb.from("wago_trail_stops").insert(stopsIn.map((s, i) => ({ ...s, trail_id: id, position: i + 1 })));
          if (iErr) throw new Error(iErr.message);
        }
      }
      await recomputeRoute(id);
      return res.status(200).json({ ok: true, id, stopsLocked });
    }

    if (action === "replace_stop") {
      const { trail_id, position, campaign_id, location_id } = req.body;
      const label = blank(req.body.label);
      const { data: trail } = await sb.from("wago_trails").select("id, ends_at").eq("id", trail_id).maybeSingle();
      if (!trail) return res.status(404).json({ error: "Trail not found" });
      if (trail.ends_at && new Date(trail.ends_at) < new Date()) return res.status(400).json({ error: "This Trail has already ended; stops can't be replaced." });

      const current = ((await loadStops([trail_id]))[trail_id] || []).filter(s => !s.replaced_at);
      const old = current.find(s => s.position === Number(position));
      if (!old) return res.status(404).json({ error: "No stop at that position" });
      if (current.some(s => s.location_id === location_id)) return res.status(400).json({ error: "That pin is already on this Trail." });
      await validateStops(current.map(s => (s.id === old.id ? { campaign_id, location_id } : s)));

      const now = new Date().toISOString();
      const { error: e1 } = await sb.from("wago_trail_stops").update({ replaced_at: now }).eq("id", old.id).is("replaced_at", null);
      if (e1) throw new Error(e1.message);
      const { data: fresh, error: e2 } = await sb.from("wago_trail_stops")
        .insert({ trail_id, position: old.position, campaign_id, location_id, label }).select().single();
      if (e2) {
        await sb.from("wago_trail_stops").update({ replaced_at: null }).eq("id", old.id);   // roll back
        throw new Error(e2.message);
      }
      await sb.from("wago_trail_stops").update({ replaced_by: fresh.id }).eq("id", old.id);
      await recomputeRoute(trail_id);
      return res.status(200).json({ ok: true, stop_id: fresh.id });
    }

    if (action === "set_status") {
      const { id, status } = req.body;
      if (!["draft", "published", "paused", "archived"].includes(status)) return res.status(400).json({ error: "Invalid status" });
      if (status === "published") {
        const stops = ((await loadStops([id]))[id] || []).filter(s => !s.replaced_at);
        if (stops.length < TRAIL_MIN_STOPS || stops.length > TRAIL_MAX_STOPS) return res.status(400).json({ error: `Add ${TRAIL_MIN_STOPS}–${TRAIL_MAX_STOPS} stops before publishing.` });
        const { data: t } = await sb.from("wago_trails").select("name").eq("id", id).maybeSingle();
        if (!t) return res.status(404).json({ error: "Trail not found" });
      }
      const { error } = await sb.from("wago_trails").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
