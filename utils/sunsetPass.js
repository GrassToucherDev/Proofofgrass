// utils/sunsetPass.js — Sunset Pass timing, shared by the API and UI.
// The platform day rolls over at 00:00 UTC. A Sunset Pass extends the previous day's
// deadline to 02:00 UTC.

const DAY = 86400000;
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);

// Which day (if any) can a pass extend right now?
//   mode "arm":   23:00–23:59 UTC — extends today's deadline (it runs to 02:00 tomorrow)
//   mode "apply": 00:00–01:59 UTC — extends yesterday's deadline
// Returns null outside 23:00–02:00 UTC.
export function sunsetWindow(now = new Date()) {
  const ms = now.getTime();
  const h = now.getUTCHours();
  if (h === 23) {
    const date = ymd(ms);
    return { mode: "arm", date, deadline: `${ymd(ms + DAY)}T02:00:00Z` };
  }
  if (h < 2) {
    const date = ymd(ms - DAY);
    return { mode: "apply", date, deadline: `${ymd(ms)}T02:00:00Z` };
  }
  return null;
}
