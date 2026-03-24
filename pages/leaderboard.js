import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function Leaderboard() {
  const [data, setData] = useState([]);

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

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl mb-6 text-green-400">
        🌱 Proof of Grass Leaderboard
      </h1>

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
  