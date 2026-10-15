// pages/api/wago-drops/recent-claims.js
// Returns the last N claims with campaign info, claimant name, and city/country
// Reverse-geocodes lat/lng via Nominatim (cached in-process by location id)

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// In-process cache: locationId → "City, Country" (or null if lookup failed)
const geoCache = new Map();

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ProofOfGrass/1.0 (proofofgrass.app)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      null;
    const country = addr.country || null;
    if (!city && !country) return null;
    return [city, country].filter(Boolean).join(", ");
  } catch {
    return null;
  }
}

async function getLocation(locationId, lat, lng) {
  if (geoCache.has(locationId)) return geoCache.get(locationId);
  // Stagger requests slightly to respect Nominatim's 1 req/s limit
  const label = await reverseGeocode(lat, lng);
  geoCache.set(locationId, label);
  return label;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const { data: claims, error } = await supabase
    .from("wago_drop_claims")
    .select(`
      id,
      claimed_at,
      google_id,
      wago_drop_locations (
        id,
        lat,
        lng,
        wago_drop_campaigns (
          name,
          reward_type,
          reward_amount
        )
      ),
      wago_google_accounts!wago_drop_claims_google_id_fkey (
        display_name
      )
    `)
    .order("claimed_at", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  // Geocode uncached locations (sequentially to respect rate limit)
  const seen = new Set();
  for (const c of claims || []) {
    const loc = c.wago_drop_locations;
    if (!loc || seen.has(loc.id)) continue;
    seen.add(loc.id);
    if (!geoCache.has(loc.id) && loc.lat != null && loc.lng != null) {
      await getLocation(loc.id, loc.lat, loc.lng);
    }
  }

  const result = (claims || []).map(c => {
    const loc      = c.wago_drop_locations;
    const campaign = loc?.wago_drop_campaigns;
    const locLabel = loc ? geoCache.get(loc.id) ?? null : null;

    const rawName  = c.wago_google_accounts?.display_name || null;
    const username = rawName ? rawName.split(" ")[0] : "Someone";

    return {
      id:            c.id,
      claimed_at:    c.claimed_at,
      username,
      campaign_name: campaign?.name          || "Mystery Drop",
      reward_type:   campaign?.reward_type   || "touchgrass",
      reward_amount: campaign?.reward_amount || 0,
      location:      locLabel,
    };
  });

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ claims: result });
}