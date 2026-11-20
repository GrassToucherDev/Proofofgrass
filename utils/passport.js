// utils/passport.js — shared (client + server) helpers for the WAGO Passport. Pure functions only.
export const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const NAME_MAX = 24;
export const DEFAULT_NAME = "WAGO Collector";

// Display name shown on the Passport and printed on the PNG. Plain text only, never a wallet address.
export function cleanDisplayName(v) {
  const raw = String(v ?? "");
  if (looksLikeAddress(raw)) return "";
  return raw
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
}

// Don't let a pasted wallet address end up as the printed name. Checked on the raw input (before the length cap),
// and only for address-length runs, so ordinary long names still pass.
export function looksLikeAddress(s) {
  return /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(String(s ?? "").replace(/\s/g, ""));
}

// "WAGO Origins #204" -> 204. Used only to order a collector's pieces.
export function tokenNumber(name) {
  const m = /#\s*(\d+)/.exec(String(name ?? ""));
  return m ? Number(m[1]) : null;
}

// Stable order: Origins first, then by token number, then by name/id.
export function sortPieces(list) {
  const rank = (p) => (p.collection === "origins" ? 0 : 1);
  return [...list].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const na = tokenNumber(a.name), nb = tokenNumber(b.name);
    if (na != null && nb != null && na !== nb) return na - nb;
    if (na != null && nb == null) return -1;
    if (na == null && nb != null) return 1;
    return String(a.name || a.id).localeCompare(String(b.name || b.id)) || String(a.id).localeCompare(String(b.id));
  });
}

// The cover is the collector's pick when they still own it, otherwise their first Origin (or first piece).
export function pickCover(pieces, preferredId) {
  if (!pieces?.length) return null;
  return pieces.find((p) => p.id === preferredId) || pieces[0];
}
