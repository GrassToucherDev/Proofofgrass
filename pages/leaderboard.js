import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

function normalizeUsername(val) {
  return String(val ?? "").replace(/@/g, "").toLowerCase().trim();
}

function getTopPercent(streak) {
  if (streak >= 30) return 1;
  if (streak >= 14) return 5;
  if (streak >= 7)  return 10;
  return null;
}

function getStreakTier(streak) {
  if (streak >= 365) return { label: "ETERNAL",   color: "#fff9c4", bg: "#1a1800", border: "#a08000" };
  if (streak >= 180) return { label: "MYTHIC",    color: "#fbbf24", bg: "#1a1100", border: "#92400e" };
  if (streak >= 100) return { label: "IMMORTAL",  color: "#f97316", bg: "#1a0e06", border: "#7c2d12" };
  if (streak >= 50)  return { label: "LEGENDARY", color: "#ffd700", bg: "#1a1200", border: "#7a5c00" };
  if (streak >= 30)  return { label: "ELITE",     color: "#c084fc", bg: "#140d1f", border: "#6d28d9" };
  if (streak >= 14)  return { label: "LOCKED IN", color: "#4ade80", bg: "#0a1f0c", border: "#166534" };
  if (streak >= 7)   return { label: "ROOTED",    color: "#86efac", bg: "#071209", border: "#1f4020" };
  if (streak >= 3)   return { label: "GROWING",   color: "#6ee7b7", bg: "#05110a", border: "#1a3520" };
  return null;
}

function getNextTier(streak) {
  const tiers = [3, 7, 14, 30, 50, 100, 180, 365];
  const next = tiers.find(t => streak < t);
  if (!next) return null; // already at max (365+)
  return { days: next, remaining: next - streak };
}

