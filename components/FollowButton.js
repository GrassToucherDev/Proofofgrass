import { useState } from "react";

const T = {
  bg: "#080a06", bg2: "#0e100b", bg3: "#141710",
  border: "rgba(255,255,255,0.055)", borderG: "rgba(147,168,90,0.2)",
  olive: "#93a85a", gold: "#c8a84b",
  white: "#f0efea", dim: "rgba(240,239,234,0.24)", muted: "rgba(240,239,234,0.52)",
};

// ── Unfollow confirmation sheet ───────────────────────────────────────────────
function UnfollowSheet({ username, onConfirm, onCancel }) {
  return (
    <>
      <div onClick={onCancel} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)", zIndex: 9990,
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9991,
        background: T.bg2, borderRadius: "18px 18px 0 0",
        border: `1px solid ${T.border}`,
        padding: `24px 24px calc(28px + env(safe-area-inset-bottom, 0px))`,
        textAlign: "center",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.55)",
      }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 6,
        }}>Unfollow @{username}?</div>
        <div style={{
          fontSize: 12, color: T.dim, lineHeight: 1.6, marginBottom: 24,
        }}>
          You'll stop seeing their activity in your Following feed.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "13px 0", background: "transparent",
            border: `1px solid ${T.border}`, borderRadius: 10,
            fontSize: 13, fontWeight: 600, color: T.muted, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "13px 0",
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.35)", borderRadius: 10,
            fontSize: 13, fontWeight: 700, color: "#f87171", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Unfollow</button>
        </div>
      </div>
    </>
  );
}

// ── Main FollowButton ─────────────────────────────────────────────────────────
export default function FollowButton({
  isFollowing,
  username,
  onToggle,
  size = "md",        // "sm" | "md" | "lg"
  showConfirm = true, // show unfollow confirmation sheet
  style = {},
}) {
  const [confirming, setConfirming] = useState(false);

  const sizes = {
    sm: { padding: "5px 12px", fontSize: 11, borderRadius: 7, gap: 4 },
    md: { padding: "9px 18px", fontSize: 12, borderRadius: 8, gap: 5 },
    lg: { padding: "11px 22px", fontSize: 13, borderRadius: 9, gap: 6 },
  };
  const sz = sizes[size] || sizes.md;

  const handleClick = () => {
    if (isFollowing && showConfirm) {
      setConfirming(true);
    } else {
      onToggle?.();
    }
  };

  const handleConfirm = () => {
    setConfirming(false);
    onToggle?.();
  };

  return (
    <>
      <button onClick={handleClick} style={{
        display: "inline-flex", alignItems: "center", gap: sz.gap,
        padding: sz.padding, borderRadius: sz.borderRadius,
        fontSize: sz.fontSize, fontWeight: 700, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em",
        transition: "all 0.18s",
        ...(isFollowing ? {
          background: `${T.olive}14`,
          border: `1px solid ${T.olive}45`,
          color: T.olive,
        } : {
          background: T.olive,
          border: "none",
          color: T.bg,
        }),
        ...style,
      }}>
        {isFollowing ? "Following ✓" : "+ Follow"}
      </button>

      {confirming && (
        <UnfollowSheet
          username={username}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}