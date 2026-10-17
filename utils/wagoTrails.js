// utils/wagoTrails.js — pure helpers for WAGO Trails (no I/O; safe on client and server).
import { haversineM } from "./wagoPinPrivacy";

export const TRAIL_MIN_STOPS = 3;
export const TRAIL_MAX_STOPS = 5;
export const WALK_M_PER_MIN = 80;   // ~4.8 km/h
export const MIN_PER_STOP = 3;      // time to find + claim

export function routeDistanceM(points) {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += haversineM(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  return Math.round(d);
}
export function estimateMinutes(distanceM, stopCount) {
  return Math.max(5, Math.round((distanceM || 0) / WALK_M_PER_MIN + (stopCount || 0) * MIN_PER_STOP));
}
export function formatDistance(m) {
  if (m == null) return "";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}
export function formatMinutes(min) {
  if (min == null) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

// 'upcoming' | 'live' | 'ended'
export function trailWindow(trail, now = Date.now()) {
  if (trail?.starts_at && new Date(trail.starts_at).getTime() > now) return "upcoming";
  if (trail?.ends_at && new Date(trail.ends_at).getTime() < now) return "ended";
  return "live";
}

export function hasReward(trail) {
  return (trail?.reward_type && trail.reward_type !== "none" && Number(trail.reward_amount) > 0)
    || Number(trail?.reward_tickets) > 0 || !!trail?.reward_badge;
}

// Why a stop's drop can't currently be claimed (null = fine).
export function stopUnavailableReason({ campaign, location }) {
  if (!campaign || !location) return "removed";
  if (!location.is_active) return "paused";
  if (campaign.status !== "active") return "paused";
  if (campaign.ends_at && new Date(campaign.ends_at).getTime() < Date.now()) return "ended";
  if (location.max_claims != null && location.claim_count >= location.max_claims) return "exhausted";
  return null;
}

// positions: sorted array of active position numbers; doneByPos: Set of completed positions.
// Returns the per-position state: 'done' | 'current' | 'available' | 'upcoming'.
export function stopStates(positions, doneByPos, mode) {
  const firstOpen = positions.find(p => !doneByPos.has(p));
  return positions.map(p => {
    if (doneByPos.has(p)) return "done";
    if (mode === "any_order") return "available";
    return p === firstOpen ? "current" : "upcoming";
  });
}

export function isTrailComplete(positions, doneByPos) {
  return positions.length > 0 && positions.every(p => doneByPos.has(p));
}
