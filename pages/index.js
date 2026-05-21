import { useState, useRef, useEffect } from "react";
import UploadBox from "../components/UploadBox";
import ResultCard from "../components/ResultCard";
import { supabase } from "../utils/supabase";
import StreakFeed from "../components/StreakFeed";

function normalizeUsername(val) {
  return String(val ?? "").replace(/@/g, "").toLowerCase().trim();
}

function computePreviewStreak(streakRow) {
  if (!streakRow || !streakRow.last_submission_date) return 1;
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  // Normalize to YYYY-MM-DD regardless of whether value is a date or timestamp
  const last = new Date(streakRow.last_submission_date).toISOString().slice(0, 10);
  if (last === todayStr) return streakRow.current_streak;
  if (last === yesterdayStr) return streakRow.current_streak + 1;
  return 1;
}

function getStreakTitle(streak) {
  if (streak >= 30) return "👑 grass god";
  if (streak >= 14) return "🔥 locked in";
  if (streak >= 7)  return "🌳 rooted";
  if (streak >= 3)  return "🌿 sprout";
  return "🌱 seed";
}

function getStreakRewardValue(streak) {
  if (streak >= 20) return "$15 reward tier";
  if (streak >= 10) return "$10 reward tier";
  return "building toward day 10 reward";
}

