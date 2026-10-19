// utils/mapServer.js
// Server-only data layer for the community map (used by /api/map/*).
//
// Eligibility (matches the rest of the app, e.g. dashboard counts):
//   • Submissions.status is "pending" or "approved" (rejected is excluded)
//   • location_source is "gps" or "manual"  → the user chose to share a location
//   • the location resolves to valid coordinates
// Nothing is ever inferred from IP, wallet or profile data.
//
// Coordinates: the app stores GPS fixes rounded to 0.01°. Manual entries
// (typed city/region/country) have no coordinates, so they are placed with a
// forward-geocode of the text the user typed. Public output is coarsened to 0.1°.

import { createClient } from "@supabase/supabase-js";
import {
  COUNTRIES, normalizeCountry, normalizeUsState, validCoords, publicCoord,
  cellKey, titleCase, broadLabel,
} from "./mapGeo";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fndhqtnsdqlyedpwecys.supabase.co";
const ANON_KEY = "sb_publishable_VtcdAaymV20dOd5Q39ZrfQ_VcNInpSF";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null;

const db = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY, { auth: { persistSession: false } });

const PAGE = 1000;
const MAX_ROWS = 50000;      // hard safety cap on rows scanned
const DATASET_TTL = 60_000;  // ms
const MAX_LOOKUPS = 40;      // geocoder calls per refresh
const LOOKUP_CONCURRENCY = 6;

const geoCache = new Map();  // key -> result | null (null = looked up, nothing found)
let datasetCache = { at: 0, data: null, building: null };

