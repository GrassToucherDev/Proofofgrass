import { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "../utils/supabase";

const CAPTIONS = [
  "Just touched grass. My character arc is complete. 🌿",
  "Skill issue? More like skill grass. Ratio + grass touched.",
  "Certified grass toucher. NPC behavior detected in myself.",
  "Left the metaverse for 10 minutes. 10/10 would recommend.",
  "Touched grass. The frame rate was insane.",
  "GM from outside. Yes, outside. The big open-world map.",
  "Real-world XP farming session complete. Grass: confirmed.",
  "Grass touched. Vitamin D loaded. Serotonin +500.",
  "My therapist said 'go outside.' My therapist was right.",
  "Not financial advice, but touch grass. This is my proof.",
  "Finally minted something that matters. #ProofOfGrass",
  "Floor is: literally the ground. And I touched it.",
  "Skill check passed. Grass interaction: successful.",
  "Main character moment. Outside. No lag. No respawn.",
  "Just airdropped myself into nature. Still bullish.",
  "Offline for 20 minutes. Came back with grass on my shoes.",
  "Disconnected from Wi-Fi. Connected to chlorophyll.",
  "Grass touched. Clouds witnessed. Life confirmed.",
  "Dev update: shipped a walk. Zero bugs. No merge conflicts.",
  "The outdoor meta is undefeated. I've joined the ecosystem.",
];

function pickCaption(exclude) {
  const pool = CAPTIONS.filter((c) => c !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Compute what the streak WILL be after a successful submission today
function computePreviewStreak(streakRow) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (!streakRow) return 1;
  const last = streakRow.last_submission_date;
  if (last === todayStr) return streakRow.current_streak;
  if (last === yesterdayStr) return streakRow.current_streak + 1;
  return 1;
}

// username is already normalized by index.js before being passed in
export default function ResultCard({ imageSrc, username }) {
  const canvasRef = useRef(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [caption, setCaption] = useState(() => pickCaption(null));
  const [copied, setCopied] = useState(false);

  // Submission form state (username comes from props now)
  const [tweetUrl, setTweetUrl] = useState("");
  const [submitStatus, setSubmitStatus] = useState(null); // null | "loading" | "success" | "error"
  const [submitError, setSubmitError] = useState("");
  const [currentStreak, setCurrentStreak] = useState(1);

  const handleNewCaption = useCallback(() => {
    setCaption((prev) => pickCaption(prev));
    setCopied(false);
  }, []);

  const HANDLE = "@XTouchGrass";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`${caption}\n\n${HANDLE}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [caption]);

  const handleSubmit = useCallback(async () => {
    if (!username) {
      setSubmitError("Enter your username.");
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
      .select("current_streak, last_submission_date")
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

    await supabase.from("Streaks").upsert({
      username,
      current_streak: newStreak,
      last_submission_date: todayDateStr,
    }, { onConflict: "username" });

    setCurrentStreak(newStreak);
    setSubmitStatus("success");
    setTweetUrl("");
  }, [username, tweetUrl]);

  // Preload streak as soon as username prop is available (debounced 500ms)
  useEffect(() => {
    if (!username) {
      setCurrentStreak(1);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("Streaks")
          .select("current_streak, last_submission_date")
          .eq("username", username)
          .maybeSingle();
        setCurrentStreak(computePreviewStreak(data));
      } catch {
        setCurrentStreak(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

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
      {/* Preview */}
      <div className="w-full overflow-hidden rounded border border-[#1a3a1e] shadow-[0_0_80px_rgba(74,222,128,0.08)]">
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ aspectRatio: "16/9" }}
        />
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

          {/* Submitting as */}
          <p className="font-mono text-[11px] text-[#3a5e3d] tracking-wide">
            submitting as{" "}
            <span className="text-[#4ade80]">@{username}</span>
            {" "}— streak{" "}
            <span className="text-[#4ade80]">day {currentStreak}</span>
          </p>

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

          {/* Status messages */}
          {submitStatus === "success" && (
            <div className="
              flex items-center gap-2 px-4 py-2.5
              bg-[#0d2b14] border border-[#166534] rounded-sm
              font-mono text-xs text-[#4ade80] tracking-wide
            ">
              <span>✓</span> Submission received. Welcome to the leaderboard.
            </div>
          )}
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
            ) : submitStatus === "success" ? (
              <><span>✓</span> Submitted</>
            ) : (
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