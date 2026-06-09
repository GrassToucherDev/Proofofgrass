import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchSuggestedTouchers } from "../hooks/useFollow";
import FollowButton from "./FollowButton";
import { supabase } from "../utils/supabase";

const T = {
  bg2: "#0e100b", bg3: "#141710", bg4: "#1a1e13",
  border: "rgba(255,255,255,0.055)", borderG: "rgba(147,168,90,0.2)",
  olive: "#93a85a", gold: "#c8a84b",
  white: "#f0efea", muted: "rgba(240,239,234,0.52)", dim: "rgba(240,239,234,0.24)",
};

function getTierColor(streak) {
  if (streak >= 100) return "#f97316";
  if (streak >= 50)  return "#c8a84b";
  if (streak >= 30)  return "#a78bfa";
  if (streak >= 14)  return "#93a85a";
  if (streak >= 7)   return "#b8c87a";
  return T.dim;
}

export default function SuggestedTouchers({ viewerUsername, currentStreak }) {
  const [suggestions, setSuggestions] = useState([]);
  const [followed,    setFollowed]    = useState(new Set());
  const [loading,     setLoading]     = useState(true);
  const [dismissed,   setDismissed]   = useState(false);

  useEffect(() => {
    if (!viewerUsername || dismissed) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const results = await fetchSuggestedTouchers(viewerUsername, currentStreak ?? 0, 5);
      if (!cancelled) { setSuggestions(results); setLoading(false); }
      return () => { cancelled = true; };
    })();
  }, [viewerUsername, currentStreak, dismissed]);

  const handleFollow = async (username) => {
    setFollowed(prev => new Set([...prev, username]));
    try {
      await supabase.from("follows").insert([{
        follower_username: viewerUsername,
        following_username: username,
      }]);
    } catch (e) {
      setFollowed(prev => { const n = new Set(prev); n.delete(username); return n; });
    }
  };

  if (dismissed || (!loading && suggestions.length === 0)) return null;

  return (
    <div style={{
      background: T.bg2, border: `1px solid ${T.borderG}`,
      borderRadius: 14, padding: "18px 20px", marginBottom: 14,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
          textTransform: "uppercase", color: "rgba(147,168,90,0.45)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ color: T.olive, fontSize: 8 }}>✦</span>
          Suggested Touchers
        </div>
        <button onClick={() => setDismissed(true)} style={{
          background: "transparent", border: "none", color: T.dim,
          fontSize: 11, cursor: "pointer", padding: "2px 4px",
        }}>✕</button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              height: 48, borderRadius: 8, background: T.bg3,
              animation: "shimmer 1.8s ease-in-out infinite",
            }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {suggestions.map((u, i) => {
            const isFollowed = followed.has(u.username);
            const col = getTierColor(u.current_streak ?? 0);
            return (
              <div key={u.username} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
                borderBottom: i < suggestions.length - 1
                  ? `1px solid ${T.border}` : "none",
              }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: `${col}18`, border: `2px solid ${col}45`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 700, color: col,
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                }}>
                  {u.username[0]?.toUpperCase()}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/u/${u.username}`} style={{
                    fontSize: 13, fontWeight: 700, color: T.white, textDecoration: "none",
                    display: "block", marginBottom: 3,
                  }}>
                    @{u.username}
                  </Link>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: col,
                    background: `${col}12`, border: `1px solid ${col}30`,
                    borderRadius: 20, padding: "2px 8px",
                  }}>
                    🔥 Day {u.current_streak ?? 0}
                  </span>
                </div>
                {/* Follow */}
                {!isFollowed ? (
                  <FollowButton
                    isFollowing={false}
                    username={u.username}
                    onToggle={() => handleFollow(u.username)}
                    size="sm"
                    showConfirm={false}
                  />
                ) : (
                  <span style={{
                    fontSize: 11, color: T.olive, fontWeight: 600,
                  }}>Following ✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}