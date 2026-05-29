import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      "#0e0f0b",
  bg2:     "#141510",
  bg3:     "#1c1e17",
  border:  "rgba(255,255,255,0.07)",
  borderG: "rgba(147,168,90,0.2)",
  olive:   "#93a85a",
  gold:    "#c8a84b",
  white:   "#f0efea",
  muted:   "rgba(240,239,234,0.50)",
  dim:     "rgba(240,239,234,0.24)",
};

function normalizeUsername(u) {
  return String(u ?? "").replace(/@/g, "").toLowerCase().trim();
}

function getStreakTier(streak) {
  if (streak >= 180) return "MYTHIC";
  if (streak >= 100) return "IMMORTAL";
  if (streak >= 50)  return "LEGENDARY";
  if (streak >= 30)  return "HEROIC";
  if (streak >= 14)  return "ROOTED";
  if (streak >= 7)   return "GROWING";
  return "SEED";
}

function getTierColor(tier) {
  return {
    MYTHIC: "#f5c842", IMMORTAL: "#f97316", LEGENDARY: "#c8a84b",
    HEROIC: "#b08050", ROOTED: "#93a85a", GROWING: "#6a8c3a", SEED: "#4a6a2a",
  }[tier] || T.olive;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, sub, accent, last }) {
  return (
    <div style={{
      flex: "1 1 0", minWidth: 0,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "28px 16px", gap: 5,
      borderRight: last ? "none" : `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 16, opacity: 0.45, marginBottom: 2 }}>{icon}</span>
      <span style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700,
        color: accent ? T.gold : T.white, lineHeight: 1, letterSpacing: "-0.02em",
      }}>{value ?? "—"}</span>
      {sub && <span style={{ fontSize: 11, color: T.olive, fontWeight: 600 }}>{sub}</span>}
      <span style={{ fontSize: 10, color: T.dim, letterSpacing: "0.14em", textTransform: "uppercase", textAlign: "center", marginTop: 2 }}>{label}</span>
    </div>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ name, day, active, completed }) {
  const col = completed ? T.olive : active ? T.gold : "rgba(255,255,255,0.14)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 58, height: 58, borderRadius: "50%",
        border: `1.5px solid ${col}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? `${T.gold}18` : completed ? `${T.olive}12` : "transparent",
        boxShadow: active ? `0 0 18px ${T.gold}28` : "none",
      }}>
        <span style={{ fontSize: 22 }}>{completed ? "✦" : active ? "◎" : "○"}</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: col, letterSpacing: "0.12em", textTransform: "uppercase" }}>{name}</div>
        <div style={{ fontSize: 10, color: T.dim }}>Day {day}</div>
      </div>
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────
function LBRow({ rank, username, streak, tier }) {
  const col = getTierColor(tier);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 0", borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 11, color: T.dim, width: 18, flexShrink: 0, textAlign: "right" }}>{rank}</span>
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        background: `linear-gradient(135deg, ${T.bg3}, ${T.olive}30)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, flexShrink: 0, border: `1px solid ${T.border}`,
        fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700,
        color: T.muted,
      }}>
        {username?.[0]?.toUpperCase() ?? "?"}
      </div>
      <span style={{ flex: 1, fontSize: 13, color: T.white, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        @{username}
      </span>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.white, fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1 }}>{streak}d</div>
        <div style={{ fontSize: 9, color: col, letterSpacing: "0.1em", textTransform: "uppercase" }}>{tier}</div>
      </div>
    </div>
  );
}

// ─── Recent proof card ────────────────────────────────────────────────────────
function ProofCard({ username, streak, created_at }) {
  const tier = getStreakTier(streak);
  const col  = getTierColor(tier);
  const when = created_at ? new Date(created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 0", borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg, #2a3d1a, #3d6a28)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, border: `1px solid ${T.border}`,
      }}>🌿</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{username}</div>
        <div style={{ fontSize: 10, color: T.dim }}>{when}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 9, color: T.dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>DAY</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: streak >= 50 ? T.gold : T.white, fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1 }}>{streak}</div>
        <div style={{ fontSize: 8, color: col, letterSpacing: "0.08em", textTransform: "uppercase" }}>{tier}</div>
      </div>
    </div>
  );
}

// ─── Result card mini preview ─────────────────────────────────────────────────
function ResultCardPreview({ day }) {
  const isLegendary = day >= 50;
  return (
    <div style={{
      borderRadius: 12, overflow: "hidden", aspectRatio: "16/9",
      position: "relative", background: "#0a1f0c",
      border: `1px solid ${T.borderG}`,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, #2a3d1a 0%, #3d5a2a 40%, #1a2d12 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 48, opacity: 0.4,
      }}>🌿</div>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "55%", background: "linear-gradient(90deg, transparent, rgba(8,10,6,0.97))" }} />
      <div style={{
        position: "absolute", right: 12, top: 10, bottom: 10, width: "44%",
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        <div style={{ fontSize: 5, letterSpacing: "0.2em", color: "rgba(147,168,90,0.65)", textTransform: "uppercase", marginBottom: 3 }}>✦ OFFICIAL CERTIFICATE ✦</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: T.white, fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1 }}>VERIFIED</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.olive, marginBottom: 6 }}>GRASS TOUCHER</div>
        <div style={{ height: "0.5px", background: `linear-gradient(90deg, transparent, ${T.olive}50, transparent)`, marginBottom: 6 }} />
        <div style={{ fontSize: 5, letterSpacing: "0.14em", color: "rgba(147,168,90,0.45)", textTransform: "uppercase", marginBottom: 2 }}>CURRENT STREAK</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: isLegendary ? T.gold : T.white, fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1, textShadow: isLegendary ? `0 0 14px ${T.gold}50` : "none" }}>DAY {day}</div>
        <div style={{ marginTop: "auto", fontSize: 5, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>proofofgrass.vercel.app</div>
      </div>
      <div style={{ position: "absolute", bottom: 6, left: 8, fontSize: 6, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>CERTIFIED BY TOUCH GRASS</div>
    </div>
  );
}

// ─── Upload zone ──────────────────────────────────────────────────────────────
function UploadZone({ onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const handle = (file) => { if (file?.type.startsWith("image/")) onFile(file); };
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
      style={{
        border: `1.5px dashed ${dragging ? T.olive : T.borderG}`,
        borderRadius: 12, padding: "32px 20px", textAlign: "center",
        cursor: "pointer", background: dragging ? `${T.olive}0a` : "transparent",
        transition: "all 0.2s",
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 10, opacity: 0.45 }}>↑</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Drag & Drop Image</div>
      <div style={{ fontSize: 11, color: T.dim }}>or click to upload</div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handle(e.target.files?.[0])} />
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  // ── Upload state
  const [caption, setCaption]   = useState("");
  const [preview, setPreview]   = useState(null);

  // ── Live stats
  const [dailyCount,  setDailyCount]  = useState(null);
  const [totalBurned, setTotalBurned] = useState(null);
  const [topStreaker, setTopStreaker]  = useState(null);
  const [totalProofs, setTotalProofs] = useState(null);

  // ── Leaderboard
  const [leaders, setLeaders] = useState([]);

  // ── Recent submissions
  const [recentProofs, setRecentProofs] = useState([]);

  // ── User streak (from localStorage username)
  const [currentStreak, setCurrentStreak] = useState(null);
  const [username,      setUsername]      = useState("");

  // ── Result card preview streaks (top 3 from leaderboard)
  const [previewDays, setPreviewDays] = useState([67, 23, 11]);

  // ── Fetch everything on mount
  useEffect(() => {
    // Restore username from localStorage (same key as main app)
    const stored = typeof window !== "undefined" ? localStorage.getItem("pog_username") : null;
    if (stored) setUsername(stored);

    fetchStats();
    fetchLeaderboard();
    fetchRecentProofs();
  }, []);

  // ── Fetch user streak when username known
  useEffect(() => {
    if (!username) return;
    supabase
      .from("Streaks")
      .select("current_streak, best_streak, shield_count")
      .eq("username", normalizeUsername(username))
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCurrentStreak(data.current_streak ?? 1);
      });
  }, [username]);

  const fetchStats = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
      { count: todayCount },
      { data: streakers },
      { count: burnCount },
      { count: allTime },
    ] = await Promise.all([
      supabase
        .from("Submissions")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "approved"])
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("Streaks")
        .select("username, current_streak")
        .order("current_streak", { ascending: false })
        .limit(1),
      supabase
        .from("ShieldPurchases")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("Submissions")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "approved"]),
    ]);

    setDailyCount(todayCount ?? 0);
    setTotalBurned((burnCount ?? 0) * 50000);
    setTotalProofs(allTime ?? 0);
    if (streakers?.[0]) {
      setTopStreaker({
        username: normalizeUsername(streakers[0].username),
        streak:   streakers[0].current_streak ?? 1,
      });
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from("Streaks")
      .select("username, current_streak, best_streak")
      .order("current_streak", { ascending: false })
      .limit(8);

    if (data) {
      setLeaders(data.map(r => ({
        username: normalizeUsername(r.username),
        streak:   r.current_streak ?? 1,
        tier:     getStreakTier(r.current_streak ?? 1),
      })));
      // Use top 3 streaks for result card previews
      const days = data.slice(0, 3).map(r => r.current_streak ?? 1);
      if (days.length) setPreviewDays(days);
    }
  }, []);

  const fetchRecentProofs = useCallback(async () => {
    const { data } = await supabase
      .from("Submissions")
      .select("username, created_at")
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(6);

    if (data) {
      // For each submission, look up their streak
      const usernames = [...new Set(data.map(r => normalizeUsername(r.username)))];
      const { data: streakRows } = await supabase
        .from("Streaks")
        .select("username, current_streak")
        .in("username", usernames);

      const streakMap = {};
      (streakRows ?? []).forEach(s => { streakMap[normalizeUsername(s.username)] = s.current_streak ?? 1; });

      setRecentProofs(data.map(r => ({
        username:   normalizeUsername(r.username),
        streak:     streakMap[normalizeUsername(r.username)] ?? 1,
        created_at: r.created_at,
      })));
    }
  }, []);

  const tier          = currentStreak ? getStreakTier(currentStreak) : null;
  const tierColor     = tier ? getTierColor(tier) : T.olive;
  const heroDay       = currentStreak ?? (topStreaker?.streak ?? 67);
  const heroTier      = currentStreak ? tier : (topStreaker ? getStreakTier(topStreaker.streak) : "LEGENDARY");
  const heroTierColor = currentStreak ? tierColor : getTierColor(heroTier ?? "LEGENDARY");

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: ${T.bg}; color: ${T.white}; font-family: 'DM Sans', sans-serif; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: ${T.bg}; }
    ::-webkit-scrollbar-thumb { background: ${T.olive}40; border-radius: 2px; }
    input, textarea { font-family: 'DM Sans', sans-serif; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    .fade-1 { animation: fadeUp 0.65s 0.05s ease both; }
    .fade-2 { animation: fadeUp 0.65s 0.18s ease both; }
    .fade-3 { animation: fadeUp 0.65s 0.30s ease both; }
    .nav-link { color:${T.dim}; font-size:13px; font-weight:500; text-decoration:none; letter-spacing:0.05em; transition:color 0.2s; }
    .nav-link:hover { color:${T.white}; }
    .nav-link.active { color:${T.olive}; }
    .btn-primary {
      display:inline-flex; align-items:center; gap:8px;
      background:${T.olive}; color:${T.bg}; border:none;
      font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700;
      letter-spacing:0.12em; text-transform:uppercase;
      padding:13px 24px; border-radius:8px; cursor:pointer;
      text-decoration:none; transition:all 0.2s;
    }
    .btn-primary:hover { background:#a8be6a; transform:translateY(-1px); }
    .btn-secondary {
      display:inline-flex; align-items:center; gap:8px;
      background:transparent; color:${T.white}; border:1px solid ${T.border};
      font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600;
      letter-spacing:0.1em; text-transform:uppercase;
      padding:13px 24px; border-radius:8px; cursor:pointer;
      text-decoration:none; transition:all 0.2s;
    }
    .btn-secondary:hover { border-color:${T.olive}; color:${T.olive}; }
    .card { background:${T.bg2}; border:1px solid ${T.border}; border-radius:0; padding:28px; }
    .card-title { font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:${T.muted}; margin-bottom:20px; }
    .card-title-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .view-all { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:${T.dim}; text-decoration:none; font-weight:500; transition:color 0.2s; }
    .view-all:hover { color:${T.olive}; }
    input[type=text], textarea {
      width:100%; background:${T.bg3}; border:1px solid ${T.border};
      border-radius:8px; padding:11px 14px; color:${T.white};
      font-size:13px; outline:none; transition:border-color 0.2s; resize:none;
    }
    input[type=text]:focus, textarea:focus { border-color:${T.olive}50; }
    input[type=text]::placeholder, textarea::placeholder { color:${T.dim}; }
    @media (max-width:900px) {
      .main-grid { grid-template-columns:1fr !important; }
      .prog-grid  { grid-template-columns:1fr !important; }
      .stat-strip { flex-wrap:wrap !important; }
      .stat-strip > div { min-width:50% !important; }
    }
    @media (max-width:600px) {
      .hero-btns { flex-direction:column !important; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight: "100vh", background: T.bg }}>

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 clamp(16px,4vw,48px)", height: 56,
          background: `${T.bg}ec`, backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${T.border}`,
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, fontWeight: 700, color: T.white }}>touch grass</span>
          </Link>
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <a href="#upload" className="nav-link active">Dashboard</a>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <a href="https://touchgrass.today" className="nav-link" target="_blank" rel="noopener noreferrer">Website</a>
          </div>
          {username ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.borderG}`, fontSize: 12, color: T.olive }}>
              <span>◎</span> @{username}
              {currentStreak && <span style={{ color: T.gold, fontWeight: 700 }}> · {currentStreak}d</span>}
            </div>
          ) : (
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.borderG}`, fontSize: 12, color: T.olive, textDecoration: "none" }}>
              Log In →
            </Link>
          )}
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section style={{ position: "relative", height: "clamp(500px,74vh,760px)", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(155deg, #1a2d0e 0%, #2d4a18 22%, #1e3410 52%, #0e1a08 100%)",
          }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.2, backgroundImage: "radial-gradient(ellipse at 65% 35%, #4a7a28 0%, transparent 55%), radial-gradient(ellipse at 30% 70%, #2d5a18 0%, transparent 45%)" }} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(14,15,11,0.9) 0%, rgba(14,15,11,0.18) 52%, rgba(14,15,11,0.78) 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "38%", background: "linear-gradient(180deg, transparent, rgba(14,15,11,0.96))" }} />

          {/* Left content */}
          <div style={{ position: "absolute", left: "clamp(20px,6vw,80px)", top: "50%", transform: "translateY(-50%)", maxWidth: 500 }}>
            <div className="fade-1" style={{ fontSize: 10, letterSpacing: "0.22em", color: T.olive, textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
              Verified Outdoors
            </div>
            <h1 className="fade-2" style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(48px,7vw,92px)", fontWeight: 700,
              color: T.white, lineHeight: 0.94, letterSpacing: "-0.02em", marginBottom: 22,
            }}>
              Proof<br />of Grass
            </h1>
            <p className="fade-2" style={{ fontSize: 15, color: T.muted, lineHeight: 1.72, marginBottom: 32, maxWidth: 360, fontWeight: 300 }}>
              Log your time outside. Build your streak.<br />Earn rewards. Make a difference.
            </p>
            <div className="fade-3 hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#upload" className="btn-primary">Log Your Proof ↑</a>
              <Link href="/leaderboard" className="btn-secondary">View Leaderboard</Link>
            </div>
            <div style={{ marginTop: 36, display: "flex", gap: 6, alignItems: "center" }}>
              <img src="/touchgrass-transparent.png" alt="" style={{ width: 14, height: 14, opacity: 0.4 }} />
              <span style={{ fontSize: 9, color: T.dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Certified by Touch Grass</span>
            </div>
          </div>

          {/* Right — streak HUD */}
          <div style={{ position: "absolute", right: "clamp(20px,6vw,80px)", top: "50%", transform: "translateY(-50%)", textAlign: "right" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: T.dim, textTransform: "uppercase", marginBottom: 8 }}>
              {username ? "Your Streak" : "Top Streak"}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(60px,8vw,106px)", fontWeight: 700, color: T.white, lineHeight: 0.9, letterSpacing: "-0.03em" }}>
              <span style={{ fontSize: "0.42em", color: T.muted, verticalAlign: "top", lineHeight: 2.4 }}>DAY </span>
              {heroDay}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <div style={{ width: 36, height: 1, background: `linear-gradient(90deg, transparent, ${heroTierColor})` }} />
              <span style={{ fontSize: 10, letterSpacing: "0.18em", color: heroTierColor, textTransform: "uppercase", fontWeight: 600 }}>✦ {heroTier}</span>
            </div>
            {!username && topStreaker && (
              <div style={{ marginTop: 6, fontSize: 10, color: T.dim }}>@{topStreaker.username}</div>
            )}
          </div>
        </section>

        {/* ── LIVE STATS STRIP ──────────────────────────────────────────────── */}
        <div className="stat-strip" style={{ display: "flex", background: T.bg2, borderBottom: `1px solid ${T.border}` }}>
          <StatCard icon="◎" value={dailyCount !== null ? dailyCount.toLocaleString() : "…"} label="Active Touchers Today" />
          <StatCard icon="◈" value={totalBurned !== null ? (totalBurned >= 1000000 ? `${(totalBurned/1000000).toFixed(1)}M` : totalBurned >= 1000 ? `${(totalBurned/1000).toFixed(0)}K` : totalBurned.toString()) : "…"} label="$TOUCHGRASS Burned" />
          <StatCard icon="↗" value={topStreaker ? `${topStreaker.streak}d` : "…"} sub={topStreaker ? `@${topStreaker.username}` : ""} label="Top Streak" accent />
          <StatCard icon="◉" value={totalProofs !== null ? totalProofs.toLocaleString() : "…"} label="Proofs Logged All Time" last />
        </div>

        {/* ── MAIN THREE-COLUMN GRID ─────────────────────────────────────────── */}
        <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, background: T.border }}>

          {/* LOG YOUR PROOF */}
          <div id="upload" className="card" style={{ padding: 28 }}>
            <div className="card-title">Log Your Proof</div>
            {preview ? (
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", marginBottom: 16, aspectRatio: "4/3" }}>
                <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => setPreview(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", color: T.white, width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            ) : (
              <UploadZone onFile={f => setPreview(URL.createObjectURL(f))} />
            )}
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <textarea rows={2} placeholder="Add a caption (optional)" value={caption} onChange={e => setCaption(e.target.value)} />
              <Link href={preview ? `/?proof=1` : "/"} className="btn-primary" style={{ justifyContent: "center" }}>
                Generate Result Card ✦
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: T.dim }}>Share to</span>
                <button style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 12px", color: T.muted, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>𝕏</button>
                <button style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", color: T.muted, cursor: "pointer", fontSize: 12 }}>⛓</button>
              </div>
            </div>
          </div>

          {/* RECENT PROOFS */}
          <div className="card" style={{ padding: 28, borderLeft: `1px solid ${T.border}` }}>
            <div className="card-title-row">
              <span className="card-title" style={{ margin: 0 }}>Recent Proofs</span>
              <Link href="/leaderboard" className="view-all">View All</Link>
            </div>
            {recentProofs.length > 0
              ? recentProofs.map((p, i) => <ProofCard key={i} {...p} />)
              : [1,2,3,4].map(i => (
                <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 50, height: 50, borderRadius: 10, background: T.bg3 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 10, width: "60%", background: T.bg3, borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ height: 8, width: "40%", background: T.bg3, borderRadius: 4 }} />
                  </div>
                </div>
              ))
            }
          </div>

          {/* LEADERBOARD */}
          <div className="card" style={{ padding: 28, borderLeft: `1px solid ${T.border}` }}>
            <div className="card-title-row">
              <span className="card-title" style={{ margin: 0 }}>Leaderboard</span>
              <Link href="/leaderboard" className="view-all">View All</Link>
            </div>
            {leaders.length > 0
              ? leaders.slice(0, 6).map((r, i) => <LBRow key={i} rank={i + 1} {...r} />)
              : [1,2,3,4,5].map(i => (
                <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 14, height: 10, background: T.bg3, borderRadius: 3 }} />
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.bg3 }} />
                  <div style={{ flex: 1, height: 10, background: T.bg3, borderRadius: 4 }} />
                  <div style={{ width: 30, height: 20, background: T.bg3, borderRadius: 4 }} />
                </div>
              ))
            }
          </div>
        </div>

        {/* ── PROGRESSION + RESULT CARD PREVIEW ─────────────────────────────── */}
        <div className="prog-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, background: T.border, borderTop: `1px solid ${T.border}` }}>

          {/* PROGRESSION */}
          <div className="card" style={{ padding: 32, borderRight: `1px solid ${T.border}` }}>
            <div className="card-title-row">
              <span className="card-title" style={{ margin: 0 }}>Your Progression</span>
            </div>
            {currentStreak ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, paddingRight: 8 }}>
                  <TierBadge name="Rooted"    day={14}  completed={currentStreak >= 14} active={currentStreak >= 7 && currentStreak < 14} />
                  <TierBadge name="Growing"   day={30}  completed={currentStreak >= 30} active={currentStreak >= 14 && currentStreak < 30} />
                  <TierBadge name="Legendary" day={50}  completed={currentStreak >= 50} active={currentStreak >= 30 && currentStreak < 50} />
                  <TierBadge name="Immortal"  day={100} completed={currentStreak >= 100} active={currentStreak >= 50 && currentStreak < 100} />
                </div>

                {/* Progress bar */}
                {(() => {
                  const thresholds = [0, 14, 30, 50, 100];
                  const prev = [...thresholds].reverse().find(t => currentStreak >= t) ?? 0;
                  const next = thresholds.find(t => t > currentStreak);
                  const fill = next ? Math.round(((currentStreak - prev) / (next - prev)) * 100) : 100;
                  const daysLeft = next ? next - currentStreak : 0;
                  return (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: T.muted }}>Next Milestone</span>
                        <span style={{ fontSize: 12, color: T.dim }}>{currentStreak} / {next ?? 100}</span>
                      </div>
                      {daysLeft > 0 && <div style={{ fontSize: 11, color: T.olive, marginBottom: 10, fontWeight: 600 }}>{daysLeft} day{daysLeft !== 1 ? "s" : ""} to {getStreakTier(next ?? 100).charAt(0) + getStreakTier(next ?? 100).slice(1).toLowerCase()}</div>}
                      <div style={{ height: 3, background: T.bg3, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${fill}%`, background: `linear-gradient(90deg, ${T.olive}, ${T.gold})`, borderRadius: 2, transition: "width 1s ease" }} />
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 16 }}>Log in to see your progression</div>
                <Link href="/" className="btn-secondary" style={{ fontSize: 12, padding: "10px 20px" }}>Go to App →</Link>
              </div>
            )}

            <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 10, background: T.bg3, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🛡</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.white }}>Shield Protection</div>
                <div style={{ fontSize: 11, color: T.dim }}>Protect your streak · 50,000 $TOUCHGRASS</div>
              </div>
              <Link href="/" style={{ marginLeft: "auto", fontSize: 11, color: T.olive, textDecoration: "none", fontWeight: 600, flexShrink: 0 }}>Buy →</Link>
            </div>
          </div>

          {/* RESULT CARD PREVIEW */}
          <div className="card" style={{ padding: 32 }}>
            <div className="card-title-row">
              <span className="card-title" style={{ margin: 0 }}>Result Card Preview</span>
              <Link href="/" className="view-all">Create Yours</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ResultCardPreview day={previewDays[0] ?? 67} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <ResultCardPreview day={previewDays[1] ?? 23} />
                <ResultCardPreview day={previewDays[2] ?? 11} />
              </div>
              <p style={{ fontSize: 11, color: T.dim, textAlign: "center", lineHeight: 1.65 }}>
                Every outdoor moment officially certified.<br />Share your proof. Build your legacy.
              </p>
            </div>
          </div>
        </div>

        {/* ── FOOTER CTA ────────────────────────────────────────────────────── */}
        <section style={{ position: "relative", padding: "96px clamp(20px,6vw,80px)", textAlign: "center", overflow: "hidden", background: `linear-gradient(180deg, ${T.bg} 0%, #111408 100%)` }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 560, height: 560, borderRadius: "50%", background: `radial-gradient(circle, ${T.olive}10 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", color: T.olive, textTransform: "uppercase", marginBottom: 20, fontWeight: 600 }}>Join the movement</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(34px,5.5vw,70px)", fontWeight: 700, color: T.white, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 14 }}>
              Go outside.<br />
              <span style={{ color: T.olive }}>Prove it.</span><br />
              Make a difference.
            </h2>
            <p style={{ fontSize: 15, color: T.dim, marginBottom: 40, fontWeight: 300 }}>Every proof plants impact.</p>
            <Link href="/" className="btn-primary" style={{ fontSize: 14, padding: "15px 36px" }}>Start Your Streak ↑</Link>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer style={{ borderTop: `1px solid ${T.border}`, padding: "22px clamp(16px,4vw,48px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, background: T.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width: 18, height: 18, opacity: 0.5 }} />
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 14, color: T.dim }}>touch grass</span>
            <span style={{ fontSize: 11, color: T.dim, marginLeft: 4 }}>© 2024</span>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[["Leaderboard", "/leaderboard"], ["Website", "https://touchgrass.today"], ["X (Twitter)", "https://twitter.com/XTouchGrass"]].map(([label, href]) => (
              <Link key={label} href={href} style={{ fontSize: 11, color: T.dim, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</Link>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.dim, letterSpacing: "0.1em" }}>BUILT ON ◎ SOLANA</div>
        </footer>

      </div>
    </>
  );
}