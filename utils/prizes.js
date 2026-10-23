// utils/prizes.js — shared helpers for WAGO prizes and consent.
import crypto from "crypto";

export const CONSENT_VERSION = "2026-10-v1";

export function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function jitter(val, metres) {
  return val + (Math.random() * 2 - 1) * (metres / 111320);
}

export const normalizeCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const hashCode = (prizeId, code) =>
  crypto.createHash("sha256").update(`${prizeId}:${normalizeCode(code)}`).digest("hex");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function makeCode() {
  const b = crypto.randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "A finder";
}

export async function hasConsent(supabase, googleId) {
  const { data } = await supabase.from("wago_consents").select("google_id")
    .eq("google_id", googleId).eq("version", CONSENT_VERSION).maybeSingle();
  return !!data;
}

// A prize is a set of spots; each spot has its own codes. Spots reported gone by 2+ people are hidden until restocked.
export async function loadSpots(supabase, prizeIds) {
  const out = { spots: {}, codes: {} };
  if (!prizeIds.length) return out;
  const [{ data: sp }, { data: cd }] = await Promise.all([
    supabase.from("wago_prize_spots").select("*").in("prize_id", prizeIds),
    supabase.from("wago_prize_codes").select("prize_id, spot_id, claimed_at").in("prize_id", prizeIds),
  ]);
  (sp || []).forEach(x => (out.spots[x.prize_id] ||= []).push(x));
  (cd || []).forEach(c => (out.codes[c.prize_id] ||= []).push(c));
  return out;
}

// Shape a prize for the public. A spot's exact location and hint show only within the reveal radius.
export function publicPrize(p, spots = [], codes = [], pos) {
  const reveal = p.reveal_radius_m || 100;
  const left = {}, tot = {};
  codes.forEach(c => { tot[c.spot_id] = (tot[c.spot_id] || 0) + 1; if (!c.claimed_at) left[c.spot_id] = (left[c.spot_id] || 0) + 1; });
  const live = spots.filter(s => s.status === "active");
  const shaped = live.map(s => {
    const revealed = pos ? haversineM(pos.lat, pos.lng, s.lat, s.lng) <= reveal : false;
    return {
      id: s.id, total: tot[s.id] || 0, remaining: left[s.id] || 0, last_seen_at: s.last_seen_at || null, revealed,
      hint: revealed ? s.hint : null,
      lat: revealed ? s.lat : jitter(s.lat, reveal * 1.5),
      lng: revealed ? s.lng : jitter(s.lng, reveal * 1.5),
    };
  });
  return {
    id: p.id, kind: p.kind, title: p.title, description: p.description || null,
    image_url: p.image_url || null, value_text: p.value_text || null,
    sponsor_name: p.sponsor_name, sponsor_url: p.sponsor_url || null, sponsor_logo_url: p.sponsor_logo_url || null,
    reveal_radius_m: reveal, claim_radius_m: p.claim_radius_m || 25, ends_at: p.ends_at || null,
    total: codes.length, remaining: shaped.reduce((n, s) => n + s.remaining, 0),
    spots: shaped,
  };
}

export function parsePos(q) {
  const lat = parseFloat(q.userLat), lng = parseFloat(q.userLng);
  return isNaN(lat) || isNaN(lng) ? null : { lat, lng };
}