// ── Geocoding (Mapbox, existing NEXT_PUBLIC_MAPBOX_TOKEN) ────────────────────
async function mb(path, params) {
  const qs = new URLSearchParams({ access_token: MAPBOX_TOKEN, language: "en", ...params });
  const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${path}.json?${qs}`);
  if (!r.ok) throw new Error(`mapbox ${r.status}`);
  return r.json();
}

function fromFeature(f) {
  if (!f) return null;
  const ctx = Array.isArray(f.context) ? f.context : [];
  const isType = (x, t) => String(x.id || "").startsWith(t + ".");
  const countryCtx = f.id?.startsWith("country.") ? f : ctx.find(c => isType(c, "country"));
  const regionCtx = f.id?.startsWith("region.") ? f : ctx.find(c => isType(c, "region"));
  const countryCode = normalizeCountry(countryCtx?.properties?.short_code || countryCtx?.short_code || countryCtx?.text);
  let stateCode = null, regionName = regionCtx?.text || null;
  if (countryCode === "US") {
    const st = normalizeUsState(regionCtx?.properties?.short_code || regionCtx?.short_code || regionCtx?.text);
    stateCode = st?.code || null;
    if (st) regionName = st.name;
  }
  const c = Array.isArray(f.center) ? f.center : null;
  return { countryCode, stateCode, regionName, lng: c?.[0], lat: c?.[1] };
}

async function reverseLookup(lat, lng) {
  let j = await mb(`${lng},${lat}`, { types: "region", limit: "1" });
  let r = fromFeature(j.features?.[0]);
  if (!r?.countryCode) { // regionless countries / small states
    j = await mb(`${lng},${lat}`, { types: "country", limit: "1" });
    r = fromFeature(j.features?.[0]) || r;
  }
  return r;
}

async function forwardLookup(city, region, country) {
  const q = [city, region, country].filter(Boolean).join(", ");
  const j = await mb(encodeURIComponent(q), { types: "place,locality,district,region,country", limit: "1" });
  return fromFeature(j.features?.[0]);
}

async function runLookups(tasks) {
  let done = 0;
  const queue = tasks.slice(0, MAX_LOOKUPS);
  async function worker() {
    while (queue.length) {
      const t = queue.shift();
      try { geoCache.set(t.key, await t.run()); done++; }
      catch { /* leave uncached; retried on a later refresh */ }
    }
  }
  await Promise.all(Array.from({ length: LOOKUP_CONCURRENCY }, worker));
  return done;
}

// ── Dataset ──────────────────────────────────────────────────────────────────
async function fetchRows() {
  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await db.from("Submissions")
      .select("id,username,created_at,location_source,location_city,location_region,location_country,location_lat_rounded,location_lng_rounded")
      .in("status", ["pending", "approved"])
      .in("location_source", ["gps", "manual"])
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function buildDataset() {
  const rows = await fetchRows();
  const tasks = [];
  const queued = new Set();

  for (const r of rows) {
    if (r.location_source === "gps" && validCoords(r.location_lat_rounded, r.location_lng_rounded)) {
      const needsGeo = !normalizeCountry(r.location_country);
      const key = `r|${Number(r.location_lat_rounded).toFixed(2)}|${Number(r.location_lng_rounded).toFixed(2)}`;
      if (needsGeo && MAPBOX_TOKEN && !geoCache.has(key) && !queued.has(key)) {
        queued.add(key);
        tasks.push({ key, run: () => reverseLookup(Number(r.location_lat_rounded), Number(r.location_lng_rounded)) });
      }
    } else if (r.location_source === "manual" && (r.location_city || r.location_region || r.location_country)) {
      const key = `f|${[r.location_city, r.location_region, r.location_country].map(x => String(x || "").trim().toLowerCase()).join("|")}`;
      if (MAPBOX_TOKEN && !geoCache.has(key) && !queued.has(key)) {
        queued.add(key);
        tasks.push({ key, run: () => forwardLookup(r.location_city, r.location_region, r.location_country) });
      }
    }
  }
  if (tasks.length) await runLookups(tasks);
  let pending = Math.max(0, tasks.length - MAX_LOOKUPS);

  const records = [];
  const backfill = new Map(); // stored pair -> { lat, lng, country, region }
  for (const r of rows) {
    let lat = null, lng = null, g = null;
    const typedCountry = normalizeCountry(r.location_country);
    let countryCode = typedCountry, stateCode = null, regionName = null;

    if (r.location_source === "gps") {
      if (!validCoords(r.location_lat_rounded, r.location_lng_rounded)) continue;
      lat = Number(r.location_lat_rounded); lng = Number(r.location_lng_rounded);
      if (!countryCode) {
        g = geoCache.get(`r|${lat.toFixed(2)}|${lng.toFixed(2)}`);
        if (g?.countryCode) {
          countryCode = g.countryCode; stateCode = g.stateCode; regionName = g.regionName;
          backfill.set(`${lat}|${lng}`, { lat, lng, country: COUNTRIES[countryCode], region: stateCode || regionName });
        }
      }
    } else {
      const key = `f|${[r.location_city, r.location_region, r.location_country].map(x => String(x || "").trim().toLowerCase()).join("|")}`;
      g = geoCache.get(key);
      if (!g || !validCoords(g.lat, g.lng)) continue; // cannot be placed → no marker
      lat = g.lat; lng = g.lng;
      countryCode = typedCountry || g.countryCode;
    }

    if (countryCode === "US" && !stateCode) {
      const st = normalizeUsState(r.location_region) || (g?.stateCode ? normalizeUsState(g.stateCode) : null);
      if (st) { stateCode = st.code; regionName = st.name; }
    }
    if (!regionName && r.location_region) regionName = titleCase(r.location_region);

    const city = r.location_source === "manual" && r.location_city ? titleCase(r.location_city) : null;
    records.push({
      id: String(r.id),
      username: String(r.username || "").toLowerCase(),
      createdAt: r.created_at,
      lat, lng,
      countryCode, stateCode,
      label: broadLabel({ city, stateCode, regionName, countryCode }),
    });
  }

  if (SERVICE_KEY && backfill.size) persistBackfill([...backfill.values()]).catch(() => {});
  return { records, pending, builtAt: Date.now() };
}

// Fill ONLY empty country/region on a user's own GPS submission, derived from
// the coordinates they chose to share. Never overwrites existing values.
async function persistBackfill(items) {
  for (const it of items.slice(0, 100)) {
    await db.from("Submissions").update({ location_country: it.country })
      .eq("location_source", "gps").eq("location_lat_rounded", it.lat).eq("location_lng_rounded", it.lng)
      .is("location_country", null);
    if (it.region) {
      await db.from("Submissions").update({ location_region: it.region })
        .eq("location_source", "gps").eq("location_lat_rounded", it.lat).eq("location_lng_rounded", it.lng)
        .is("location_region", null);
    }
  }
}

export async function getDataset() {
  const now = Date.now();
  if (datasetCache.data && now - datasetCache.at < DATASET_TTL) return datasetCache.data;
  if (!datasetCache.building) {
    datasetCache.building = buildDataset()
      .then(d => { datasetCache = { at: Date.now(), data: d, building: null }; return d; })
      .catch(e => { datasetCache.building = null; throw e; });
  }
  return datasetCache.building;
}

// ── Ranges (UTC) ─────────────────────────────────────────────────────────────
export const RANGES = {
  all:   { label: "All time" },
  week:  { label: "Last 7 days (UTC)" },
  today: { label: "Today (UTC)" },
};

export function rangeStart(range, now = new Date()) {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (range === "today") return new Date(midnight);
  if (range === "week") return new Date(midnight - 6 * 86400000); // today + previous 6 UTC days
  return null;
}

export function summarize(dataset, range, now = new Date()) {
  const start = rangeStart(range, now);
  const inRange = start ? dataset.records.filter(r => new Date(r.createdAt) >= start) : dataset.records;

  const users = new Set(), countries = new Set(), cells = new Map();
  for (const r of inRange) { // records are newest-first
    users.add(r.username);
    if (r.countryCode && COUNTRIES[r.countryCode]) countries.add(r.countryCode);
    const key = cellKey(r.lat, r.lng);
    let c = cells.get(key);
    if (!c) { c = { lat: publicCoord(r.lat), lng: publicCoord(r.lng), count: 0, ids: [], label: r.label }; cells.set(key, c); }
    c.count++;
    if (c.ids.length < 5) c.ids.push(r.id);
  }

  const allCountries = new Set(), states = new Set(), other = new Set();
  for (const r of dataset.records) {
    if (r.countryCode && COUNTRIES[r.countryCode]) allCountries.add(r.countryCode);
    if (r.countryCode === "US" && r.stateCode) {
      const st = normalizeUsState(r.stateCode);
      if (st?.kind === "state") states.add(st.code); else if (st) other.add(st.code);
    }
  }

  return {
    inRange,
    stats: { mappedProofs: inRange.length, countries: countries.size, participants: users.size },
    points: [...cells.values()],
    footprint: {
      label: "All-time footprint",
      countries: { count: allCountries.size, total: Object.keys(COUNTRIES).length },
      usStates: { count: states.size, total: 50 },
      usOther: [...other].sort(),
    },
    start,
  };
}

export async function profilesFor(usernames) {
  const names = [...new Set(usernames)].filter(Boolean);
  if (!names.length) return {};
  const { data } = await db.from("Profiles").select("username,avatar_url,avatar_emoji").in("username", names);
  const out = {};
  for (const p of data || []) out[String(p.username).toLowerCase()] = { avatarUrl: p.avatar_url || null, avatarEmoji: p.avatar_emoji || null };
  return out;
}
