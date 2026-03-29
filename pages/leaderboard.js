import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

function normalizeUsername(val) {
  return String(val ?? "").replace(/@/g, "").toLowerCase().trim();
}

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

export default function Leaderboard() {
  const [tab, setTab] = useState("alltime"); // "alltime" | "weekly"
  const [data, setData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [rankQuery, setRankQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // Shared helper: group + merge submissions with streak data
  function buildLeaderboard(submissions, streakMap, bestStreakMap) {
    const grouped = {};
    (submissions || []).forEach((item) => {
      const normalized = normalizeUsername(item.username);
      if (!normalized) return;
      if (!grouped[normalized]) {
        grouped[normalized] = { username: normalized, count: 0, tweet_url: item.tweet_url, created_at: item.created_at };
      }
      grouped[normalized].count += 1;
      if (new Date(item.created_at) > new Date(grouped[normalized].created_at)) {
        grouped[normalized].tweet_url = item.tweet_url;
        grouped[normalized].created_at = item.created_at;
      }
    });
    return Object.values(grouped)
      .map((entry) => ({
        ...entry,
        current_streak: streakMap[entry.username] ?? 1,
        best_streak: bestStreakMap[entry.username] ?? 1,
      }))
      .sort((a, b) => {
        if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
        if (b.count !== a.count) return b.count - a.count;
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }

  const fetchData = async () => {
    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6); // last 7 days

    const [
      { data: submissions, error: subError },
      { data: streaks, error: strError },
    ] = await Promise.all([
      supabase.from("Submissions").select("*").eq("status", "approved").order("created_at", { ascending: false }),
      supabase.from("Streaks").select("username, current_streak, best_streak, last_submission_date"),
    ]);

    if (subError) { console.error(subError); return; }
    if (strError) { console.error(strError); }

    // Build streak lookups — normalize keys
    const streakMap = {};
    const bestStreakMap = {};
    (streaks || []).forEach((s) => {
      const normalized = normalizeUsername(s.username);
      if (!normalized) return;
      streakMap[normalized] = s.current_streak;
      bestStreakMap[normalized] = s.best_streak ?? s.current_streak ?? 1;
    });

    // All-time leaderboard
    setData(buildLeaderboard(submissions, streakMap, bestStreakMap));

    // Weekly leaderboard — same logic, filtered to last 7 days
    const weeklySubs = (submissions || []).filter(
      (s) => new Date(s.created_at) >= weekStart
    );
    setWeeklyData(buildLeaderboard(weeklySubs, streakMap, bestStreakMap));
  };

  // Active dataset reflects selected tab
  const activeData = tab === "weekly" ? weeklyData : data;

  // Rank query searches whichever tab is active
  const normalizedQuery = normalizeUsername(rankQuery);
  const rankResult = normalizedQuery
    ? (() => {
        const idx = activeData.findIndex(
          (item) => normalizeUsername(item.username) === normalizedQuery
        );
        if (idx === -1) return null;
        return { rank: idx + 1, ...activeData[idx] };
      })()
    : undefined;

  return (
    <div className="min-h-screen bg-[#060e07] text-white p-8">
      <style>{`
        @keyframes cardHover { to { box-shadow: 0 0 24px rgba(74,222,128,0.18); } }
        .lb-card:hover { transform: translateY(-1px); box-shadow: 0 0 24px rgba(74,222,128,0.14); transition: all 0.2s; }
      `}</style>
      <h1 className="text-4xl mb-2 text-green-400">
        🌱 Proof of Grass Leaderboard
      </h1>
      <p className="font-mono text-[10px] text-green-800 tracking-widest uppercase mb-4">
        streaks reset at 00:00 UTC
      </p>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {["alltime", "weekly"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-mono text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-sm border transition-all duration-200 ${
              tab === t
                ? "bg-[#4ade80] text-[#07110a] border-[#4ade80] font-bold"
                : "border-green-900 text-green-700 hover:border-green-600 hover:text-green-500"
            }`}
          >
            {t === "alltime" ? "All Time" : "This Week"}
          </button>
        ))}
      </div>

      {/* Your Rank lookup */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-green-900" />
          <span className="text-[10px] font-mono tracking-[0.3em] text-green-700 uppercase">
            Your Rank
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-green-900" />
        </div>

        <div className="relative rounded-xl border border-green-900 bg-black/50 px-5 py-4">
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#4ade80] opacity-20 rounded-tl-xl" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#4ade80] opacity-20 rounded-tr-xl" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#4ade80] opacity-20 rounded-bl-xl" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#4ade80] opacity-20 rounded-br-xl" />

          <input
            type="text"
            value={rankQuery}
            onChange={(e) => setRankQuery(normalizeUsername(e.target.value))}
            placeholder="enter your username"
            className="
              w-full bg-transparent border-b border-green-900
              text-green-300 font-mono text-sm
              pb-2 mb-4
              placeholder:text-green-900
              focus:outline-none focus:border-[#4ade80]
              transition-colors duration-200
            "
          />

          {/* Not searched yet */}
          {rankResult === undefined && (
            <p className="font-mono text-xs text-green-800">
              type your username to see where you stand.
            </p>
          )}

          {/* Not found */}
          {rankResult === null && (
            <p className="font-mono text-xs text-green-700">
              you're not ranked yet. submit your proof of grass to join the leaderboard.
            </p>
          )}

          {/* Found */}
          {rankResult && (
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-green-700 uppercase mb-1">Your Rank</p>
                <p className="font-mono text-2xl font-bold text-[#4ade80]">#{rankResult.rank}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-widest text-green-700 uppercase mb-1">Posts</p>
                <p className="font-mono text-2xl font-bold text-[#4ade80]">{rankResult.count}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-widest text-green-700 uppercase mb-1">Streak</p>
                <p className="font-mono text-2xl font-bold text-[#4ade80]">
                  🔥 {rankResult.current_streak} day{rankResult.current_streak !== 1 ? "s" : ""}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-widest text-green-700 uppercase mb-1">Best</p>
                <p className="font-mono text-2xl font-bold text-[#4ade80]">
                  🏆 {rankResult.best_streak} day{rankResult.best_streak !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full leaderboard */}
      <div className="space-y-3">
        {activeData.length === 0 && (
          <p className="font-mono text-xs text-green-900 text-center py-8">
            {tab === "weekly" ? "no activity this week yet" : "no entries yet"}
          </p>
        )}
        {activeData.map((item, index) => {
          const isFirst = index === 0;
          // Rank movement: "new" for weekly tab entries not in all-time top, else "same" placeholder
          // Full historical tracking would require a backend snapshot — UI-ready for future wiring
          const movement = item.movement ?? null;

          return (
            <div
              key={item.username}
              className={`lb-card relative p-4 rounded-xl overflow-hidden transition-all duration-200 cursor-default
                ${isFirst
                  ? "border-2 border-[#4ade80] bg-[#0a1f0c] shadow-[0_0_32px_rgba(74,222,128,0.25)]"
                  : "border border-green-900 bg-[#07110a] hover:border-green-700"
                }
              `}
            >
              {/* #1 crown banner */}
              {isFirst && (
                <div className="absolute top-0 right-0 bg-[#4ade80] text-[#0a1f0c] font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-bl-lg">
                  👑 Top Toucher
                </div>
              )}

              {/* Rank movement badge — UI-ready, populated when movement data exists */}
              {movement === "up" && (
                <span className="absolute top-2 left-2 font-mono text-[9px] text-[#4ade80]">↑</span>
              )}
              {movement === "down" && (
                <span className="absolute top-2 left-2 font-mono text-[9px] text-[#ef4444]">↓</span>
              )}
              {movement === "new" && (
                <span className="absolute top-2 left-2 font-mono text-[9px] text-[#f59e0b]">new</span>
              )}

              {/* Main row */}
              <p className={`font-bold font-mono ${isFirst ? "text-[#4ade80] text-lg" : "text-green-400"}`}>
                {isFirst ? "🥇" : `#${index + 1}`}{" "}
                @{item.username}
                <span className={`font-normal ${isFirst ? "text-[#86efac]" : "text-green-700"}`}>
                  {" "}— {item.count} post{item.count !== 1 ? "s" : ""}
                </span>
                <span className={`font-normal ${isFirst ? "text-[#4ade80]" : "text-green-600"}`}>
                  {" "}— 🔥 {item.current_streak} day{item.current_streak !== 1 ? "s" : ""} streak
                </span>
              </p>

              <a
                href={item.tweet_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline text-sm mt-1 inline-block ${isFirst ? "text-[#4ade80] font-semibold" : "text-blue-400"}`}
              >
                View Latest Post
              </a>

              <p className={`text-xs mt-2 ${isFirst ? "text-[#86efac] opacity-60" : "text-green-900"}`}>
                Last post: {formatRelativeTime(item.created_at)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}