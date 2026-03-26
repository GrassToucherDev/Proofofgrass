import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

function normalizeUsername(val) {
  return String(val ?? "")
    .replace(/@/g, "")
    .toLowerCase()
    .trim();
}

export default function StreakFeed() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeed() {
      try {
        // Fetch latest 20 submissions and all streak rows in parallel
        const [{ data: subs, error: subError }, { data: streaks, error: strError }] =
          await Promise.all([
            supabase
              .from("Submissions")
              .select("username, created_at")
              .order("created_at", { ascending: false })
              .limit(20),
            supabase
              .from("Streaks")
              .select("username, current_streak"),
          ]);

        if (subError) throw subError;
        if (strError) console.error(strError);

        // Build a lookup map: username → current_streak
        const streakMap = {};
        (streaks || []).forEach((s) => {
          const normalized = normalizeUsername(s.username);
          if (normalized) streakMap[normalized] = s.current_streak;
        });

        // Deduplicate submissions — keep only the most recent row per username
        const seen = new Set();
        const deduped = (subs || []).filter((row) => {
          const norm = normalizeUsername(row.username);
          if (!norm || seen.has(norm)) return false;
          seen.add(norm);
          return true;
        });

        // Merge real streak value into each entry
        setEntries(deduped.map((row) => {
          const normalized = normalizeUsername(row.username);
          return {
            username: normalized,
            created_at: row.created_at,
            current_streak: streakMap[normalized] ?? null,
          };
        }));
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    fetchFeed();
  }, []);

  return (
    <div className="w-full max-w-md">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1f3d22]" />
        <span className="text-[10px] font-mono tracking-[0.3em] text-[#3a5e3d] uppercase">
          Live Activity
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1f3d22]" />
      </div>

      {loading ? (
        <p className="font-mono text-[11px] text-[#2a4a2d] tracking-wide text-center py-4 animate-pulse">
          loading activity…
        </p>
      ) : entries.length === 0 ? (
        <p className="font-mono text-[11px] text-[#2a4a2d] tracking-wide text-center py-4">
          no grass touched yet
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <div
              key={entry.username}
              className="
                px-4 py-2.5 rounded-sm
                border border-[#1a3520] bg-[#0a140b]
                font-mono text-[11px] text-[#4ade80] tracking-wide
                transition-all duration-200
                hover:border-[#2d5e30] hover:shadow-[0_0_12px_rgba(74,222,128,0.1)]
              "
            >
              {(!entry.current_streak || entry.current_streak <= 1)
                ? `@${entry.username} started their streak 🌱`
                : `@${entry.username} hit day ${entry.current_streak} 🔥`
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}