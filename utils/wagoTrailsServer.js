// utils/wagoTrailsServer.js — server-side Trail loading + progress sync.
// The claim row (wago_drop_claims) is the only source of truth for stop completion:
// progress is re-derived from claims on every read, so it can't be spoofed or drift.
import { createClient } from "@supabase/supabase-js";
import { publicPin, haversineM } from "./wagoPinPrivacy";
import { isTrailComplete, hasReward, stopUnavailableReason, stopStates, trailWindow } from "./wagoTrails";

export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const TRAIL_PUBLIC_COLS = "id, name, description, city, cover_image_url, status, completion_mode, distance_m, est_minutes, starts_at, ends_at, reward_type, reward_amount, reward_token_mint, reward_symbol, reward_logo_url, reward_tickets, reward_badge";

const CAMPAIGN_COLS = "id, name, image_url, status, ends_at, reward_amount, reward_type, reward_symbol, reward_logo_url, reward_token_mint, rarity, reveal_radius_m, claim_radius_m";

// Loads stops (including replaced ones) with their campaign + location.
export async function loadStops(trailIds) {
  if (!trailIds.length) return {};
  const { data: stops } = await sb.from("wago_trail_stops").select("*").in("trail_id", trailIds).order("position");
  const locIds = [...new Set((stops || []).map(s => s.location_id))];
  const campIds = [...new Set((stops || []).map(s => s.campaign_id))];
  const [{ data: locs }, { data: camps }] = await Promise.all([
    locIds.length ? sb.from("wago_drop_locations").select("id, lat, lng, hint, claim_count, max_claims, is_active, campaign_id").in("id", locIds) : { data: [] },
    campIds.length ? sb.from("wago_drop_campaigns").select(CAMPAIGN_COLS).in("id", campIds) : { data: [] },
  ]);
  const L = Object.fromEntries((locs || []).map(l => [l.id, l]));
  const C = Object.fromEntries((camps || []).map(c => [c.id, c]));
  const out = {};
  for (const s of stops || []) {
    (out[s.trail_id] ||= []).push({ ...s, location: L[s.location_id] || null, campaign: C[s.campaign_id] || null });
  }
  return out;
}

// Re-derive stop completion from claims and finish/expire the progress row.
// Safe to call concurrently: inserts ignore duplicates, completion is a conditional update.
export async function syncProgress(progress, trail, stops) {
  if (!progress) return progress;
  const active = stops.filter(s => !s.replaced_at);
  const { data: existing } = await sb.from("wago_trail_stop_progress").select("stop_id, claim_id, completed_at").eq("progress_id", progress.id);
  const have = new Set((existing || []).map(r => r.stop_id));

  if (progress.status === "active") {
    const missing = active.filter(s => !have.has(s.id));
    if (missing.length) {
      let q = sb.from("wago_drop_claims").select("id, location_id, claimed_at")
        .eq("google_id", progress.google_id)
        .in("location_id", missing.map(s => s.location_id))
        .gte("claimed_at", progress.started_at);
      if (trail.ends_at) q = q.lte("claimed_at", trail.ends_at);
      const { data: claims } = await q;
      const byLoc = Object.fromEntries((claims || []).map(c => [c.location_id, c]));
      const rows = missing.filter(s => byLoc[s.location_id]).map(s => ({
        progress_id: progress.id, stop_id: s.id, claim_id: byLoc[s.location_id].id, completed_at: byLoc[s.location_id].claimed_at,
      }));
      if (rows.length) {
        await sb.from("wago_trail_stop_progress").upsert(rows, { onConflict: "progress_id,stop_id", ignoreDuplicates: true });
        rows.forEach(r => { have.add(r.stop_id); (existing || []).push(r); });
      }
    }
  }

  // A position counts as done if ANY stop (active or since-replaced) at that position was completed.
  const posOf = Object.fromEntries(stops.map(s => [s.id, s.position]));
  const doneRows = (existing || []).filter(r => posOf[r.stop_id] != null);
  const doneByPos = new Set(doneRows.map(r => posOf[r.stop_id]));
  const positions = active.map(s => s.position).sort((a, b) => a - b);

  let next = progress;
  if (progress.status === "active") {
    if (isTrailComplete(positions, doneByPos)) {
      const completedAt = doneRows.reduce((m, r) => (r.completed_at > m ? r.completed_at : m), progress.started_at);
      const { data: upd } = await sb.from("wago_trail_progress")
        .update({ status: "completed", completed_at: completedAt, reward_status: hasReward(trail) ? "unclaimed" : "none" })
        .eq("id", progress.id).eq("status", "active").select().maybeSingle();
      next = upd || (await sb.from("wago_trail_progress").select("*").eq("id", progress.id).single()).data;
    } else if (trailWindow(trail) === "ended") {
      const { data: upd } = await sb.from("wago_trail_progress").update({ status: "expired" })
        .eq("id", progress.id).eq("status", "active").select().maybeSingle();
      next = upd || (await sb.from("wago_trail_progress").select("*").eq("id", progress.id).single()).data;
    }
  }
  return { ...next, _doneByPos: doneByPos, _doneRows: doneRows };
}

// Shape a Trail for the client. Unrevealed, incomplete stops use the same blurred pin as the main map.
export function shapeStops(stops, { progress, trail, userLat, userLng }) {
  const active = stops.filter(s => !s.replaced_at).sort((a, b) => a.position - b.position);
  const doneByPos = progress?._doneByPos || new Set();
  const positions = active.map(s => s.position);
  const states = stopStates(positions, doneByPos, trail.completion_mode);
  const hasPos = Number.isFinite(userLat) && Number.isFinite(userLng);
  return active.map((s, i) => {
    const loc = s.location, camp = s.campaign;
    const done = doneByPos.has(s.position);
    const revealRadius = camp?.reveal_radius_m || 100;
    const dist = loc && hasPos ? haversineM(userLat, userLng, loc.lat, loc.lng) : Infinity;
    const revealed = !!loc && (done || dist <= revealRadius);
    const pin = loc ? (revealed ? { lat: loc.lat, lng: loc.lng } : publicPin(loc, revealRadius)) : { lat: null, lng: null };
    return {
      id: s.id, position: s.position, state: states[i], label: s.label || camp?.name || `Stop ${s.position}`,
      location_id: s.location_id, campaign_id: s.campaign_id, campaign_name: camp?.name || null, image_url: camp?.image_url || null,
      reward_amount: camp?.reward_amount, reward_type: camp?.reward_type, reward_symbol: camp?.reward_symbol || null,
      reward_logo_url: camp?.reward_logo_url || null, reward_token_mint: camp?.reward_token_mint || null, rarity: camp?.rarity || "common",
      reveal_radius_m: revealRadius, claim_radius_m: camp?.claim_radius_m || 25,
      lat: pin.lat, lng: pin.lng, revealed, hint: revealed ? loc?.hint || null : null,
      unavailable: done ? null : stopUnavailableReason({ campaign: camp, location: loc }),
    };
  });
}