export default function Home() {
  const [rawUsername, setRawUsername] = useState(() => {
    // Seed from localStorage on first render (client-side only)
    if (typeof window === "undefined") return "";
    const saved = localStorage.getItem("pog_username");
    return saved ? normalizeUsername(saved) : "";
  });
  const [restoredFromStorage, setRestoredFromStorage] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("pog_username");
  });
  const [imageSrc, setImageSrc] = useState(null);
  const [currentStreak, setCurrentStreak] = useState(1);
  const [displayStreak, setDisplayStreak] = useState(1); // projected for certificate
  const [streakStatus, setStreakStatus] = useState("");
  const [streakTone, setStreakTone] = useState("neutral"); // neutral | success | warning | reset
  const [shieldEligible, setShieldEligible] = useState(false); // true when missed 1 day + has shields
  const [missedOneDayNoShield, setMissedOneDayNoShield] = useState(false); // missed exactly 1 day + 0 shields
  const [shieldStatus, setShieldStatus] = useState(null); // null | "success" | "error"
  const [loadingShield, setLoadingShield] = useState(false);
  const [purchaseTxSig, setPurchaseTxSig] = useState("");
  const [purchaseWallet, setPurchaseWallet] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState(null); // null | "loading" | "success" | "error"
  const [purchaseError, setPurchaseError] = useState("");
  const [latestPurchase, setLatestPurchase] = useState(null); // { status, tx_signature } | null
  const [copiedDomain, setCopiedDomain] = useState(false);  // feedback for domain copy
  const [copiedAddr, setCopiedAddr] = useState(false);      // feedback for raw address copy
  const [showPasteTip, setShowPasteTip] = useState(false);  // nudge after any copy
  const [timeUntilReset, setTimeUntilReset] = useState("");
  const [countdownMs, setCountdownMs] = useState(null);
  const [userStats, setUserStats] = useState(null); // { rank, posts, bestStreak } | null
  const [dailyCount, setDailyCount] = useState(null);
  const [totalBurned, setTotalBurned] = useState(null); // approved purchases * 50000
  const [topStreaker, setTopStreaker] = useState(null); // { username, current_streak }
  const [hasPostedToday, setHasPostedToday] = useState(null); // null=unknown, true, false
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const resultRef = useRef(null);
  const buyShieldRef = useRef(null); // used to scroll to Buy Shield section

  const username = normalizeUsername(rawUsername);
  const hasUsername = username.length > 0;

  // Preload streak preview whenever username changes (debounced 500ms).
  // Single authoritative rule: latest submission date drives the preview,
  // with the Streaks row used to determine the exact count.
  useEffect(() => {
    if (!username) {
      setCurrentStreak(1);
      setDisplayStreak(1);
      setStreakStatus("");
      setStreakTone("neutral");
      setShieldEligible(false);
      setMissedOneDayNoShield(false);
      setShieldStatus(null);
      setPurchaseStatus(null);
      setPurchaseError("");
      setLatestPurchase(null);
      setUserStats(null);
      setHasPostedToday(null);
      return;
    }
    const timer = setTimeout(async () => {
      // All date comparisons use UTC YYYY-MM-DD
      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      try {
        // Two targeted queries in parallel — no full-table scans
        const [{ data: streakRow }, { count: postCount }] = await Promise.all([
          supabase
            .from("Streaks")
            .select("current_streak, best_streak, last_submission_date, shield_count")
            .eq("username", username)
            .maybeSingle(),
          supabase
            .from("Submissions")
            .select("id", { count: "exact", head: true })
            .eq("username", username),
        ]);

        // Rank: count how many users have a higher streak (no full table scan)
        const userStreak = streakRow?.current_streak ?? 1;
        const { count: rankCount } = await supabase
          .from("Streaks")
          .select("id", { count: "exact", head: true })
          .gt("current_streak", userStreak);
        const derivedRank = ((rankCount ?? 0) + 1);

        // ── normalize last_submission_date to UTC YYYY-MM-DD ─────────────────
        const twoDaysAgoStr = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
        const lastStreakDate = streakRow?.last_submission_date
          ? new Date(streakRow.last_submission_date).toISOString().slice(0, 10)
          : null;
        const shieldCount = streakRow?.shield_count ?? 0;

        // ── actual vs projected streak ───────────────────────────────────────
        const actualStreak = streakRow?.current_streak ?? 1;
        const projectedNextStreak = actualStreak + 1;
        // displayStreak: what certificate shows before posting (projected if last was yesterday)
        const displayStreakVal = computePreviewStreak(streakRow);

        // ── status + tone — entirely from Streaks.last_submission_date ────────
        if (!lastStreakDate) {
          setStreakStatus("start your streak today");
          setStreakTone("neutral");
        } else if (lastStreakDate === todayStr) {
          setStreakStatus("streak locked in for today");
          setStreakTone("success");
        } else if (lastStreakDate === yesterdayStr) {
          setStreakStatus(`submit today to reach day ${projectedNextStreak}`);
          setStreakTone("warning");
        } else if (lastStreakDate === twoDaysAgoStr) {
          if (shieldCount > 0) {
            setStreakStatus(`you're on day ${actualStreak} — shield available`);
            setStreakTone("reset");
          } else {
            setStreakStatus("streak lost — start again today");
            setStreakTone("reset");
          }
        } else {
          setStreakStatus("streak lost — start again today");
          setStreakTone("reset");
        }

        // ── shield eligibility — Streaks.last_submission_date only ───────────
        const missedOneDay = lastStreakDate === twoDaysAgoStr;
        setShieldEligible(missedOneDay && shieldCount > 0);
        setMissedOneDayNoShield(missedOneDay && shieldCount === 0);

        // ── hasPostedToday — Streaks.last_submission_date only ───────────────
        setHasPostedToday(lastStreakDate === todayStr);

        // actualStreak → HUD/status/shields; displayStreakVal → certificate canvas
        setCurrentStreak(actualStreak);
        setDisplayStreak(displayStreakVal);

        setUserStats({
          posts: postCount ?? 0,
          bestStreak: streakRow?.best_streak ?? actualStreak,
          rank: derivedRank,
          shields: shieldCount,
        });

        console.log({ username, streakRow, actualStreak, projectedNextStreak, lastStreakDate, shieldCount, missedOneDay });

        // Shield purchase status — fire after main state is set, truly non-blocking
        supabase
          .from("ShieldPurchases")
          .select("tx_signature, status, created_at")
          .eq("username", username)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data: purchase }) => setLatestPurchase(purchase ?? null));
      } catch (err) {
        console.error("streak preload failed", err);
        // Reset shield state on error to avoid stale eligible UI
        setCurrentStreak(1);
        setShieldEligible(false);
        setMissedOneDayNoShield(false);
        setStreakTone("neutral");
        setStreakStatus("");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // Live countdown to next UTC midnight — updates every second
  useEffect(() => {
    if (!mounted) return;
    function calcCountdown() {
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setUTCHours(24, 0, 0, 0);
      const diff = nextMidnight - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdownMs(diff);
      setTimeUntilReset(`resets in ${h}h ${m}m`);
    }
    calcCountdown();
    const interval = setInterval(calcCountdown, 10000); // 10s is enough for h/m display
    return () => clearInterval(interval);
  }, [mounted]);


  // Fetch daily activity stats on mount — count of today's approved submissions + top streaker
  useEffect(() => {
    async function fetchDailyStats() {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const [{ count }, { data: streakers }, { count: burnCount }] = await Promise.all([
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
      ]);

      setDailyCount(count ?? 0);
      setTotalBurned((burnCount ?? 0) * 50000);
      if (streakers && streakers.length > 0) {
        const s = streakers[0];
        setTopStreaker({
          username: String(s.username ?? "").replace(/@/g, "").toLowerCase().trim(),
          current_streak: s.current_streak ?? 1,
        });
      }
    }
    fetchDailyStats();
  }, []);

  // Persist normalized username to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (username) {
      localStorage.setItem("pog_username", username);
    } else {
      localStorage.removeItem("pog_username");
    }
  }, [username]);

  const handleUseShield = async () => {
    if (!username || !shieldEligible || loadingShield) return;

    const confirmed = window.confirm("Use a shield to preserve your streak?");
    if (!confirmed) return;

    setLoadingShield(true);

    try {
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      // Step 1: fetch current row to get exact shield_count before decrement
      const { data: currentRow, error: fetchError } = await supabase
        .from("Streaks")
        .select("shield_count, current_streak")
        .eq("username", username)
        .maybeSingle();

      if (fetchError) {
        console.error("shield use failed — fetch error", fetchError);
        setShieldStatus("error");
        setLoadingShield(false);
        return;
      }
      if (!currentRow) {
        console.error("shield use failed — no streak row found for", username);
        setShieldStatus("error");
        setLoadingShield(false);
        return;
      }

      const shieldCountBefore = currentRow.shield_count ?? 1;
      const newShieldCount = Math.max(0, shieldCountBefore - 1);

      // Step 2: atomic update — set yesterday as last submission, decrement shields
      const { data: updatedRows, error: updateError } = await supabase
        .from("Streaks")
        .update({
          shield_count: newShieldCount,
          last_submission_date: yesterdayStr,
          last_shield_used_at: new Date().toISOString(),
        })
        .eq("username", username)
        .select("username, shield_count, last_submission_date");

      if (updateError) {
        console.error("shield use failed — update error", updateError);
        setShieldStatus("error");
        setLoadingShield(false);
        return;
      }
      if (!updatedRows || updatedRows.length === 0) {
        console.error("shield use failed — update matched no rows for username:", username);
        setShieldStatus("error");
        setLoadingShield(false);
        return;
      }

      // Step 3: non-blocking usage log — failure does NOT block shield success
      supabase.from("ShieldUsageLog").insert([{
        username,
        shield_count_before: shieldCountBefore,
        shield_count_after: newShieldCount,
        streak_at_use: currentRow.current_streak ?? currentStreak,
      }]).then(({ error: logError }) => {
        if (logError) console.error("shield log insert failed (non-blocking)", logError);
      });

      // Step 4: show success message briefly, then transition to safe-warning state
      setShieldStatus("success");
      setUserStats((prev) => prev ? { ...prev, shields: newShieldCount } : prev);

      setTimeout(() => {
        setShieldEligible(false);
        setStreakTone("warning");
        setStreakStatus("post-shield");
        setHasPostedToday(false);
        setShieldStatus(null);
      }, 1800);

    } catch (err) {
      console.error("shield use failed — unexpected error", err);
      setShieldStatus("error");
    } finally {
      setLoadingShield(false);
    }
  };

  const handleBuyShield = async () => {
    if (!username) { setPurchaseError("enter your username first"); setPurchaseStatus("error"); return; }
    if (!purchaseTxSig.trim()) { setPurchaseError("tx signature is required"); setPurchaseStatus("error"); return; }
    setPurchaseStatus("loading");
    setPurchaseError("");
    try {
      const { error } = await supabase.from("ShieldPurchases").insert([{
        username,
        wallet_address: purchaseWallet.trim() || null,
        tx_signature: purchaseTxSig.trim(),
        token_amount: 50000,
        status: "pending",
      }]);
      if (error) {
        console.error("shield purchase insert failed", error);
        const msg = error.message ?? "";
        const isDuplicate = msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique");
        setPurchaseError(isDuplicate
          ? "this transaction has already been submitted"
          : (msg || "submission failed — try again")
        );
        setPurchaseStatus("error");
        return;
      }
      setPurchaseStatus("success");
      setPurchaseTxSig("");
      setPurchaseWallet("");
      // Refresh purchase status display after successful submit
      supabase
        .from("ShieldPurchases")
        .select("tx_signature, status, created_at")
        .eq("username", username)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: purchase }) => setLatestPurchase(purchase ?? null));
    } catch (err) {
      console.error("shield purchase unexpected error", err);
      setPurchaseError("something went wrong — try again");
      setPurchaseStatus("error");
    }
  };

  const handleImageUpload = (src) => {
    setImageSrc(src);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <main className="relative min-h-screen bg-[#060e07] text-white flex flex-col items-center px-4 py-16 font-mono overflow-x-hidden">

      {/* Layered ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        {/* Base vignette — deep black-green edges */}
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse 120% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }} />
        {/* Centre top bloom */}
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse 90% 55% at 50% 0%, rgba(74,222,128,0.10) 0%, transparent 65%)",
        }} />
        {/* Mid-page secondary bloom */}
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse 70% 50% at 50% 55%, rgba(52,211,153,0.05) 0%, transparent 70%)",
        }} />
        {/* Bottom-left corner accent */}
        <div style={{
          position:"absolute", bottom:0, left:0, width:"60vw", height:"60vw",
          background:"radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 65%)",
        }} />
        {/* Top-right corner accent */}
        <div style={{
          position:"absolute", top:0, right:0, width:"50vw", height:"50vw",
          background:"radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 65%)",
        }} />
        {/* Fine grid overlay */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(74,222,128,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.03) 1px, transparent 1px)",
          backgroundSize:"40px 40px",
        }} />
        {/* Diagonal shimmer stripe */}
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(135deg, transparent 40%, rgba(74,222,128,0.025) 50%, transparent 60%)",
        }} />
      </div>

      {/* Grass silhouettes — bottom corners */}
      <div className="pointer-events-none fixed bottom-0 left-0 z-0 opacity-[0.10]" aria-hidden="true">
        <svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 120 Q14 60 20 40 Q26 60 30 120" fill="#4ade80"/>
          <path d="M28 120 Q34 50 42 25 Q50 50 56 120" fill="#4ade80"/>
          <path d="M52 120 Q56 70 62 52 Q68 70 72 120" fill="#4ade80"/>
          <path d="M68 120 Q76 45 86 18 Q96 45 104 120" fill="#4ade80"/>
          <path d="M100 120 Q106 65 114 48 Q122 65 128 120" fill="#4ade80"/>
          <path d="M124 120 Q130 72 138 58 Q146 72 152 120" fill="#4ade80"/>
          <path d="M148 120 Q154 80 160 68 Q166 80 172 120" fill="#4ade80"/>
          <path d="M168 120 Q174 75 182 60 Q190 75 196 120" fill="#4ade80"/>
        </svg>
      </div>
      <div className="pointer-events-none fixed bottom-0 right-0 z-0 opacity-[0.07]" aria-hidden="true">
        <svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{transform:"scaleX(-1)"}}>
          <path d="M10 120 Q14 60 20 40 Q26 60 30 120" fill="#4ade80"/>
          <path d="M28 120 Q34 50 42 25 Q50 50 56 120" fill="#4ade80"/>
          <path d="M52 120 Q56 70 62 52 Q68 70 72 120" fill="#4ade80"/>
          <path d="M68 120 Q76 45 86 18 Q96 45 104 120" fill="#4ade80"/>
          <path d="M100 120 Q106 65 114 48 Q122 65 128 120" fill="#4ade80"/>
          <path d="M124 120 Q130 72 138 58 Q146 72 152 120" fill="#4ade80"/>
          <path d="M148 120 Q154 80 160 68 Q166 80 172 120" fill="#4ade80"/>
          <path d="M168 120 Q174 75 182 60 Q190 75 196 120" fill="#4ade80"/>
        </svg>
      </div>

      {/* Animated grass line above footer */}
      <style>{`
        /* ── Grass grow — decorative line at bottom ─────────────────────────── */
        @keyframes grassGrow {
          from { clip-path: inset(0 100% 0 0); opacity: 0; }
          to   { clip-path: inset(0 0% 0 0);   opacity: 1; }
        }
        .grass-line { animation: grassGrow 2.8s cubic-bezier(0.22,1,0.36,1) 0.8s both; }

        /* ── Live pulse dot ─────────────────────────────────────────────────── */
        @keyframes livePulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.75); }
        }
        .live-dot { animation: livePulse 2s ease-in-out infinite; }

        /* ── Certificate reveal ─────────────────────────────────────────────── */
        @keyframes certReveal {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cert-reveal { animation: certReveal 0.5s cubic-bezier(0.22,1,0.36,1) both; }

        /* ── Upload area shimmer (tune: change 0.13 for glow strength) ──────── */
        @keyframes uploadShimmer {
          0%   { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
          50%  { box-shadow: 0 0 28px 4px rgba(74,222,128,0.13); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }
        .upload-live { animation: uploadShimmer 3s ease-in-out infinite; }

        /* ── Stat value pulse on load (tune: duration/intensity) ────────────── */
        @keyframes statFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stat-val { animation: statFadeIn 0.4s ease both; }

        /* ── Shield icon glow pulse (active shields only) ───────────────────── */
        @keyframes shieldGlow {
          0%,100% { filter: drop-shadow(0 0 3px rgba(74,222,128,0.6)); }
          50%      { filter: drop-shadow(0 0 8px rgba(74,222,128,0.9)); }
        }
        .shield-active { animation: shieldGlow 2.4s ease-in-out infinite; }

        /* ── HUD card entrance ──────────────────────────────────────────────── */
        @keyframes hudIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hud-card { animation: hudIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }

        /* ── Button press feedback ──────────────────────────────────────────── */
        .btn-press:active { transform: scale(0.97); }

        /* ── Section card hover lift ────────────────────────────────────────── */
        .card-hover {
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 32px rgba(74,222,128,0.12), 0 8px 24px rgba(0,0,0,0.4);
        }

        /* ── Floating glow orb (decorative) ────────────────────────────────── */
        @keyframes orbFloat {
          0%,100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50%      { transform: translateY(-18px) scale(1.06); opacity: 0.6; }
        }
        .orb { animation: orbFloat 7s ease-in-out infinite; }
        .orb-2 { animation: orbFloat 9s ease-in-out 2s infinite; }

        /* ── Section header line pulse ──────────────────────────────────────── */
        @keyframes linePulse {
          0%,100% { opacity: 0.4; }
          50%      { opacity: 0.9; }
        }
        .divider-pulse { animation: linePulse 4s ease-in-out infinite; }

        /* ── Number counter tick ────────────────────────────────────────────── */
        @keyframes tick {
          from { opacity: 0; transform: translateY(6px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .tick-in { animation: tick 0.35s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* All page content sits above fixed bg */}
      <div className="relative z-10 w-full flex flex-col items-center">

      {/* ── Decorative floating orbs behind header ─────────────────────────── */}
      <div className="pointer-events-none absolute top-0 left-0 w-full h-96 overflow-hidden z-0" aria-hidden="true">
        <div className="orb absolute" style={{
          width:320, height:320, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)",
          top:"-80px", left:"10%",
        }} />
        <div className="orb-2 absolute" style={{
          width:240, height:240, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)",
          top:"-40px", right:"8%",
        }} />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center mb-12 relative z-10">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="h-px w-8 divider-pulse" style={{background:"linear-gradient(90deg,transparent,#4ade80)"}} />
          <span className="text-[11px] tracking-[0.5em] text-[#4ade80] uppercase opacity-75">
            $TOUCHGRASS · On-Chain Proof System
          </span>
          <div className="h-px w-8 divider-pulse" style={{background:"linear-gradient(90deg,#4ade80,transparent)"}} />
        </div>
        <h1 className="text-6xl font-bold tracking-tight text-white leading-tight"
          style={{textShadow:"0 0 60px rgba(74,222,128,0.25), 0 0 120px rgba(74,222,128,0.08)"}}>
          Proof of Grass
        </h1>
        <p className="mt-3 text-[#4a6e4d] text-base max-w-xs mx-auto tracking-wide">
          Touch grass. Log proof. Build your streak. Earn rewards.
        </p>

        <a
          href="/leaderboard"
          className="
            inline-flex items-center gap-2 mt-5 mb-1
            font-mono text-[12px] tracking-widest uppercase
            text-[#4ade80] opacity-50
            hover:opacity-100 hover:shadow-[0_0_16px_rgba(74,222,128,0.35)]
            transition-all duration-200
          "
        >
          ◈ Rankings
        </a>

        <div className="mt-3 h-px w-24 mx-auto"
          style={{background:"linear-gradient(90deg, transparent, rgba(74,222,128,0.5), transparent)"}} />

        {/* Daily activity stats — client-only, hydration-safe */}
        {mounted && (dailyCount !== null || topStreaker) && (
          <div className="mt-5 flex flex-col items-center gap-1.5">
            {dailyCount !== null && (
              <p className="font-mono text-[13px] text-[#3a5e3d] tracking-widest">
                {/* Tune: adjust color of count */}
                <span className="text-[#4ade80] font-bold">{dailyCount}</span>
                {" "}{dailyCount === 1 ? "agent" : "agents"} logged proof today
              </p>
            )}
            {topStreaker && (
              <p className="font-mono text-[13px] text-[#2a4a2d] tracking-widest">
                top streak:{" "}
                <span className="text-[#4ade80] font-semibold">@{topStreaker.username}</span>
                {" "}·{" "}
                <span className="text-[#3a5e3d]">{topStreaker.current_streak}d</span>
              </p>
            )}
            {totalBurned !== null && (
              <p className="font-mono text-[13px] text-[#3a5e3d] tracking-widest">
                {/* Tune: burned stat color */}
                🔥 <span className="text-[#4ade80] font-bold">{totalBurned.toLocaleString()}</span> $TOUCHGRASS burned
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Step 1: Identify ──────────────────────────────────────────────── */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1f3d22]" />
          {/* Tune: section label wording */}
          <span className="text-[12px] tracking-[0.3em] text-[#3a5e3d] uppercase">
            Identify
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1f3d22]" />
        </div>

        {/* Tune: increase shadow spread for more depth */}
        <div className="card-hover relative rounded-sm border border-[#1f4020] bg-[#05100a]
          shadow-[inset_0_1px_0_rgba(74,222,128,0.12),0_0_32px_rgba(74,222,128,0.07),0_4px_24px_rgba(0,0,0,0.6)]
          px-5 py-5">
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#4ade80] opacity-30" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#4ade80] opacity-30" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#4ade80] opacity-30" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#4ade80] opacity-30" />

          <label className="block font-mono text-[12px] tracking-[0.25em] text-[#4ade80] uppercase opacity-60 mb-1.5">
            X Username
          </label>
          <input
            type="text"
            value={rawUsername}
            onChange={(e) => { setRawUsername(e.target.value); setRestoredFromStorage(false); }}
            placeholder="yourhandle"
            className="
              w-full bg-[#060e07] border border-[#1f3d22]
              text-[#d1fae5] font-mono text-base
              px-4 py-2.5 rounded-sm
              placeholder:text-[#2a4a2d]
              focus:outline-none focus:border-[#4ade80]
              focus:shadow-[0_0_12px_rgba(74,222,128,0.15)]
              transition-all duration-200
            "
          />
          {!mounted ? null : !hasUsername ? (
            <p className="font-mono text-[12px] text-[#2a4a2d] tracking-widest mt-2 uppercase">
              {/* Tune: hint copy when no username */}
              enter your handle to load your mission status
            </p>
          ) : (
            <div className="flex flex-col gap-2 mt-3">
              {/* Welcome back — only on localStorage restore */}
              {restoredFromStorage && (
                <p className="font-mono text-[12px] text-[#2a4a2d] tracking-wide">
                  welcome back @{username}
                </p>
              )}

              {/* Primary streak line */}
              <p className="font-mono text-[13px] text-[#4ade80] tracking-wide font-semibold">
                ✓ streak loaded for @{username} — day {currentStreak}
                {" "}<span className="font-normal opacity-60">{getStreakTitle(currentStreak)}</span>
              </p>

              {/* Single primary status block — only ONE shown at a time */}
              {hasPostedToday === true && (
                <div className="flex flex-col gap-0.5">
                  <p className="font-mono text-[13px] text-[#4ade80] tracking-wide">
                    ✅ you're locked in for today
                  </p>
                  <p className="font-mono text-[12px] text-[#3a5e3d] tracking-wide">
                    come back tomorrow to continue your streak
                  </p>
                </div>
              )}

              {hasPostedToday === false && streakTone !== "reset" && (
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-[13px] text-[#f59e0b] tracking-wide">
                    {streakStatus === "post-shield"
                      ? "your streak is safe"
                      : "⚠️ you haven't checked in today"
                    }
                  </p>
                  {/* Urgent countdown with 3-level escalation */}
                  {(() => {
                    const msLeft = countdownMs ?? Infinity;
                    const h = Math.floor(msLeft / 3600000);
                    const m = Math.floor((msLeft % 3600000) / 60000);
                    const countStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                    let countColor, shadowStyle;
                    if (msLeft < 3600000) {
                      // < 1h — danger red
                      countColor = "text-[#ef4444]";
                      shadowStyle = { textShadow: "0 0 10px rgba(239,68,68,0.5)" };
                    } else if (msLeft < 10800000) {
                      // 1–3h — amber warning
                      countColor = "text-[#f59e0b]";
                      shadowStyle = { textShadow: "0 0 8px rgba(245,158,11,0.4)" };
                    } else {
                      // > 3h — muted green
                      countColor = "text-[#3a5e3d]";
                      shadowStyle = {};
                    }
                    return (
                      <p className={`font-mono text-[13px] font-semibold tabular-nums tracking-wide ${countColor}`} style={shadowStyle}>
                        🔥 {countStr} left — don't lose your streak
                      </p>
                    );
                  })()}
                  <p className="font-mono text-[12px] text-[#3a5e3d] tracking-wide mt-1">
                    {streakStatus === "post-shield"
                      ? "check in today to keep it growing"
                      : "⬇️ submit today's proof below"
                    }
                  </p>
                </div>
              )}

              {streakTone === "reset" && shieldEligible && shieldStatus !== "success" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-mono text-[13px] text-[#f59e0b] font-semibold tracking-wide">
                      🛡️ you missed yesterday
                    </p>
                    <p className="font-mono text-[12px] text-[#ef4444] tracking-wide">
                      {currentStreak > 1
                        ? `you're about to lose your ${currentStreak} day streak`
                        : "you're about to lose your streak"
                      }
                    </p>
                    <p className="font-mono text-[12px] text-[#f59e0b] tracking-wide">
                      use a shield to preserve it
                    </p>
                    <p className="font-mono text-[11px] text-[#2a4a2d] tracking-wide mt-0.5">
                      🔥 {getStreakRewardValue(currentStreak)}
                    </p>
                  </div>
                  <button
                    onClick={handleUseShield}
                    disabled={loadingShield}
                    className={`
                      self-start font-mono text-[12px] font-bold tracking-widest uppercase
                      px-4 py-1.5 rounded-sm
                      shadow-[0_0_12px_rgba(74,222,128,0.2)]
                      transition-all duration-200
                      ${loadingShield
                        ? "bg-[#1a3520] text-[#4ade80] border border-[#2d5e30] cursor-not-allowed opacity-60"
                        : "bg-[#4ade80] text-[#07110a] hover:bg-[#86efac] hover:shadow-[0_0_20px_rgba(74,222,128,0.45)]"
                      }
                    `}
                  >
                    {loadingShield ? "using..." : "🛡️ use shield"}
                  </button>
                  {shieldStatus === "error" && (
                    <p className="font-mono text-[12px] text-[#ef4444] tracking-wide">
                      ✕ shield use failed — try again
                    </p>
                  )}
                </div>
              )}

              {shieldStatus === "success" && (
                <div className="flex flex-col gap-0.5">
                  <p className="font-mono text-[13px] text-[#4ade80] tracking-wide"
                    style={{textShadow:"0 0 12px rgba(74,222,128,0.5)"}}>
                    🛡️ shield used — your streak is protected
                  </p>
                </div>
              )}

              {/* Dead reset — missed 3+ days OR missed 1 day with no shields (panic shown separately below) */}
              {streakTone === "reset" && !shieldEligible && (
                <div className="flex flex-col gap-0.5">
                  <p className="font-mono text-[13px] text-[#ef4444] tracking-wide">
                    💀 streak reset
                  </p>
                  <p className="font-mono text-[12px] text-[#3a5e3d] tracking-wide">
                    start again today
                  </p>
                </div>
              )}

              {/* Neutral / unknown state: show passive countdown */}
              {hasPostedToday === null && (
                <p className="font-mono text-[12px] text-[#2a4a2d] tabular-nums tracking-wide">
                  {timeUntilReset}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Prove It ─────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1f3d22]" />
          {/* Tune: label when locked vs unlocked */}
          <span className={`text-[12px] tracking-[0.3em] uppercase transition-colors duration-300 ${mounted && hasUsername ? "text-[#3a5e3d]" : "text-[#1a3520]"}`}>
            Prove You Touched Grass
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1f3d22]" />
        </div>

        {/* Tune: upload wrapper glow is controlled by uploadShimmer keyframe above */}
        <div className={`transition-all duration-300 rounded-sm ${mounted && hasUsername ? "opacity-100 upload-live" : "opacity-30 pointer-events-none select-none"}`}>
          <UploadBox onUpload={handleImageUpload} />
        </div>

        {(!mounted || !hasUsername) && (
          <p className="font-mono text-[12px] text-[#1a2e1c] tracking-widest uppercase text-center mt-2">
            {/* Tune: locked state hint */}
            identify first to unlock
          </p>
        )}
      </div>

      {/* ── No-Shield Alert — own card, rendered only when missedOneDayNoShield ── */}
      {mounted && hasUsername && missedOneDayNoShield && (
        <div className="w-full max-w-md mb-8">
          {/* Tune: outer border color for danger feel — currently subtle red */}
          <div className="relative rounded-sm border border-[#7f1d1d] bg-[#100404]
            shadow-[inset_0_1px_0_rgba(239,68,68,0.08),0_0_24px_rgba(239,68,68,0.07),0_4px_20px_rgba(0,0,0,0.6)]
            px-5 py-4 flex flex-col gap-3">
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#ef4444] opacity-20" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#ef4444] opacity-20" />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#ef4444] opacity-20" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#ef4444] opacity-20" />

            {/* Title — one red line only */}
            <p className="font-mono text-[13px] text-[#ef4444] font-semibold tracking-wide">
              ⚠️ no shields available
            </p>

            {/* Subtext — muted, not all red */}
            <p className="font-mono text-[12px] text-[#6b2e2e] tracking-wide">
              {currentStreak > 1
                ? `your ${currentStreak} day streak resets if you miss today`
                : "your streak resets if you miss today"
              }
            </p>

            {/* Price line */}
            <p className="font-mono text-[12px] text-[#f59e0b] tracking-wide">
              {/* Tune: price copy */}
              buy 1 shield — 50,000 $TOUCHGRASS
            </p>

            {/* CTA — scrolls to Acquire Shield section */}
            <button
              onClick={() => buyShieldRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="
                self-start font-mono text-[12px] font-bold tracking-widest uppercase
                border border-[#ef4444] text-[#ef4444]
                px-4 py-1.5 rounded-sm
                hover:bg-[#1f0505] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]
                shadow-[0_0_8px_rgba(239,68,68,0.15)]
                transition-all duration-200 btn-press
              "
            >
              🛡️ buy shield
            </button>
          </div>
        </div>
      )}

      {/* ── Player HUD ──────────────────────────────────────────────────────── */}
      {mounted && hasUsername && userStats && (
        <div className="w-full max-w-md mb-8 hud-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1f3d22]" />
            {/* Tune: HUD label */}
            <span className="text-[12px] font-mono tracking-[0.3em] text-[#3a5e3d] uppercase">Mission Status</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1f3d22]" />
          </div>

          {/* Tune: increase outer shadow for more float effect */}
          <div className="relative rounded-sm border border-[#1f4020] bg-[#05100a]
            shadow-[inset_0_1px_0_rgba(74,222,128,0.14),0_0_40px_rgba(74,222,128,0.08),0_6px_32px_rgba(0,0,0,0.7)]
            px-5 py-5">
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#4ade80] opacity-40" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#4ade80] opacity-40" />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#4ade80] opacity-40" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#4ade80] opacity-40" />

            {/* Primary stat — streak takes top billing */}
            <div className="mb-4 pb-3.5 border-b border-[#0f2412]">
              <p className="font-mono text-[11px] tracking-[0.3em] text-[#3a5e3d] uppercase mb-1">
                {/* Tune: primary stat label */}
                Active Streak
              </p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-4xl font-bold text-[#4ade80] stat-val"
                  style={{textShadow:"0 0 20px rgba(74,222,128,0.4)"}}>
                  day {currentStreak}
                </p>
                <span className="font-mono text-[13px] text-[#3a5e3d]">{getStreakTitle(currentStreak)}</span>
              </div>
              {/* Tune: reward tier color */}
              <p className="font-mono text-[11px] text-[#2a4a2d] mt-1 tracking-wide">{getStreakRewardValue(currentStreak)}</p>
            </div>

            {/* Secondary stats grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                {/* Tune: label copy */}
                <p className="font-mono text-[10px] tracking-[0.3em] text-[#2a4a2d] uppercase mb-1">Best Run</p>
                <p className="font-mono text-xl font-bold text-[#4ade80] stat-val">day {userStats.bestStreak}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] text-[#2a4a2d] uppercase mb-1">
                  {/* Tune: "Days Logged" or "Total Posts" */}
                  Days Logged
                </p>
                <p className="font-mono text-xl font-bold text-[#4ade80] stat-val">{userStats.posts}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] text-[#2a4a2d] uppercase mb-1">Global Rank</p>
                <p className="font-mono text-xl font-bold text-[#4ade80] stat-val">
                  {userStats.rank ? `#${userStats.rank}` : "—"}
                </p>
              </div>

              {/* Shield inventory — visual treatment */}
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] text-[#2a4a2d] uppercase mb-1">Shields</p>
                {/* Tune: max displayed shields = 5; increase if needed */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {Array.from({length: Math.max(1, Math.min(5, userStats.shields || 0))}).map((_, i) => (
                    <span
                      key={i}
                      className={i < (userStats.shields || 0) ? "shield-active" : ""}
                      style={{
                        fontSize: "16px",
                        lineHeight: 1,
                        /* Tune: dim opacity for inactive shields */
                        opacity: i < (userStats.shields || 0) ? 1 : 0.15,
                        filter: i < (userStats.shields || 0)
                          ? "drop-shadow(0 0 4px rgba(74,222,128,0.7))"
                          : "none",
                        transition: "all 0.3s ease",
                      }}
                    >🛡️</span>
                  ))}
                  {(userStats.shields || 0) === 0 && (
                    <span className="font-mono text-[11px] text-[#1f3020] tracking-wide">no shields</span>
                  )}
                  {(userStats.shields || 0) > 5 && (
                    <span className="font-mono text-[11px] text-[#3a5e3d]">+{userStats.shields - 5}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Acquire Shield ───────────────────────────────────────────────────── */}
      {mounted && hasUsername && (
        <div ref={buyShieldRef} className="w-full max-w-md mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1f3d22]" />
            {/* Tune: section label */}
            <span className="text-[12px] font-mono tracking-[0.3em] text-[#3a5e3d] uppercase">Acquire Shield</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1f3d22]" />
          </div>

          {/* Tune: adjust shadow for card depth */}
          <div className="relative rounded-sm border border-[#1f4020] bg-[#05100a]
            shadow-[inset_0_1px_0_rgba(74,222,128,0.1),0_0_32px_rgba(74,222,128,0.06),0_4px_24px_rgba(0,0,0,0.6)]
            px-5 py-5 flex flex-col gap-4">
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#4ade80] opacity-40" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#4ade80] opacity-40" />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#4ade80] opacity-40" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#4ade80] opacity-40" />

            {/* Price + burn wallet */}
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[13px] text-[#4ade80] font-semibold tracking-wide">
                🛡️ 1 shield — 50,000 $TOUCHGRASS
              </p>

              {/* Burn wallet block */}
              <div className="flex flex-col gap-2 border border-[#1a3520] rounded-sm bg-[#030a04] px-4 py-3">
                <p className="font-mono text-[11px] text-[#3a5e3d] tracking-widest uppercase">
                  Send 50,000 $TOUCHGRASS to the official burn wallet:
                </p>

                {/* .sol domain row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] text-[#4ade80] font-semibold tracking-wide">
                    touchgrassburn.sol
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("touchgrassburn.sol").catch(() => {});
                      setCopiedDomain(true);
                      setShowPasteTip(true);
                      setTimeout(() => setCopiedDomain(false), 1500);
                    }}
                    className={`
                      font-mono text-[11px] tracking-widest uppercase px-2.5 py-1 rounded-sm
                      transition-all duration-200 btn-press flex-shrink-0
                      ${copiedDomain
                        ? "border border-[#4ade80] text-[#4ade80] shadow-[0_0_10px_rgba(74,222,128,0.3)]"
                        : "border border-[#1f3d22] text-[#3a5e3d] hover:border-[#4ade80] hover:text-[#4ade80]"
                      }
                    `}
                  >
                    {copiedDomain ? "✓ copied" : "copy"}
                  </button>
                </div>

                {/* Raw address row */}
                <div className="flex flex-col gap-1.5">
                  <p className="font-mono text-[11px] text-[#2a4a2d] tracking-widest uppercase">Resolves to:</p>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] text-[#3a5e3d] break-all leading-relaxed">
                      GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K").catch(() => {});
                        setCopiedAddr(true);
                        setShowPasteTip(true);
                        setTimeout(() => setCopiedAddr(false), 1500);
                      }}
                      className={`
                        font-mono text-[11px] tracking-widest uppercase px-2.5 py-1 rounded-sm
                        transition-all duration-200 btn-press flex-shrink-0 mt-0.5
                        ${copiedAddr
                          ? "border border-[#4ade80] text-[#4ade80] shadow-[0_0_10px_rgba(74,222,128,0.3)]"
                          : "border border-[#1f3d22] text-[#3a5e3d] hover:border-[#4ade80] hover:text-[#4ade80]"
                        }
                      `}
                    >
                      {copiedAddr ? "✓ copied" : "copy"}
                    </button>
                  </div>
                </div>

                {/* Solscan link */}
                <a
                  href="https://solscan.io/account/GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-[#2a4a2d] hover:text-[#3a5e3d] transition-colors tracking-wide self-start"
                >
                  View on Solscan ↗
                </a>

                {/* Verify warning */}
                <p className="font-mono text-[11px] text-[#1f3020] tracking-wide">
                  Always verify the address matches before sending.
                </p>

                {/* Total burned stat — sourced from approved ShieldPurchases * 50000 */}
                {totalBurned !== null && (
                  <p className="font-mono text-[11px] text-[#2a4a2d] tracking-wide">
                    {/* Tune: wording for in-section burned total */}
                    total burned through shields:{" "}
                    <span className="text-[#3a5e3d]">{totalBurned.toLocaleString()} $TOUCHGRASS</span>
                  </p>
                )}

                {/* Paste nudge - only shown after a copy action */}
                {showPasteTip && (
                  <p className="font-mono text-[11px] text-[#2a4a2d] tracking-wide">
                    paste your transaction below once sent
                  </p>
                )}
              </div>
            </div>

            {purchaseStatus === "success" ? (
              <div className="flex flex-col gap-1 py-1">
                <p className="font-mono text-[13px] text-[#4ade80] tracking-wide"
                  style={{textShadow:"0 0 10px rgba(74,222,128,0.4)"}}>
                  ✅ shield request logged — pending verification
                </p>
                <p className="font-mono text-[11px] text-[#2a4a2d] tracking-wide">
                  credits are applied manually after on-chain confirmation
                </p>
                <button
                  onClick={() => setPurchaseStatus(null)}
                  className="font-mono text-[11px] text-[#2a4a2d] hover:text-[#3a5e3d] transition-colors mt-2 self-start tracking-widest uppercase btn-press"
                >
                  + submit another
                </button>
              </div>
            ) : (
              <>
                {/* TX signature */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[11px] tracking-[0.3em] text-[#4ade80] uppercase opacity-50">
                    {/* Tune: field label */}
                    Transaction Signature *
                  </label>
                  <input
                    type="text"
                    value={purchaseTxSig}
                    onChange={(e) => { setPurchaseTxSig(e.target.value); setPurchaseStatus(null); }}
                    placeholder="paste your tx hash"
                    disabled={purchaseStatus === "loading"}
                    className="
                      w-full bg-[#030a04] border border-[#1a3520]
                      text-[#d1fae5] font-mono text-sm
                      px-4 py-2.5 rounded-sm
                      placeholder:text-[#1f3520]
                      focus:outline-none focus:border-[#4ade80]
                      focus:shadow-[0_0_16px_rgba(74,222,128,0.15)]
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  />
                </div>

                {/* Wallet address */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[11px] tracking-[0.3em] text-[#4ade80] uppercase opacity-50">
                    Wallet <span className="normal-case opacity-60 tracking-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={purchaseWallet}
                    onChange={(e) => setPurchaseWallet(e.target.value)}
                    placeholder="solana address"
                    disabled={purchaseStatus === "loading"}
                    className="
                      w-full bg-[#030a04] border border-[#1a3520]
                      text-[#d1fae5] font-mono text-sm
                      px-4 py-2.5 rounded-sm
                      placeholder:text-[#1f3520]
                      focus:outline-none focus:border-[#4ade80]
                      focus:shadow-[0_0_16px_rgba(74,222,128,0.15)]
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  />
                </div>

                {/* Error */}
                {purchaseStatus === "error" && purchaseError && (
                  <p className="font-mono text-[12px] text-[#ef4444] tracking-wide">
                    ✕ {purchaseError}
                  </p>
                )}

                {/* Submit — tune: button label */}
                <button
                  onClick={handleBuyShield}
                  disabled={purchaseStatus === "loading"}
                  className={`
                    w-full font-mono text-sm font-bold tracking-widest uppercase
                    py-2.5 rounded-sm transition-all duration-200 btn-press
                    ${purchaseStatus === "loading"
                      ? "bg-[#1a3520] border border-[#2d5e30] text-[#4ade80] opacity-60 cursor-not-allowed"
                      : "bg-transparent border border-[#4ade80] text-[#4ade80] hover:bg-[#0a1f0d] hover:shadow-[0_0_24px_rgba(74,222,128,0.25)] hover:border-[#5efa92]"
                    }
                  `}
                >
                  {purchaseStatus === "loading" ? "submitting…" : "🛡️ activate shield"}
                </button>

                {/* Latest purchase status — shown when not in success/error state */}
                {latestPurchase && purchaseStatus !== "success" && purchaseStatus !== "error" && (
                  <p className={`font-mono text-[12px] tracking-wide ${
                    latestPurchase.status === "approved" ? "text-[#4ade80]" :
                    latestPurchase.status === "rejected" ? "text-[#ef4444]" :
                    "text-[#f59e0b]"
                  }`}>
                    {latestPurchase.status === "approved" && "✅ shield credited to your account"}
                    {latestPurchase.status === "rejected" && "❌ purchase rejected — check transaction"}
                    {latestPurchase.status === "pending"  && "⏳ shield purchase pending"}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}


      {/* Live Activity Feed */}
      <div className="w-full max-w-md mb-8">
        <StreakFeed />
      </div>


      {/* Certificate */}
      {imageSrc && hasUsername && (
        <div ref={resultRef} className="mt-8 w-full max-w-4xl cert-reveal">
          <p className="text-center text-sm tracking-widest text-[#4ade80] uppercase mb-6">
            ✦ Certificate Generated ✦
          </p>
          <ResultCard
            imageSrc={imageSrc}
            username={username}
            initialStreak={displayStreak}
            onStreakUpdate={setCurrentStreak}
          />
          <div className="flex justify-center mt-10">
            {/* Tune: leaderboard link wording */}
            <a
              href="/leaderboard"
              className="
                inline-flex items-center gap-2
                font-mono text-[12px] tracking-widest uppercase
                text-[#4ade80] opacity-50
                hover:opacity-100 hover:shadow-[0_0_20px_rgba(74,222,128,0.4)]
                transition-all duration-200 btn-press
              "
            >
              ◈ View Rankings
            </a>
          </div>
        </div>
      )}

      {/* Animated grass line */}
      <div className="w-full max-w-2xl px-4 mb-6 mt-16" aria-hidden="true">
        <svg className="grass-line w-full" height="28" viewBox="0 0 600 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity:0.18}}>
          {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24].map((i) => {
            const x = i * 24 + 4;
            const h = 10 + (i % 3) * 6 + (i % 5) * 3;
            const cx = x + 4;
            return <path key={i} d={`M${x} 28 Q${cx} ${28-h} ${x+8} 28`} fill="#4ade80" />;
          })}
        </svg>
      </div>

      <footer className="mt-2 text-[#1f3520] text-[12px] text-center pb-4 tracking-widest uppercase">
        {/* Tune: footer copy */}
        © {new Date().getFullYear()} Proof of Grass · $TOUCHGRASS
      </footer>
      </div>{/* end z-10 wrapper */}
    </main>
  );
}