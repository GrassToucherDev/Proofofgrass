import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

function normalizeUsername(val) {
  return val.replace(/@/g, "").toLowerCase().trim();
}

export default function Leaderboard() {
  const [data, setData] = useState([]);
  const [rankQuery, setRankQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [
      { data: submissions, error: subError },
      { data: streaks, error: strError },
    ] = await Promise.all([
      supabase.from("Submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("Streaks").select("username, current_streak, last_submission_date"),
    ]);

    if (subError) { console.error(subError); return; }
    if (strError) { console.error(strError); }

    // Build streak lookup — default to 1 if not in Streaks table
    const streakMap = {};
    (streaks || []).forEach((s) => {
      streakMap[s.username] = s.current_streak;
    });

    // Group submissions by username
    const grouped = {};
    (submissions || []).forEach((item) => {
      if (!grouped[item.username]) {
        grouped[item.username] = {
          username: item.username,
          count: 0,
          tweet_url: item.tweet_url,
          created_at: item.created_at,
        };
      }
      grouped[item.username].count += 1;
      if (new Date(item.created_at) > new Date(grouped[item.username].created_at)) {
        grouped[item.username].tweet_url = item.tweet_url;
        grouped[item.username].created_at = item.created_at;
      }
    });

    // Merge + sort by post count descending
    const leaderboard = Object.values(grouped)
      .map((entry) => ({
        ...entry,
        current_streak: streakMap[entry.username] ?? 1,
      }))
      .sort((a, b) => b.count - a.count);

    setData(leaderboard);
  };

  // Derive rank result from existing data — no extra query needed
  const normalizedQuery = normalizeUsername(rankQuery);
  const rankResult = normalizedQuery
    ? (() => {
        const idx = data.findIndex(
          (item) => normalizeUsername(item.username) === normalizedQuery
        );
        if (idx === -1) return null;
        return { rank: idx + 1, ...data[idx] };
      })()
    : undefined; // undefined = no query yet, null = not found

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl mb-6 text-green-400">
        🌱 Proof of Grass Leaderboard
      </h1>

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
            </div>
          )}
        </div>
      </div>

      {/* Full leaderboard */}
      <div className="space-y-4">
        {data.map((item, index) => {
          const isFirst = index === 0;

          return (
            <div
              key={item.username}
              className={`
                relative p-4 rounded-xl overflow-hidden transition-all duration-300
                ${isFirst
                  ? "border-2 border-[#4ade80] bg-[#0a1f0c] shadow-[0_0_32px_rgba(74,222,128,0.25)]"
                  : "border border-green-800 bg-black/50"
                }
              `}
            >
              {/* #1 crown banner */}
              {isFirst && (
                <div className="absolute top-0 right-0 bg-[#4ade80] text-[#0a1f0c] font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-bl-lg">
                  👑 Top Toucher
                </div>
              )}

              {/* Main row: #rank @username — X posts — 🔥 Y day streak */}
              <p className={`font-bold font-mono ${isFirst ? "text-[#4ade80] text-lg" : "text-green-400"}`}>
                {isFirst ? "🥇" : `#${index + 1}`}{" "}
                {item.username}
                <span className={`font-normal ${isFirst ? "text-[#86efac]" : "text-green-600"}`}>
                  {" "}— {item.count} post{item.count !== 1 ? "s" : ""}
                </span>
                <span className={`font-normal ${isFirst ? "text-[#4ade80]" : "text-green-500"}`}>
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

              <p className={`text-sm mt-2 ${isFirst ? "text-[#86efac] opacity-70" : "text-gray-400"}`}>
                Last post: {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}