function getRankMedal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
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

  // Build leaderboard from Streaks as the source of truth.
  // Submissions are used only for counting and recency — users appear
  // regardless of submission status (pending or approved).
  function buildLeaderboard(streaks, submissionCountMap, submissionDateMap, filterFn) {
    return (streaks || [])
      .filter(s => normalizeUsername(s.username)) // skip blank usernames
      .filter(filterFn ?? (() => true))
      .map((s) => {
        const u = normalizeUsername(s.username);
        return {
          username: u,
          current_streak: s.current_streak ?? 1,
          best_streak: s.best_streak ?? s.current_streak ?? 1,
          count: submissionCountMap[u] ?? 0,
          created_at: submissionDateMap[u] ?? s.last_submission_date ?? new Date(0).toISOString(),
        };
      })
      .sort((a, b) => {
        if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
        if (b.count !== a.count) return b.count - a.count;
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }

  const fetchData = async () => {
    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);

    const [
      { data: streaks, error: strError },
      { data: submissions, error: subError },
    ] = await Promise.all([
      // Streaks is the source of truth — all users with any streak appear
      supabase.from("Streaks").select("username, current_streak, best_streak, last_submission_date"),
      // Submissions used for counts and recency only — include pending + approved
      supabase.from("Submissions").select("username, created_at").in("status", ["pending", "approved"]).order("created_at", { ascending: false }),
    ]);

    if (strError) { console.error(strError); return; }
    if (subError) { console.error(subError); }

    // Build submission count + most-recent-date maps
    const submissionCountMap = {};
    const submissionDateMap = {};
    const weeklyUsersSet = new Set();

    (submissions || []).forEach((item) => {
      const u = normalizeUsername(item.username);
      if (!u) return;
      submissionCountMap[u] = (submissionCountMap[u] ?? 0) + 1;
      if (!submissionDateMap[u] || new Date(item.created_at) > new Date(submissionDateMap[u])) {
        submissionDateMap[u] = item.created_at;
      }
      if (new Date(item.created_at) >= weekStart) {
        weeklyUsersSet.add(u);
      }
    });

    // All-time: every user in Streaks
    setData(buildLeaderboard(streaks, submissionCountMap, submissionDateMap));

    // Weekly: only users who submitted in the last 7 days
    setWeeklyData(buildLeaderboard(
      streaks,
      submissionCountMap,
      submissionDateMap,
      (s) => weeklyUsersSet.has(normalizeUsername(s.username))
    ));
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl text-green-400">
          🌱 Proof of Grass Leaderboard
        </h1>
        <a
          href="/"
          className="font-mono text-[11px] tracking-widest uppercase text-green-700 hover:text-green-400 transition-colors duration-200"
        >
          ← Back to App
        </a>
      </div>
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

      {/* Full leaderboard — responsive grid of square cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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

          const tier = getStreakTier(item.current_streak);
          const medal = getRankMedal(index);
          // Progress bar: scale to 365 days max
          const nextTier = getNextTier(item.current_streak);
          // Bar fills between current tier threshold and next tier threshold
          const tierThresholds = [0, 3, 7, 14, 30, 50, 100, 180, 365];
          const prevThresh = [...tierThresholds].reverse().find(t => item.current_streak >= t) ?? 0;
          const nextThresh = nextTier?.days ?? 365;
          const rangeSize = nextThresh - prevThresh;
          const streakBarFill = rangeSize > 0
            ? Math.min(100, Math.round(((item.current_streak - prevThresh) / rangeSize) * 100))
            : 100;
          const barLabel = !nextTier
            ? "✦ eternal"
            : `${nextTier.remaining}d to ${getStreakTier(nextTier.days)?.label ?? "next tier"}`;

          return (
            <div
              key={item.username}
              className="lb-card relative flex flex-col overflow-hidden transition-all duration-200 cursor-default rounded-xl"
              style={{
                background: tier ? tier.bg : "#07110a",
                border: `1px solid ${isFirst ? "#4ade80" : (tier ? tier.border : "#14401a")}`,
                boxShadow: isFirst ? "0 0 28px rgba(74,222,128,0.22)" :
                           item.current_streak >= 100 ? "0 0 20px rgba(249,115,22,0.14)" :
                           item.current_streak >= 50  ? "0 0 18px rgba(255,215,0,0.12)" :
                           item.current_streak >= 30  ? "0 0 14px rgba(192,132,252,0.1)" : "none",
                minHeight: "180px",
              }}
            >
              {/* Top accent line */}
              <div className="w-full h-0.5 flex-shrink-0" style={{
                background: tier
                  ? `linear-gradient(90deg, transparent, ${tier.color}, transparent)`
                  : "transparent",
                opacity: 0.55,
              }} />

              {/* Card body */}
              <div className="flex flex-col flex-1 p-3 gap-1.5">

                {/* Rank + tier row */}
                <div className="flex items-center justify-between gap-1">
                  {/* Rank — bright, always legible */}
                  <span className="font-mono font-bold text-sm leading-none"
                    style={{ color: tier ? tier.color : "#4ade80", textShadow: tier ? `0 0 8px ${tier.color}90` : "0 0 8px rgba(74,222,128,0.7)" }}>
                    {medal ?? `#${index + 1}`}
                  </span>
                  {/* Tier badge — white text on semi-transparent dark bg so it always reads */}
                  {tier && (
                    <span
                      className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
                      style={{
                        color: "#ffffff",
                        border: `1px solid ${tier.color}`,
                        background: `${tier.color}28`,
                        textShadow: `0 0 6px ${tier.color}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tier.label}
                    </span>
                  )}
                </div>

                {/* Username — enlarged, bright white */}
                <p className="font-mono font-bold text-sm text-white truncate"
                  style={{ textShadow: "0 0 12px rgba(255,255,255,0.15)" }}>
                  @{item.username}
                </p>

                {/* Streak — hero number */}
                <div className="flex items-baseline gap-1 mt-auto">
                  <span
                    className="font-mono font-black text-2xl leading-none"
                    style={{
                      color: tier ? tier.color : "#4ade80",
                      textShadow: tier ? `0 0 18px ${tier.color}` : "0 0 18px rgba(74,222,128,0.8)",
                    }}
                  >
                    🔥 {item.current_streak}
                  </span>
                  <span className="font-mono text-[11px] text-green-500 font-semibold">
                    day{item.current_streak !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Progress bar — always-visible track + colored fill */}
                <div className="mt-1.5 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.10)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${streakBarFill}%`,
                      background: tier
                        ? `linear-gradient(90deg, ${tier.color}90, ${tier.color})`
                        : "linear-gradient(90deg, rgba(74,222,128,0.6), #4ade80)",
                      boxShadow: tier ? `0 0 6px ${tier.color}80` : "0 0 6px rgba(74,222,128,0.6)",
                    }}
                  />
                </div>
                {/* Bar label — clearly readable */}
                <p className="font-mono text-[9px] text-green-400 truncate">{barLabel}</p>

                {/* Top % badge */}
                {getTopPercent(item.current_streak) !== null && (
                  <span
                    className="self-start font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm mt-0.5"
                    style={{
                      color: "#ffffff",
                      border: `1px solid ${tier ? tier.color : "#4ade80"}`,
                      background: `${tier ? tier.color : "#4ade80"}20`,
                    }}
                  >
                    ✦ top {getTopPercent(item.current_streak)}%
                  </span>
                )}
              </div>

              {/* Crown — absolute, small */}
              {isFirst && (
                <div className="absolute top-0 right-0 bg-[#4ade80] text-[#0a1f0c] font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-bl-lg">
                  👑
                </div>
              )}

              {/* Rank movement */}
              {movement === "up"   && <span className="absolute bottom-1.5 right-2 font-mono text-[8px] text-[#4ade80]">↑</span>}
              {movement === "down" && <span className="absolute bottom-1.5 right-2 font-mono text-[8px] text-[#ef4444]">↓</span>}
              {movement === "new"  && <span className="absolute bottom-1.5 right-2 font-mono text-[8px] text-[#f59e0b]">new</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}