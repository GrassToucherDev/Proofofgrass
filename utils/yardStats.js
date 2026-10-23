// Yard records come ONLY from challenges that were settled server-side (result is set). Pure functions, no I/O.
export const normName = (v) => String(v ?? "").replace(/@/g, "").toLowerCase().trim();

export function tally(rows) {
  const m = {};
  const get = (u) => (m[u] ||= { username: u, wins: 0, losses: 0, ties: 0, noFinish: 0 });
  for (const r of rows) {
    if (!r.result) continue;
    const a = get(normName(r.challenger)), b = get(normName(r.challenged));
    if (r.result === "won") {
      const w = normName(r.winner);
      if (w === a.username) { a.wins++; b.losses++; } else if (w === b.username) { b.wins++; a.losses++; }
    } else if (r.result === "tied") { a.ties++; b.ties++; }
    else if (r.result === "no_finish") { a.noFinish++; b.noFinish++; }
  }
  for (const p of Object.values(m)) {
    p.completed = p.wins + p.losses + p.ties;
    p.winRate = p.completed ? Math.round((p.wins / p.completed) * 100) : 0;
  }
  return m;
}

const METRICS = {
  wins:      (a, b) => b.wins - a.wins || b.winRate - a.winRate || b.completed - a.completed,
  rate:      (a, b) => b.winRate - a.winRate || b.wins - a.wins || b.completed - a.completed,
  completed: (a, b) => b.completed - a.completed || b.wins - a.wins || b.winRate - a.winRate,
};

// Players who have at least one decided/tied result. "rate" needs 3+ results so one lucky win can't top the board.
export function rankPlayers(map, metric = "wins") {
  const sort = METRICS[metric] || METRICS.wins;
  return Object.values(map)
    .filter((p) => p.completed >= (metric === "rate" ? 3 : 1))
    .sort((a, b) => sort(a, b) || a.username.localeCompare(b.username));
}
