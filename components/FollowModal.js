import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";
import FollowButton from "./FollowButton";

const T = {
  bg: "#080a06", bg2: "#0e100b", bg3: "#141710", bg4: "#1a1e13",
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

function Avatar({ username, size = 40 }) {
  const col = T.olive;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${col}18`, border: `2px solid ${col}50`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 700, color: col,
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    }}>
      {username[0]?.toUpperCase()}
    </div>
  );
}

// ── UserRow inside modal ──────────────────────────────────────────────────────
function ModalUserRow({ user, viewerUsername, mode, onFollowChange, last }) {
  const [following, setFollowing] = useState(user.isFollowing ?? false);
  const tierColor = getTierColor(user.current_streak ?? 0);
  const isOwn = user.username === viewerUsername;

  const handleToggle = async () => {
    const wasFollowing = following;
    setFollowing(!wasFollowing); // optimistic
    onFollowChange?.(user.username, !wasFollowing);
    try {
      if (wasFollowing) {
        await supabase.from("follows").delete()
          .eq("follower_username", viewerUsername)
          .eq("following_username", user.username);
      } else {
        await supabase.from("follows").insert([{
          follower_username: viewerUsername,
          following_username: user.username,
        }]);
      }
    } catch (e) {
      setFollowing(wasFollowing); // rollback
      onFollowChange?.(user.username, wasFollowing);
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
      borderBottom: last ? "none" : `1px solid ${T.border}`,
    }}>
      <Avatar username={user.username} size={42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 3 }}>
          @{user.username}
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 10, fontWeight: 700, color: tierColor,
          background: `${tierColor}12`, border: `1px solid ${tierColor}30`,
          borderRadius: 20, padding: "2px 8px",
        }}>
          🔥 Day {user.current_streak ?? 0}
        </span>
      </div>
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0 }}>
        {!isOwn && viewerUsername && mode === "following" && (
          <FollowButton
            isFollowing={following}
            username={user.username}
            onToggle={handleToggle}
            size="sm"
          />
        )}
        <Link href={`/u/${user.username}`} style={{
          fontSize: 10, color: T.dim, textDecoration: "none",
          border: `1px solid ${T.border}`, borderRadius: 7,
          padding: "5px 10px", flexShrink: 0,
        }}>View →</Link>
      </div>
    </div>
  );
}

// ── Main FollowModal ──────────────────────────────────────────────────────────
export default function FollowModal({
  mode,             // "followers" | "following"
  username,         // whose followers/following to show
  viewerUsername,   // logged-in viewer
  count,
  onClose,
  onFollowChange,
}) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Get the usernames
        const field = mode === "followers" ? "follower_username" : "following_username";
        const match = mode === "followers" ? "following_username" : "follower_username";

        const { data: followRows } = await supabase
          .from("follows")
          .select(field)
          .eq(match, username)
          .order("created_at", { ascending: false })
          .limit(100);

        const usernames = (followRows ?? []).map(r => r[field]);
        if (usernames.length === 0) {
          if (!cancelled) { setUsers([]); setLoading(false); }
          return;
        }

        // Fetch streak data for those users
        const { data: streakRows } = await supabase
          .from("Streaks")
          .select("username, current_streak")
          .in("username", usernames);

        const streakMap = {};
        (streakRows ?? []).forEach(s => { streakMap[s.username] = s.current_streak; });

        // Check which ones the viewer already follows
        let followingSet = new Set();
        if (viewerUsername) {
          const { data: myFollows } = await supabase
            .from("follows")
            .select("following_username")
            .eq("follower_username", viewerUsername)
            .in("following_username", usernames);
          (myFollows ?? []).forEach(f => followingSet.add(f.following_username));
        }

        const result = usernames.map(u => ({
          username: u,
          current_streak: streakMap[u] ?? 0,
          isFollowing: followingSet.has(u),
        })).sort((a, b) => (b.current_streak ?? 0) - (a.current_streak ?? 0));

        if (!cancelled) { setUsers(result); setLoading(false); }
      } catch (e) {
        console.warn("[FollowModal] error:", e?.message);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [mode, username, viewerUsername]);

  const title = mode === "followers"
    ? `Followers · ${count ?? users.length}`
    : `Following · ${count ?? users.length}`;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)", zIndex: 9980,
      }} />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9981,
        background: T.bg2, borderRadius: "18px 18px 0 0",
        border: `1px solid ${T.borderG}`, borderBottom: "none",
        padding: `0 0 calc(20px + env(safe-area-inset-bottom, 0px))`,
        maxHeight: "80vh", display: "flex", flexDirection: "column",
        boxShadow: "0 -24px 60px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 20px 16px",
          borderBottom: `1px solid ${T.border}`,
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 20, fontWeight: 700, color: T.white,
          }}>{title}</h2>
          <button onClick={onClose} style={{
            background: "transparent", border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "5px 10px", color: T.dim,
            fontSize: 13, cursor: "pointer",
          }}>✕</button>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 20px" }}>
          {loading ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: T.dim, fontSize: 13 }}>
              Loading…
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: T.dim, fontSize: 13 }}>
              {mode === "followers" ? "No followers yet." : "Not following anyone yet."}
            </div>
          ) : (
            users.map((u, i) => (
              <ModalUserRow
                key={u.username}
                user={u}
                viewerUsername={viewerUsername}
                mode={mode}
                onFollowChange={onFollowChange}
                last={i === users.length - 1}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}