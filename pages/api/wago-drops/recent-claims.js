// pages/api/wago-drops/recent-claims.js
// Returns the last N claims with campaign info, claimant name, and city/country
// Reverse-geocodes lat/lng via Nominatim (cached in-process by location id)

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// In-process cache: locationId → "City, ST/Country" (or null if lookup failed)
const geoCache = new Map();

const US_STATES = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
  "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS",
  "Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH",
  "New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC",
  "North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA",
  "Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN",
  "Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA",
  "West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY","District of Columbia":"DC",
};
const CA_PROVINCES = {
  "Ontario":"ON","Quebec":"QC","British Columbia":"BC","Alberta":"AB",
  "Manitoba":"MB","Saskatchewan":"SK","Nova Scotia":"NS","New Brunswick":"NB",
  "Newfoundland and Labrador":"NL","Prince Edward Island":"PE",
  "Northwest Territories":"NT","Nunavut":"NU","Yukon":"YT",
};

function usStateAbbr(stateName, countryCode) {
  if (countryCode === "US") return US_STATES[stateName] || null;
  if (countryCode === "CA") return CA_PROVINCES[stateName] || null;
  return null;
}

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
    const countryCode = addr.country_code?.toUpperCase() || null;
    const country     = addr.country || null;
    // For US/CA/AU show "City, ST" (state abbrev), otherwise "City, Country"
    const stateAbbr = addr.state ? usStateAbbr(addr.state, countryCode) : null;
    const region = stateAbbr || country;
    if (!city && !region) return null;
    return [city, region].filter(Boolean).join(", ");
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
          reward_amount,
          reward_symbol,
          reward_logo_url,
          reward_token_mint
        )
      )
    `)
    .order("claimed_at", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  // Count claims in the last 24h for the stat badge
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: total24h } = await supabase
    .from("wago_drop_claims")
    .select("id", { count: "exact", head: true })
    .gte("claimed_at", since24h);

  // Look up display names for unique google_ids
  const googleIds = [...new Set((claims || []).map(c => c.google_id).filter(Boolean))];
  const nameMap = {};
  if (googleIds.length > 0) {
    const { data: accounts } = await supabase
      .from("wago_google_accounts")
      .select("google_id, display_name")
      .in("google_id", googleIds);
    (accounts || []).forEach(a => { nameMap[a.google_id] = a.display_name; });
  }

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

    const rawName  = c.google_id ? nameMap[c.google_id] : null;
    const username = rawName ? rawName.split(" ")[0] : "Someone";

    return {
      id:            c.id,
      claimed_at:    c.claimed_at,
      username,
      campaign_name: campaign?.name          || "Mystery Drop",
      reward_type:   campaign?.reward_type   || "touchgrass",
      reward_amount: campaign?.reward_amount || 0,
      reward_symbol: campaign?.reward_symbol || null,
      reward_logo_url: campaign?.reward_logo_url || null,
      reward_token_mint: campaign?.reward_token_mint || null,
      location:      locLabel,
      location_id:   loc?.id || null,
      lat:           loc?.lat || null,
      lng:           loc?.lng || null,
    };
  });

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ claims: result, total_24h: total24h || 0 });
}