// Shared pin privacy helpers (extracted from api/wago-drops/locations.js; output unchanged).
export function seeded(id, salt) {
  let h = 2166136261 ^ salt;
  const s = String(id);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}
export function jitter(val, metres, id, salt, lat) {
  const deg = metres / 111320;
  const scale = salt === 1 ? 1 : 1 / Math.max(0.2, Math.cos(lat * Math.PI / 180));
  return val + seeded(id, salt) * deg * scale;
}
export function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// Public (unrevealed) coordinates for a pin.
export function publicPin(loc, revealRadius) {
  return {
    lat: jitter(loc.lat, revealRadius * 0.6, loc.id, 1, loc.lat),
    lng: jitter(loc.lng, revealRadius * 0.6, loc.id, 2, loc.lat),
  };
}
