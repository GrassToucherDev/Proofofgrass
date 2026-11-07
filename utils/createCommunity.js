// Shared settings for Community Creations (server and client safe).
export const POST_MIN_STREAK = 7;          // current streak needed to post to the gallery
export const POSTS_PER_DAY = 5;            // posts per player per UTC day
export const REPORT_HIDE_AT = 3;           // different reporters needed to hide a post automatically
export const CREATIONS_BUCKET = "creations";
export const MAX_IMAGE_BYTES = 3_000_000;  // decoded upload cap
export const KINDS = ["meme", "pfp"];

// Unlisted mode: the gallery is live at /create/community but nothing links to it (hub card, theme banner, menu entry).
// People who open the link get "Post to Community" turned on in the tools (remembered in their browser).
// Flip to true when it's polished and ready to announce.
export const COMMUNITY_LISTED = false;
const FLAG = "pog_community";
export function communityUnlocked() {
  if (COMMUNITY_LISTED) return true;
  try {
    if (typeof window === "undefined") return false;
    if (new URLSearchParams(window.location.search).get("community") === "1") localStorage.setItem(FLAG, "1");
    return localStorage.getItem(FLAG) === "1";
  } catch { return false; }
}
export function unlockCommunity() { try { localStorage.setItem(FLAG, "1"); } catch {} }

// One theme per ISO week, no database needed. Add or reorder freely; the list loops.
export const WEEKLY_THEMES = [
  { title: "Touch grass at work", hint: "Lunch breaks, walking meetings, the one tree outside the office." },
  { title: "Muddy boots", hint: "Rain, puddles and the trail that fought back." },
  { title: "WAGO adventures", hint: "What is WAGO getting up to today?" },
  { title: "Streak flex", hint: "Day count, receipts, and how you keep it alive." },
  { title: "Doomscroll vs grass", hint: "The phone says one thing. The sun says another." },
  { title: "Sunrise club", hint: "Early walks, golden light, no snooze button." },
  { title: "Trail snacks", hint: "Fuel for the adventure. Rank your favorites." },
  { title: "Weekend warrior", hint: "Big outdoor plans, small outdoor wins." },
];

export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { year: t.getUTCFullYear(), week: Math.ceil(((t - y0) / 86400000 + 1) / 7) };
}
export function currentTheme(d = new Date()) {
  const { year, week } = isoWeek(d);
  const t = WEEKLY_THEMES[(year * 53 + week) % WEEKLY_THEMES.length];
  return { ...t, week, year };
}
