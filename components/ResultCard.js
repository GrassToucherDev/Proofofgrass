import { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "../utils/supabase";

// Caption pools tiered by streak length
const CAPTION_POOLS = {
  beginner: [
    "just touched grass. strong start. 🌿",
    "day one. certified grass toucher.",
    "left the screen. touched the ground. character arc initiated.",
    "outside logged. vitamin d detected. streak: active.",
    "not financial advice, but touch grass. this is my proof.",
    "skill check passed. grass interaction: successful.",
    "gm from outside. yes, outside. the big open-world map.",
    "offline for 20 minutes. came back with grass on my shoes.",
  ],
  momentum: [
    "still going. streak getting real. 🌿",
    "three days in. the algorithm does not know where i am.",
    "grass touched again. this might be a habit.",
    "consistent. outside. undefeated.",
    "real-world xp farming session complete. streak: locked.",
    "the outdoor meta is holding. i am staying in.",
    "disconnected from wi-fi. connected to chlorophyll. again.",
    "dev update: shipped another walk. zero bugs.",
  ],
  strong: [
    "consistency looking dangerous. 🌿",
    "one week in. the grass knows my name now.",
    "seven days of proof. this is no longer a coincidence.",
    "streak so strong it has its own lore.",
    "this started as a joke. it is not a joke anymore.",
    "certified long-term grass enjoyer. data-backed.",
    "i have touched more grass than most nfts.",
    "the streak is real. the grass is real. i am real.",
  ],
  elite: [
    "this isn't a phase anymore. it's identity. 🌿",
    "two weeks of grass. i am the outdoor meta.",
    "streak unlocked: outdoor main character.",
    "the leaderboard feared this day.",
    "some people have lore. i have a streak.",
    "i do not go outside anymore. i simply return.",
    "fully on-chain. fully outside. no contradictions.",
    "elite grass toucher. verified. unstoppable.",
  ],
};

function getPool(streak) {
  if (streak >= 14) return CAPTION_POOLS.elite;
  if (streak >= 7)  return CAPTION_POOLS.strong;
  if (streak >= 3)  return CAPTION_POOLS.momentum;
  return CAPTION_POOLS.beginner;
}

function pickCaption(streak, exclude) {
  const pool = getPool(streak).filter((c) => c !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

function getStreakTitle(streak) {
  if (streak >= 30) return "👑 grass god";
  if (streak >= 14) return "🔥 locked in";
  if (streak >= 7)  return "🌳 rooted";
  if (streak >= 3)  return "🌿 sprout";
  return "🌱 seed";
}

function getMilestoneMsg(streak) {
  if (streak === 3)  return "momentum building";
  if (streak === 5)  return "locked in";
  if (streak === 7)  return "strong streak";
  if (streak === 14) return "elite";
  return null;
}

// username — already normalized by index.js
// initialStreak — preloaded by index.js before this component mounts
// onStreakUpdate — callback so index.js stays in sync after submit
export default function ResultCard({ imageSrc, username, initialStreak = 1, onStreakUpdate }) {
  const canvasRef = useRef(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [caption, setCaption] = useState(() => pickCaption(initialStreak, null));
  const [copied, setCopied] = useState(false);

  // currentStreak is seeded from initialStreak prop
  const [currentStreak, setCurrentStreak] = useState(initialStreak);

  // Keep in sync if parent re-computes streak while component is mounted
  useEffect(() => {
    setCurrentStreak(initialStreak);
    // Refresh caption pool to match the new streak tier
    setCaption((prev) => pickCaption(initialStreak, prev));
  }, [initialStreak]);

  // Submission form state — no username input here, it comes from props
  const [tweetUrl, setTweetUrl] = useState("");
  const [submitStatus, setSubmitStatus] = useState(null); // null | "loading" | "success" | "error"
  const [submitError, setSubmitError] = useState("");

  // Local countdown for the lock-in screen (ms until next UTC midnight)
  const [lockCountdown, setLockCountdown] = useState("");
  useEffect(() => {
    function calc() {
      const diff = new Date().setUTCHours(24,0,0,0) - Date.now();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLockCountdown(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }
    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, []);

  const handleNewCaption = useCallback(() => {
    setCaption((prev) => pickCaption(currentStreak, prev));
    setCopied(false);
  }, [currentStreak]);

  const HANDLE = "@XTouchGrass";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`${caption}\n\n${HANDLE}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [caption]);

  const [shared, setShared] = useState(false);

  const handleShareAndPost = useCallback(() => {
    // Build the exact tweet text
    const text = `${caption}\n\nday ${currentStreak}\n@XTouchGrass\n#proofofgrass\nhttps://proofofgrass.vercel.app/`;

    // Copy to clipboard (failure is non-blocking)
    navigator.clipboard.writeText(text).catch(() => {});

    // Open X compose window
    const encoded = encodeURIComponent(text);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank");

    setShared(true);
    setTimeout(() => setShared(false), 2500);
  }, [caption, currentStreak]);

  const handleSubmit = useCallback(async () => {
    if (!username) {
      setSubmitError("No username found. Please refresh and try again.");
      setSubmitStatus("error");
      return;
    }
    if (!tweetUrl.trim()) {
      setSubmitError("Enter your post URL.");
      setSubmitStatus("error");
      return;
    }
    setSubmitStatus("loading");
    setSubmitError("");

    // Build UTC date boundaries for today
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    const todayDateStr = todayStart.toISOString().slice(0, 10);
    const yesterdayDateStr = new Date(todayStart.getTime() - 86400000)
      .toISOString().slice(0, 10);

    // 1. Duplicate check — one submission per username per UTC day
    const { data: existing, error: checkError } = await supabase
      .from("Submissions")
      .select("id")
      .eq("username", username)
      .gte("created_at", todayStart.toISOString())
      .lt("created_at", tomorrowStart.toISOString())
      .limit(1);

    if (checkError) {
      setSubmitError("Could not verify submission. Try again.");
      setSubmitStatus("error");
      return;
    }

    if (existing && existing.length > 0) {
      setSubmitError("You\'ve already submitted today. Come back tomorrow. 🌿");
      setSubmitStatus("error");
      return;
    }

    // 2. Insert submission
    const { error: insertError } = await supabase
      .from("Submissions")
      .insert([{ username, tweet_url: tweetUrl.trim() }]);

    if (insertError) {
      if (insertError.code === "23505") {
        setSubmitError("You\'ve already submitted today. Come back tomorrow. 🌿");
      } else {
        setSubmitError(insertError.message || "Something went wrong. Try again.");
      }
      setSubmitStatus("error");
      return;
    }

    // 3. Upsert streak
    const { data: streakRow } = await supabase
      .from("Streaks")
      .select("current_streak, best_streak, last_submission_date")
      .eq("username", username)
      .maybeSingle();

    let newStreak = 1;
    if (streakRow) {
      const last = streakRow.last_submission_date;
      if (last === todayDateStr) {
        newStreak = streakRow.current_streak;
      } else if (last === yesterdayDateStr) {
        newStreak = streakRow.current_streak + 1;
      } else {
        newStreak = 1;
      }
    }

    const existingBest = streakRow?.best_streak ?? streakRow?.current_streak ?? 1;
    const newBest = Math.max(newStreak, existingBest);

    await supabase.from("Streaks").upsert({
      username,
      current_streak: newStreak,
      best_streak: newBest,
      last_submission_date: todayDateStr,
    }, { onConflict: "username" });

    setCurrentStreak(newStreak);
    onStreakUpdate?.(newStreak);
    setSubmitStatus("success");
    setTweetUrl("");
  }, [username, tweetUrl, onStreakUpdate]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).toUpperCase();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = 1600;
    const H = 900;
    canvas.width = W;
    canvas.height = H;

    const img = new Image();
    img.onload = () => {

      // ─── BACKGROUND ───────────────────────────────────────────────
      const bgGrad = ctx.createRadialGradient(W * 0.42, H * 0.5, 80, W * 0.5, H * 0.5, W * 0.72);
      bgGrad.addColorStop(0,   "#0e1f10");
      bgGrad.addColorStop(0.5, "#080f09");
      bgGrad.addColorStop(1,   "#030705");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      for (let i = 0; i < 18000; i++) {
        const nx = Math.random() * W;
        const ny = Math.random() * H;
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.018})`;
        ctx.fillRect(nx, ny, 1, 1);
      }
      ctx.restore();

      // ─── GREEN GLOW SOURCES ────────────────────────────────────────
      const glowTR = ctx.createRadialGradient(W * 0.78, H * 0.1, 0, W * 0.78, H * 0.1, 480);
      glowTR.addColorStop(0,   "rgba(74,222,128,0.13)");
      glowTR.addColorStop(0.5, "rgba(74,222,128,0.04)");
      glowTR.addColorStop(1,   "rgba(74,222,128,0)");
      ctx.fillStyle = glowTR;
      ctx.fillRect(0, 0, W, H);

      const glowBL = ctx.createRadialGradient(W * 0.2, H * 0.9, 0, W * 0.2, H * 0.9, 380);
      glowBL.addColorStop(0,   "rgba(52,211,153,0.10)");
      glowBL.addColorStop(1,   "rgba(52,211,153,0)");
      ctx.fillStyle = glowBL;
      ctx.fillRect(0, 0, W, H);

      const glowBadge = ctx.createRadialGradient(W * 0.73, H * 0.38, 0, W * 0.73, H * 0.38, 220);
      glowBadge.addColorStop(0,   "rgba(74,222,128,0.18)");
      glowBadge.addColorStop(1,   "rgba(74,222,128,0)");
      ctx.fillStyle = glowBadge;
      ctx.fillRect(0, 0, W, H);

      // ─── GRID OVERLAY ──────────────────────────────────────────────
      ctx.save();
      ctx.strokeStyle = "rgba(74,222,128,0.028)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 48) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 48) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();

      // ─── DIAGONAL LIGHT STREAK ─────────────────────────────────────
      ctx.save();
      ctx.rotate(Math.PI / 6);
      const streak = ctx.createLinearGradient(600, -200, 1200, 300);
      streak.addColorStop(0,   "rgba(74,222,128,0)");
      streak.addColorStop(0.5, "rgba(74,222,128,0.06)");
      streak.addColorStop(1,   "rgba(74,222,128,0)");
      ctx.fillStyle = streak;
      ctx.fillRect(400, -400, 120, 1600);
      ctx.restore();

      // ─── LEFT IMAGE PANEL ──────────────────────────────────────────
      const SPLIT = 870;
      const PAD = 52;
      const imgAreaW = SPLIT - PAD * 2;
      const imgAreaH = H - PAD * 2;
      const scale = Math.min(imgAreaW / img.width, imgAreaH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = PAD + (imgAreaW - dw) / 2;
      const dy = PAD + (imgAreaH - dh) / 2;

      const photoGlow = ctx.createRadialGradient(
        dx + dw / 2, dy + dh / 2, Math.min(dw, dh) * 0.3,
        dx + dw / 2, dy + dh / 2, Math.max(dw, dh) * 0.8
      );
      photoGlow.addColorStop(0,   "rgba(74,222,128,0.0)");
      photoGlow.addColorStop(0.7, "rgba(74,222,128,0.08)");
      photoGlow.addColorStop(1,   "rgba(74,222,128,0.0)");
      ctx.fillStyle = photoGlow;
      ctx.fillRect(dx - 40, dy - 40, dw + 80, dh + 80);

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 12;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.7)";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "rgba(74,222,128,0.55)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(dx, dy, dw, dh);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dx, dy + dh);
      ctx.lineTo(dx, dy);
      ctx.lineTo(dx + dw, dy);
      ctx.stroke();
      ctx.restore();

      // ─── DIVIDER ───────────────────────────────────────────────────
      const divGrad = ctx.createLinearGradient(SPLIT, 0, SPLIT, H);
      divGrad.addColorStop(0,   "rgba(74,222,128,0)");
      divGrad.addColorStop(0.2, "rgba(74,222,128,0.4)");
      divGrad.addColorStop(0.5, "rgba(74,222,128,0.7)");
      divGrad.addColorStop(0.8, "rgba(74,222,128,0.4)");
      divGrad.addColorStop(1,   "rgba(74,222,128,0)");
      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.9)";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = divGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(SPLIT, 30);
      ctx.lineTo(SPLIT, H - 30);
      ctx.stroke();
      ctx.restore();

      // ─── RIGHT PANEL ───────────────────────────────────────────────
      const RX = SPLIT + 68;
      const RW = W - SPLIT - 90;
      const CX = RX + RW / 2;

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.012)";
      roundRect(ctx, SPLIT + 28, 38, W - SPLIT - 56, H - 76, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(74,222,128,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // ── OVERLINE TAG ──
      const tagW = 260, tagH = 28, tagX = CX - tagW / 2, tagY = 72;
      const tagGrad = ctx.createLinearGradient(tagX, tagY, tagX + tagW, tagY);
      tagGrad.addColorStop(0,   "rgba(74,222,128,0.0)");
      tagGrad.addColorStop(0.2, "rgba(74,222,128,0.18)");
      tagGrad.addColorStop(0.8, "rgba(74,222,128,0.18)");
      tagGrad.addColorStop(1,   "rgba(74,222,128,0.0)");
      ctx.fillStyle = tagGrad;
      roundRect(ctx, tagX, tagY, tagW, tagH, 4);
      ctx.fill();

      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#4ade80";
      ctx.font = "700 15px monospace";
      ctx.letterSpacing = "5px";
      ctx.textAlign = "center";
      ctx.fillText("✦  OFFICIAL CERTIFICATE  ✦", CX, tagY + 19);
      ctx.restore();

      // ── GLOWING TITLE LINE ──
      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.5)";
      ctx.shadowBlur = 28;
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 66px monospace";
      ctx.textAlign = "center";
      ctx.fillText("VERIFIED", CX, 198);
      ctx.restore();

      const grassGrad = ctx.createLinearGradient(CX - 260, 0, CX + 260, 0);
      grassGrad.addColorStop(0,   "#6ee7b7");
      grassGrad.addColorStop(0.5, "#4ade80");
      grassGrad.addColorStop(1,   "#34d399");
      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.6)";
      ctx.shadowBlur = 22;
      ctx.fillStyle = grassGrad;
      ctx.font = "700 52px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GRASS TOUCHER", CX, 268);
      ctx.restore();

      drawGlowRule(ctx, CX, 298, 340);

      // ── DATE ──
      ctx.fillStyle = "rgba(74,222,128,0.45)";
      ctx.font = "600 15px monospace";
      ctx.letterSpacing = "3px";
      ctx.textAlign = "center";
      ctx.fillText("DATE OF CERTIFICATION", CX, 346);

      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.3)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#d1fae5";
      ctx.font = "400 28px monospace";
      ctx.textAlign = "center";
      ctx.fillText(dateStr, CX, 384);
      ctx.restore();

      drawGlowRule(ctx, CX, 408, 260);

      // ── STREAK ──
      ctx.fillStyle = "rgba(74,222,128,0.45)";
      ctx.font = "600 15px monospace";
      ctx.letterSpacing = "3px";
      ctx.textAlign = "center";
      ctx.fillText("CURRENT STREAK", CX, 454);

      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.65)";
      ctx.shadowBlur = 40;
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 108px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`DAY ${currentStreak}`, CX, 570);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.35)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#4ade80";
      ctx.font = "400 21px monospace";
      ctx.letterSpacing = "2px";
      ctx.textAlign = "center";
      ctx.fillText("🌿  KEEP GOING. TOUCH MORE.", CX, 618);
      ctx.restore();

      drawBrackets(ctx, SPLIT + 36, 46, W - 44, H - 46, 26);

      // ─── BOTTOM BAR ────────────────────────────────────────────────
      const barY = H - 64;
      const barGrad = ctx.createLinearGradient(0, barY, W, barY);
      barGrad.addColorStop(0,    "rgba(74,222,128,0.0)");
      barGrad.addColorStop(0.15, "rgba(74,222,128,0.14)");
      barGrad.addColorStop(0.85, "rgba(74,222,128,0.14)");
      barGrad.addColorStop(1,    "rgba(74,222,128,0.0)");
      ctx.fillStyle = barGrad;
      ctx.fillRect(0, barY - 1, W, 1);

      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.3)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(209,250,229,0.72)";
      ctx.font = "italic 400 26px 'Georgia', serif";
      ctx.letterSpacing = "0.5px";
      ctx.textAlign = "center";
      ctx.fillText('"We do touch grass… it\'s the new trend."', W / 2, H - 24);
      ctx.restore();

      ctx.fillStyle = "rgba(74,222,128,0.12)";
      ctx.font = "700 15px monospace";
      ctx.letterSpacing = "3px";
      ctx.textAlign = "left";
      ctx.fillText("PROOF-OF-GRASS", 44, H - 24);

      ctx.fillStyle = "rgba(74,222,128,0.12)";
      ctx.textAlign = "right";
      ctx.fillText("BLOCKCHAIN VERIFIED", W - 44, H - 24);

      // ─── LOGO ──────────────────────────────────────────────────────
      const logo = new Image();
      logo.onload = () => {
        const logoSize = 160;
        const gapTop = 638;
        const gapBot = H - 64;
        const logoX = CX - logoSize / 2;
        const logoY = gapTop + (gapBot - gapTop) / 2 - logoSize / 2;

        const logoGlow = ctx.createRadialGradient(
          logoX + logoSize / 2, logoY + logoSize / 2, 10,
          logoX + logoSize / 2, logoY + logoSize / 2, logoSize
        );
        logoGlow.addColorStop(0,   "rgba(74,222,128,0.22)");
        logoGlow.addColorStop(1,   "rgba(74,222,128,0)");
        ctx.fillStyle = logoGlow;
        ctx.fillRect(logoX - logoSize / 2, logoY - logoSize / 2, logoSize * 2, logoSize * 2);

        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        ctx.restore();

        setDownloadUrl(canvas.toDataURL("image/png"));
      };
      logo.onerror = () => setDownloadUrl(canvas.toDataURL("image/png"));
      logo.src = "/touchgrass-transparent.png";
    };
    img.src = imageSrc;
  }, [imageSrc, dateStr, currentStreak]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Hidden canvas — used only for generation */}
      <canvas
        ref={canvasRef}
        className="hidden"
        style={{ display: "none" }}
      />

      {/* Preview — shown as <img> so iPhone users can long-press to save */}
      <div className="w-full flex flex-col items-center gap-2">
        <div className="w-full overflow-hidden rounded border border-[#1a3a1e] shadow-[0_0_80px_rgba(74,222,128,0.08)]">
          {downloadUrl ? (
            <img
              src={downloadUrl}
              alt="Proof of Grass Certificate"
              className="w-full h-auto block"
              style={{ aspectRatio: "16/9" }}
            />
          ) : (
            <div
              className="w-full bg-[#0a140b] flex items-center justify-center"
              style={{ aspectRatio: "16/9" }}
            >
              <span className="font-mono text-[#2a4a2d] text-xs tracking-widest animate-pulse">
                generating…
              </span>
            </div>
          )}
        </div>
        {downloadUrl && (
          <p className="font-mono text-[10px] text-[#3a5e3d] tracking-wide">
            on iphone: hold the image to save
          </p>
        )}
      </div>

      {/* Download */}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download="proof-of-grass.png"
          className="
            inline-flex items-center gap-3 px-10 py-3.5
            font-mono text-sm font-bold tracking-widest uppercase
            text-[#0d1a0f] bg-[#4ade80]
            rounded-sm transition-all duration-200
            hover:bg-[#86efac] hover:shadow-[0_0_32px_rgba(74,222,128,0.45)]
            shadow-[0_0_20px_rgba(74,222,128,0.25)] cursor-pointer
          "
        >
          ↓ Download Certificate
        </a>
      )}

      {/* Save + Post to X */}
      {downloadUrl && (
        <button
          onClick={handleShareAndPost}
          className={`
            inline-flex items-center gap-3 px-10 py-3.5
            font-mono text-sm font-bold tracking-widest uppercase rounded-sm
            transition-all duration-200
            ${shared
              ? "bg-[#166534] border border-[#4ade80] text-[#4ade80] shadow-[0_0_20px_rgba(74,222,128,0.2)]"
              : "bg-transparent border border-[#4ade80] text-[#4ade80] hover:bg-[#0d2b14] hover:shadow-[0_0_24px_rgba(74,222,128,0.25)]"
            }
          `}
        >
          {shared ? (
            <><span>✓</span> copied — opening x…</>
          ) : (
            <>⬆ post on x</>
          )}
        </button>
      )}

      {/* Caption Generator */}
      <div className="w-full max-w-2xl mt-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1f3d22]" />
          <span className="text-[10px] font-mono tracking-[0.3em] text-[#3a5e3d] uppercase">
            Caption Generator
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1f3d22]" />
        </div>

        <div className="
          relative rounded-sm border border-[#1a3520]
          bg-[#0a140b]
          shadow-[inset_0_1px_0_rgba(74,222,128,0.06),0_0_24px_rgba(0,0,0,0.4)]
          px-6 py-5
        ">
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#4ade80] opacity-30" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#4ade80] opacity-30" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#4ade80] opacity-30" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#4ade80] opacity-30" />
          <p className="
            font-mono text-[15px] text-[#d1fae5] leading-relaxed
            text-center min-h-[2.5rem] flex items-center justify-center
            transition-all duration-300
          ">
            {caption}
          </p>
          <p className="font-mono text-[12px] text-[#4ade80] text-center mt-2 opacity-50 tracking-wider">
            {HANDLE}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleNewCaption}
            className="
              flex-1 flex items-center justify-center gap-2
              py-2.5 px-4
              border border-[#1f3d22] bg-[#0a140b]
              text-[#4ade80] font-mono text-xs tracking-widest uppercase
              rounded-sm transition-all duration-200
              hover:border-[#4ade80] hover:bg-[#0d1f0f]
              hover:shadow-[0_0_16px_rgba(74,222,128,0.15)]
            "
          >
            <span className="text-base leading-none">↺</span> New Caption
          </button>
          <button
            onClick={handleCopy}
            className={`
              flex-1 flex items-center justify-center gap-2
              py-2.5 px-4
              font-mono text-xs tracking-widest uppercase rounded-sm
              transition-all duration-200
              ${copied
                ? "bg-[#166534] border border-[#4ade80] text-[#4ade80] shadow-[0_0_20px_rgba(74,222,128,0.2)]"
                : "bg-[#4ade80] text-[#0d1a0f] border border-transparent hover:bg-[#86efac] hover:shadow-[0_0_20px_rgba(74,222,128,0.3)]"
              }
            `}
          >
            {copied ? (
              <><span className="text-base leading-none">✓</span> Copied!</>
            ) : (
              <><span className="text-base leading-none">⎘</span> Copy Caption</>
            )}
          </button>
        </div>
      </div>

      {/* Leaderboard Submission */}
      <div className="w-full max-w-2xl mt-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1f3d22]" />
          <span className="text-[10px] font-mono tracking-[0.3em] text-[#3a5e3d] uppercase">
            Submit to Leaderboard
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1f3d22]" />
        </div>

        <div className="
          relative rounded-sm border border-[#1a3520]
          bg-[#0a140b]
          shadow-[inset_0_1px_0_rgba(74,222,128,0.06),0_0_24px_rgba(0,0,0,0.4)]
          px-6 py-5 flex flex-col gap-4
        ">
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#4ade80] opacity-30" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#4ade80] opacity-30" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#4ade80] opacity-30" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#4ade80] opacity-30" />

          {/* Submission guidelines */}
          <div className="font-mono text-[10px] text-[#2a4a2d] tracking-wide border border-[#1a3520] rounded-sm px-3 py-2.5 bg-[#060e07]">
            <p className="text-[#3a5e3d] uppercase tracking-widest mb-1">submissions must include:</p>
            <p>· your proof of grass certificate</p>
            <p>· a valid x post link</p>
            <p>· @XTouchGrass</p>
          </div>

          {/* Submitting as — read-only, sourced from props */}
          <div className="flex flex-col gap-0.5">
            <p className="font-mono text-[11px] text-[#3a5e3d] tracking-wide">
              submitting as{" "}
              <span className="text-[#4ade80]">@{username}</span>
            </p>
            <p className="font-mono text-[11px] text-[#4ade80] tracking-wide">
              {getStreakTitle(currentStreak)}
            </p>
            <p className="font-mono text-[11px] text-[#3a5e3d] tracking-wide">
              streak{" "}
              <span className="text-[#4ade80]">day {currentStreak}</span>
            </p>
          </div>

          {/* X Post URL */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-[0.25em] text-[#4ade80] uppercase opacity-60">
              X Post URL
            </label>
            <input
              type="url"
              value={tweetUrl}
              onChange={(e) => { setTweetUrl(e.target.value); setSubmitStatus(null); }}
              placeholder="https://x.com/yourhandle/status/..."
              disabled={submitStatus === "loading" || submitStatus === "success"}
              className="
                w-full bg-[#060e07] border border-[#1f3d22]
                text-[#d1fae5] font-mono text-sm
                px-4 py-2.5 rounded-sm
                placeholder:text-[#2a4a2d]
                focus:outline-none focus:border-[#4ade80]
                focus:shadow-[0_0_12px_rgba(74,222,128,0.15)]
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200
              "
            />
          </div>

          {/* Lock-in screen — replaces submit area on success */}
          {submitStatus === "success" && (() => {
            const s = currentStreak;
            const nextMilestone = s < 3 ? 3 : s < 5 ? 5 : s < 7 ? 7 : s + 1;
            return (
              <div className="
                flex flex-col items-center gap-5 px-5 py-7
                bg-[#07110a] border border-[#4ade80] rounded-sm
                shadow-[0_0_40px_rgba(74,222,128,0.22),inset_0_1px_0_rgba(74,222,128,0.12)]
                font-mono text-center
              ">
                {/* Headline — copy varies by streak day */}
                <div className="flex flex-col gap-1.5">
                  <span
                    className="text-[#4ade80] text-lg font-bold tracking-wide"
                    style={{textShadow:"0 0 16px rgba(74,222,128,0.6)"}}
                  >
                    ✅ day {currentStreak} locked in
                  </span>
                  <span className="text-[#86efac] text-sm font-semibold">
                    {currentStreak === 1 ? "🌱 your streak starts now" : "🔥 your streak is alive"}
                  </span>
                </div>

                {/* Urgency countdown */}
                <div>
                  <p
                    className="text-[#f59e0b] text-sm font-bold tabular-nums tracking-wide"
                    style={{textShadow:"0 0 10px rgba(245,158,11,0.4)"}}
                  >
                    🔥 {lockCountdown} until reset
                  </p>
                </div>

                {/* Streak milestone callout */}
                {getMilestoneMsg(currentStreak) && (
                  <p className="text-[#f59e0b] text-[10px] tracking-widest uppercase font-semibold">
                    milestone: {getMilestoneMsg(currentStreak)}
                  </p>
                )}

                {/* Next milestone */}
                <p className="text-[#3a5e3d] text-[10px] tracking-widest uppercase">
                  next milestone: <span className="text-[#4ade80]">day {nextMilestone}</span>
                </p>

                {/* Reinforcement */}
                <p className="text-[#2a4a2d] text-[10px] tracking-wide">
                  don't break it tomorrow
                </p>

                {/* Challenge / share loop CTA */}
                <p className="text-[#2a4a2d] text-[10px] tracking-wide border-t border-[#1a3520] pt-3 w-full text-center">
                  challenge someone to beat your streak →{" "}
                  <button
                    onClick={handleShareAndPost}
                    className="text-[#4ade80] underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    share on x
                  </button>
                </p>

                {/* Buttons — Post on X (primary), View Leaderboard (secondary) */}
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={handleShareAndPost}
                    className="
                      w-full inline-flex items-center justify-center gap-2 px-5 py-2.5
                      font-mono text-xs font-bold tracking-widest uppercase
                      bg-[#4ade80] text-[#07110a]
                      rounded-sm hover:bg-[#86efac]
                      hover:shadow-[0_0_24px_rgba(74,222,128,0.45)]
                      transition-all duration-200
                    "
                  >
                    ⬆ post on x
                  </button>
                  <a
                    href="/leaderboard"
                    className="
                      w-full inline-flex items-center justify-center gap-2 px-5 py-2.5
                      font-mono text-xs tracking-widest uppercase
                      border border-[#2d5e30] text-[#4ade80]
                      rounded-sm hover:bg-[#0d2b14]
                      hover:shadow-[0_0_16px_rgba(74,222,128,0.15)]
                      transition-all duration-200
                    "
                  >
                    🌱 view leaderboard
                  </a>
                </div>
              </div>
            );
          })()}
          {submitStatus === "error" && submitError && (
            <div className="
              flex items-center gap-2 px-4 py-2.5
              bg-[#1f0a0a] border border-[#7f1d1d] rounded-sm
              font-mono text-xs text-[#f87171] tracking-wide
            ">
              <span>✕</span> {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={submitStatus === "loading" || submitStatus === "success"}
            className={`
              w-full flex items-center justify-center gap-2
              py-3 px-4
              font-mono text-xs font-bold tracking-widest uppercase rounded-sm
              transition-all duration-200
              ${submitStatus === "success"
                ? "bg-[#166534] border border-[#4ade80] text-[#4ade80] cursor-not-allowed opacity-70"
                : submitStatus === "loading"
                ? "bg-[#1a3520] border border-[#2d5e30] text-[#4ade80] cursor-not-allowed opacity-60"
                : "bg-transparent border border-[#4ade80] text-[#4ade80] hover:bg-[#0d2b14] hover:shadow-[0_0_20px_rgba(74,222,128,0.2)]"
              }
            `}
          >
            {submitStatus === "loading" ? (
              <><span className="animate-pulse">●</span> Submitting…</>
            ) : submitStatus === "success" ? null : (
              <><span>⬆</span> Submit to Leaderboard</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawGlowRule(ctx, cx, y, halfW) {
  const grad = ctx.createLinearGradient(cx - halfW, y, cx + halfW, y);
  grad.addColorStop(0,   "rgba(74,222,128,0)");
  grad.addColorStop(0.3, "rgba(74,222,128,0.5)");
  grad.addColorStop(0.7, "rgba(74,222,128,0.5)");
  grad.addColorStop(1,   "rgba(74,222,128,0)");
  ctx.save();
  ctx.shadowColor = "rgba(74,222,128,0.8)";
  ctx.shadowBlur = 8;
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - halfW, y);
  ctx.lineTo(cx + halfW, y);
  ctx.stroke();
  ctx.restore();
}

function drawBrackets(ctx, x1, y1, x2, y2, size) {
  ctx.save();
  ctx.strokeStyle = "rgba(74,222,128,0.45)";
  ctx.shadowColor  = "rgba(74,222,128,0.7)";
  ctx.shadowBlur   = 12;
  ctx.lineWidth    = 1.5;
  ctx.lineCap      = "square";
  const corners = [
    [x1, y1,  1,  1],
    [x2, y1, -1,  1],
    [x1, y2,  1, -1],
    [x2, y2, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * size, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * size);
    ctx.stroke();
  }
  ctx.restore();
}