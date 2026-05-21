import { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "../utils/supabase";

// Caption pools — tier-accurate, no day/week-count wording
// beginner: days 1-2 | momentum: days 3-6 | strong: days 7-13 | elite: days 14+
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
    "step one: go outside. step two: take photo. step three: this.",
    "touched grass before checking price. personal record.",
    "irl visit confirmed. grass: present. cope: absent.",
    "proof of work. the work was touching grass.",
    "walked outside. did not refresh x. felt fine.",
    "logged off. went out. came back stronger.",
    "fresh air acquired. timestamp verified. streak: initiated.",
    "certified first step. the streak starts now.",
    "outside for the first time in the timeline. feels different.",
    "grass touched. wallet not checked. healthy.",
    "first log. many more to come.",
    "touched grass. did not die. will do again.",
    "the outdoors: visited. the streak: started.",
    "my phone stayed inside. i did not.",
    "went outside on purpose. documentation attached.",
    "first contact with grass. certified and sealed.",
    "grass detected. proof generated. streak unlocked.",
    "outside interaction complete. logging for the record.",
    "nature: acknowledged. streak: initialized.",
    "the only nft that requires fresh air.",
    "departure from indoors confirmed. timestamp attached.",
    "went out. got proof. came back.",
    "grass: touched. receipt: here.",
    "beginning of something real.",
    "started. the hardest part.",
    "unlocked: fresh air. equipped: accountability.",
    "issued. certified. logged. valid.",
    "the first step is always outside.",
    "grass interaction: confirmed. no excuses needed.",
    "entry logged. streak sequence: initiated.",
    "rare event detected: user touched grass.",
    "first proof. the chain begins here.",
    "character development: going outside.",
    "seed planted. streak started.",
    "outside status: verified. indoor streak: broken.",
    "no cope. just grass. just proof.",
    "the journey starts with one blade of grass.",
    "timestamp: now. location: outside. mood: certified.",
    "submitted. the ledger does not lie.",
    "grass touched. future secured.",
    "documented for the record. this one counts.",
    "outside achievement unlocked.",
  ],
  momentum: [
    "still going. streak getting real. 🌿",
    "the algorithm does not know where i am.",
    "grass touched again. this might be a habit.",
    "consistent. outside. undefeated.",
    "real-world xp farming session complete. streak: locked.",
    "the outdoor meta is holding. i am staying in.",
    "disconnected from wi-fi. connected to chlorophyll. again.",
    "dev update: shipped another walk. zero bugs.",
    "day after day. grass after grass. no signs of stopping.",
    "momentum is real. the outdoors keeps paying dividends.",
    "streak integrity: maintained. grass: touched. witnesses: none needed.",
    "another one. the commitment is showing.",
    "the timeline doesn't know where i go every day.",
    "a pattern is forming. it is green.",
    "i used to doomscroll. now i do this instead.",
    "building a habit one blade of grass at a time.",
    "on-chain activity: walking outside. status: profitable.",
    "no rest days in the grass-touching season.",
    "still outside. still logging. still winning.",
    "streak maintained. skill issue averted.",
    "consecutive days: increasing. excuses: decreasing.",
    "the outdoors has good retention.",
    "another submission. another day ahead of the crowd.",
    "touching grass is the only daily active yield i trust.",
    "my wallet is degen. my schedule is not.",
    "outside committed. streak growing. vibe immaculate.",
    "the streak is compounding.",
    "not stopping. not slowing. not skipping.",
    "routine unlocked. execution ongoing.",
    "daily proof. daily discipline. daily bag.",
    "the routine is real now.",
    "touched grass before most people opened their eyes.",
    "another day, another certificate.",
    "the habit is forming. the proof is here.",
    "consistency is a practice. i am practicing.",
    "streak still alive. enemies still inside.",
    "outside again. on purpose. documented.",
    "grass log submitted. streak defended.",
    "no one said it was easy. i do it anyway.",
    "outdoor streak ongoing. no signs of weakness.",
    "submitted again. the grind continues.",
    "small habit. big compound.",
    "building proof one outdoor session at a time.",
    "another entry. another lock.",
    "the momentum is mine now.",
    "submitted proof. streak secured. moving on.",
    "active. outside. on time. every time.",
    "streak defense: successful.",
    "habit stack: walk outside, take photo, prove it.",
    "the outdoors is my most reliable dapp.",
  ],
  strong: [
    "consistency looking dangerous. 🌿",
    "the grass knows my name now.",
    "this is no longer a coincidence.",
    "streak so strong it has its own lore.",
    "this started as a joke. it is not a joke anymore.",
    "certified long-term grass enjoyer. data-backed.",
    "i have touched more grass than most nfts.",
    "the streak is real. the grass is real. i am real.",
    "the outdoors have accepted me.",
    "daily grass interaction: active. cope: zero.",
    "i have more streak days than most projects have updates.",
    "building something real. outside. with my hands. sort of.",
    "this streak will outlast most alt coins.",
    "no signs of softness. no signs of stopping.",
    "the discipline is on-chain now. no going back.",
    "the streak is now a personality trait.",
    "outside is not a trip anymore. it is a practice.",
    "other people have goals. i have proof.",
    "my streak has better fundamentals than most launches.",
    "doing this long enough that it stopped feeling hard.",
    "streak confirmed. doubt: evaporating.",
    "daily execution. no announcements. just logs.",
    "the protocol runs. i run with it.",
    "not a tourist. a recurring participant.",
    "compounding days of outdoor exposure.",
    "building a track record that speaks for itself.",
    "the field is my office. i clocked in again.",
    "consistently certified. no days off.",
    "showing up beats showing off.",
    "another proof. another brick in the streak.",
    "entered, exited, documented. repeat.",
    "streak health: excellent.",
    "the market moves. i walk outside. both are true.",
    "dedicated to the outdoor grind.",
    "proof submitted. streak untouched. discipline intact.",
    "the grass is familiar territory now.",
    "this is what sustained effort looks like.",
    "strong streak. stronger mindset.",
    "every day outside is a win logged on chain.",
    "long-term holder of the outdoor habit.",
    "still here. still certified. still touching grass.",
    "track record: spotless.",
    "the streak speaks louder than any announcement.",
    "fundamentals: touching grass every single day.",
    "deep in the outdoor accumulation phase.",
    "outdoors: my most consistent investment.",
    "streak alive. discipline unbroken.",
    "the practice continues. no days skipped.",
    "more days outside than most have excuses.",
    "certified operator of the outdoor routine.",
  ],
  elite: [
    "this isn't a phase anymore. it's identity. 🌿",
    "i am the outdoor meta.",
    "streak unlocked: outdoor main character.",
    "the leaderboard feared this day.",
    "some people have lore. i have a streak.",
    "i do not go outside anymore. i simply return.",
    "fully on-chain. fully outside. no contradictions.",
    "elite grass toucher. verified. unstoppable.",
    "the streak has a market cap now.",
    "at this point the grass is just an extension of my wallet.",
    "the outdoor season never ends for me.",
    "not a visitor anymore. a permanent resident of outside.",
    "streak so long it's basically vested.",
    "i have documented more grass than most explorers.",
    "the data speaks. the streak screams.",
    "the others are still inside.",
    "certified outdoor original. no derivative.",
    "the protocol is simple: go outside. do it every day. forever.",
    "i didn't build a streak. i built a ritual.",
    "proof of consistency. certified on every level.",
    "what started as discipline is now architecture.",
    "the leaderboard is a mirror. i like what i see.",
    "running a streak most projects can't sustain.",
    "deeper in the game than most will ever go.",
    "the soil remembers me.",
    "i am not competing. i am documenting.",
    "streak so seasoned it has its own yield.",
    "the outdoors is not a habit. it is infrastructure.",
    "this is not dedication. this is design.",
    "the streak compounds. the legend grows.",
    "proof that consistency is the rarest trait.",
    "built different. logged different.",
    "documented. verified. legendary.",
    "elite status. earned outside. no shortcuts.",
    "the streak is the résumé.",
    "i have outlasted trends, fads, and most projects.",
    "the outdoor practice has become the standard.",
    "they asked what i do every day. i showed them.",
    "streak longevity: exceeds expectations.",
    "proof of life. proof of grass. proof of character.",
    "this is peak outdoor accumulation.",
    "rare. consistent. verified.",
    "i do not announce. i prove.",
    "the streak is not impressive to me anymore. it is normal.",
    "level of commitment: immovable.",
    "every submission adds to the legend.",
    "grass touched. legend continued.",
    "the leaderboard is my trophy case.",
    "they study consistency. i practice it.",
    "outdoor legacy: growing daily.",
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

function isValidXStatusUrl(raw) {
  try {
    const url = new URL(raw.trim());
    const validHosts = ["x.com", "www.x.com", "twitter.com", "www.twitter.com"];
    if (!validHosts.includes(url.hostname.toLowerCase())) return false;
    // Path must contain /status/ followed by digits anywhere in it
    return /\/status\/\d+/i.test(url.pathname);
  } catch {
    return false;
  }
}

function getTopPercent(streak) {
  if (streak >= 30) return 1;
  if (streak >= 14) return 5;
  if (streak >= 7)  return 10;
  return null;
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
  const [clipboardDetected, setClipboardDetected] = useState(false); // true when valid X link auto-found
  const [clipboardFeedback, setClipboardFeedback] = useState(null); // null | "detected" | "invalid"

  // Auto-detect X post link from clipboard on mount
  useEffect(() => {
    async function tryClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        if (isValidXStatusUrl(text)) {
          setTweetUrl(text.trim());
          setClipboardDetected(true);
          setClipboardFeedback("detected");
        }
      } catch {
        // Clipboard permission denied or unavailable — fail silently
      }
    }
    tryClipboard();
  }, []);

  // Local countdown for the lock-in screen (ms until next UTC midnight)
  const [lockCountdown, setLockCountdown] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (isValidXStatusUrl(text)) {
        setTweetUrl(text);
        setClipboardDetected(true);
        setSubmitStatus(null);
        setSubmitError("");
        setClipboardFeedback("detected");
      } else {
        setClipboardFeedback("invalid");
      }
    } catch {
      // Clipboard permission denied or unavailable
      setClipboardFeedback("invalid");
    }
    setTimeout(() => setClipboardFeedback(null), 2000);
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
  const [shareHint, setShareHint] = useState(false); // "Select X, then tap Post" nudge

  const buildShareText = useCallback(() =>
    `${caption}\n\nday ${currentStreak}\n@XTouchGrass\n#proofofgrass\nhttps://proofofgrass.vercel.app/`,
  [caption, currentStreak]);

  const handleShareAndPost = useCallback(async () => {
    if (!downloadUrl) return;
    const text = buildShareText();

    // ── Web Share API with file attachment (mobile / supported browsers) ──
    const canShareFiles =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function";

    if (canShareFiles) {
      try {
        const res = await fetch(downloadUrl);
        const blob = await res.blob();
        const file = new File([blob], "proof-of-grass.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          setShareHint(true); // show hint before sheet opens
          try {
            await navigator.share({ files: [file], text });
            setShared(true);
            setTimeout(() => { setShared(false); setShareHint(false); }, 4000);
          } catch (innerErr) {
            if (innerErr?.name === "AbortError") {
              setShareHint(false); // user cancelled — clear hint
              return;
            }
            // Other share error — clear hint, fall through to fallback
            setShareHint(false);
          }
          return;
        }
      } catch (err) {
        // fetch/blob/canShare error — fall through to intent fallback
      }
    }

    // ── Fallback: clipboard + X intent (desktop / unsupported) ─────────
    navigator.clipboard.writeText(text).catch(() => {});
    const encoded = encodeURIComponent(text);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank");
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  }, [caption, currentStreak, downloadUrl, buildShareText]);

  const handleSubmit = useCallback(async () => {
    if (!username) {
      setSubmitError("No username found. Please refresh and try again.");
      setSubmitStatus("error");
      return;
    }
    // tweetUrl is optional — only validate format if one was provided
    if (tweetUrl.trim() && !isValidXStatusUrl(tweetUrl)) {
      setSubmitError("That doesn't look like a valid X post link. You can leave it blank for now.");
      setSubmitStatus("error");
      return;
    }
    setSubmitStatus("loading");
    setSubmitError("");

    // Single atomic RPC — handles duplicate check, submission insert,
    // streak calc, and Streaks upsert in one Postgres transaction.
    const { data: result, error: rpcError } = await supabase.rpc("lock_in_streak", {
      p_username:     username,
      p_tweet_url:    tweetUrl.trim() || null,
      p_verification: "self_attested",
    });

    if (rpcError) {
      console.error("lock_in_streak RPC failed", rpcError);
      setSubmitError("Something went wrong. Try again.");
      setSubmitStatus("error");
      return;
    }

    if (result?.status === "already_submitted") {
      setSubmitError("You\'ve already submitted today. Come back tomorrow. 🌿");
      setSubmitStatus("error");
      return;
    }

    if (result?.status !== "success") {
      setSubmitError("Unexpected response. Try again.");
      setSubmitStatus("error");
      return;
    }

    const newStreak = result.current_streak ?? currentStreak;
    setCurrentStreak(newStreak);
    onStreakUpdate?.(newStreak);
    setSubmitStatus("success");
    setTweetUrl("");
  }, [username, tweetUrl, currentStreak, onStreakUpdate]);

  // dateStr computed once on client mount to avoid SSR mismatch
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "2-digit",
    }).toUpperCase());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = 1600;
    const H = 900;
    canvas.width = W;
    canvas.height = H;

    const img = new Image();
    img.onload = () => {
      // ── FULL-BLEED PHOTO BACKGROUND (smart-cover crop) ──────────────
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width  * scale;
      const dh = img.height * scale;
      // Anchor horizontally: show more of the right side (where the action usually is)
      // Shift left by up to 30% of the overflow so right content is visible
      const rawDx = (W - dw) / 2;
      // For portrait photos: anchor to the right portion of the image
      // Shift left so the right side fills the canvas
      const overflow = dw - W;
      const dx = overflow > 0
        ? -overflow * 0.65  // show right 65% of portrait image
        : rawDx;            // image fits, center normally
      const dy = (H - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      // ── GLOBAL DARK OVERLAY (tones photo for readability) ───────────
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      ctx.fillRect(0, 0, W, H);

      // ── RIGHT CINEMATIC GRADIENT OVERLAY ────────────────────────────
      const HUD_X   = W * 0.55;
      const HUD_W   = W * 0.40;
      const HUD_CX  = HUD_X + HUD_W / 2;

      const rightGrad = ctx.createLinearGradient(HUD_X - 80, 0, W, 0);
      rightGrad.addColorStop(0,    "rgba(2,8,4,0)");
      rightGrad.addColorStop(0.25, "rgba(2,8,4,0.82)");
      rightGrad.addColorStop(0.55, "rgba(2,8,4,0.96)");
      rightGrad.addColorStop(1,    "rgba(1,5,2,1)");
      ctx.fillStyle = rightGrad;
      ctx.fillRect(0, 0, W, H);

      // ── 50+ GOLD PRESTIGE AMBIENT ────────────────────────────────────
      if (currentStreak >= 50) {
        const goldGlow = ctx.createRadialGradient(W * 0.78, H * 0.5, 0, W * 0.78, H * 0.5, W * 0.45);
        goldGlow.addColorStop(0,   "rgba(255,200,50,0.10)");
        goldGlow.addColorStop(0.5, "rgba(255,170,20,0.05)");
        goldGlow.addColorStop(1,   "rgba(255,140,0,0)");
        ctx.fillStyle = goldGlow;
        ctx.fillRect(0, 0, W, H);
        // Corner bursts
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 1;
        for (let i = 0; i < 7; i++) {
          const a = Math.PI + (Math.PI / 14) * i;
          ctx.beginPath(); ctx.moveTo(W, H);
          ctx.lineTo(W + Math.cos(a) * 300, H + Math.sin(a) * 300);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── GREEN ACCENT GLOW (top-right HUD area) ──────────────────────
      const hudGlow = ctx.createRadialGradient(HUD_CX, H * 0.35, 0, HUD_CX, H * 0.35, 340);
      hudGlow.addColorStop(0,   "rgba(74,222,128,0.12)");
      hudGlow.addColorStop(1,   "rgba(74,222,128,0)");
      ctx.fillStyle = hudGlow;
      ctx.fillRect(0, 0, W, H);

      // ── SUBTLE TERMINAL GRID (right panel only) ──────────────────────
      ctx.save();
      ctx.strokeStyle = "rgba(74,222,128,0.028)";
      ctx.lineWidth = 1;
      for (let x = HUD_X; x < W; x += 44) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 44) {
        ctx.beginPath(); ctx.moveTo(HUD_X, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();

      // ── OUTER BORDER + CORNER BRACKETS ──────────────────────────────
      ctx.save();
      ctx.strokeStyle = currentStreak >= 50
        ? "rgba(255,200,50,0.45)"
        : "rgba(74,222,128,0.32)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = currentStreak >= 50
        ? "rgba(255,200,50,0.5)"
        : "rgba(74,222,128,0.5)";
      ctx.shadowBlur = 10;
      ctx.strokeRect(18, 18, W - 36, H - 36);
      ctx.restore();
      drawBrackets(ctx, 18, 18, W - 18, H - 18, 28);

      // ── NOISE TEXTURE ───────────────────────────────────────────────
      ctx.save();
      for (let i = 0; i < 2000; i++) { // reduced for perf
        const nx = HUD_X + Math.random() * (W - HUD_X);
        const ny = Math.random() * H;
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.015})`;
        ctx.fillRect(nx, ny, 1, 1);
      }
      ctx.restore();

      // ─────────────────────────────────────────────────────────────────
      // HUD TEXT — evenly distributed across full 900px height
      // Row guide: 72 | 150 | 210 | 262 | 306 | 376 | 490 | 548 | 620 | 670 | 730 | 800 | 858
      // ─────────────────────────────────────────────────────────────────

      // ── OFFICIAL CERTIFICATE tag (top, y=72) ─────────────────────────
      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.8)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#4ade80";
      ctx.font = "700 14px monospace";
      ctx.letterSpacing = "5px";
      ctx.textAlign = "center";
      ctx.fillText("✦  OFFICIAL CERTIFICATE  ✦", HUD_CX, 72);
      ctx.restore();

      // ── VERIFIED (y=170) ─────────────────────────────────────────────
      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.55)";
      ctx.shadowBlur = 36;
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 80px monospace";
      ctx.letterSpacing = "2px";
      ctx.textAlign = "center";
      ctx.fillText("VERIFIED", HUD_CX, 170);
      ctx.restore();

      // ── GRASS TOUCHER (y=228) ────────────────────────────────────────
      const gtGrad = ctx.createLinearGradient(HUD_CX - 280, 0, HUD_CX + 280, 0);
      gtGrad.addColorStop(0,   "#6ee7b7");
      gtGrad.addColorStop(0.5, "#4ade80");
      gtGrad.addColorStop(1,   "#34d399");
      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.65)";
      ctx.shadowBlur = 24;
      ctx.fillStyle = gtGrad;
      ctx.font = "700 50px monospace";
      ctx.letterSpacing = "1px";
      ctx.textAlign = "center";
      ctx.fillText("GRASS TOUCHER", HUD_CX, 228);
      ctx.restore();

      drawGlowRule(ctx, HUD_CX, 256, 320);

      // ── CURRENT STREAK label (y=295) ─────────────────────────────────
      ctx.fillStyle = "rgba(74,222,128,0.5)";
      ctx.font = "600 14px monospace";
      ctx.letterSpacing = "5px";
      ctx.textAlign = "center";
      ctx.fillText("CURRENT STREAK", HUD_CX, 295);

      // ── DAY N (y=420) — hero number, generous space ──────────────────
      ctx.save();
      ctx.shadowColor = currentStreak >= 50 ? "rgba(255,200,50,0.92)" : "rgba(74,222,128,0.7)";
      ctx.shadowBlur  = currentStreak >= 50 ? 70 : 50;
      ctx.fillStyle   = currentStreak >= 50 ? "#ffd700" : "#ffffff";
      ctx.font = "700 110px monospace";
      ctx.letterSpacing = "0px";
      ctx.textAlign = "center";
      ctx.fillText(`DAY ${currentStreak}`, HUD_CX, 420);
      ctx.restore();

      // ── KEEP GOING (y=468) ───────────────────────────────────────────
      ctx.save();
      ctx.fillStyle = "rgba(74,222,128,0.50)";
      ctx.font = "400 16px monospace";
      ctx.letterSpacing = "3px";
      ctx.textAlign = "center";
      ctx.fillText("KEEP GOING. TOUCH MORE.", HUD_CX, 468);
      ctx.restore();

      drawGlowRule(ctx, HUD_CX, 496, 300);

      // ── DATE OF CERTIFICATION label (y=534) ──────────────────────────
      ctx.fillStyle = "rgba(74,222,128,0.45)";
      ctx.font = "600 13px monospace";
      ctx.letterSpacing = "4px";
      ctx.textAlign = "center";
      ctx.fillText("DATE OF CERTIFICATION", HUD_CX, 534);

      // ── Date value (y=572) ───────────────────────────────────────────
      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.3)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#d1fae5";
      ctx.font = "400 30px monospace";
      ctx.letterSpacing = "1px";
      ctx.textAlign = "center";
      ctx.fillText(dateStr, HUD_CX, 572);
      ctx.restore();

      drawGlowRule(ctx, HUD_CX, 600, 300);

      // ── BOTTOM ZONE — always filled ──────────────────────────────────
      const topPct = getTopPercent(currentStreak);
      const badgeColor  = currentStreak >= 50 ? "#ffd700" : "#4ade80";
      const badgeShadow = currentStreak >= 50
        ? "rgba(255,200,50,0.8)"
        : "rgba(74,222,128,0.7)";

      // LEGENDARY label for 50+ streaks
      if (currentStreak >= 50) {
        ctx.save();
        ctx.font = "700 22px monospace";
        ctx.letterSpacing = "10px";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "rgba(255,200,50,0.9)";
        ctx.shadowBlur  = 28;
        ctx.fillText("✦  L E G E N D A R Y  ✦", HUD_CX, 656);
        ctx.restore();
      }

      if (topPct !== null) {
        // Prestige badge pill — tall, wide, always shown when streak qualifies
        const bW = Math.min(HUD_W - 20, 340);
        const bH = 106;
        const bX = HUD_CX - bW / 2;
        const bY = currentStreak >= 50 ? 718 : 698;

        ctx.save();
        ctx.shadowColor = badgeShadow;
        ctx.shadowBlur  = 26;
        ctx.fillStyle   = currentStreak >= 50
          ? "rgba(255,200,50,0.14)"
          : "rgba(74,222,128,0.12)";
        roundRect(ctx, bX, bY, bW, bH, 10);
        ctx.fill();
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth   = 2;
        roundRect(ctx, bX, bY, bW, bH, 10);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle   = badgeColor;
        ctx.shadowColor = badgeShadow;
        ctx.shadowBlur  = 20;
        ctx.font = "700 48px monospace";
        ctx.letterSpacing = "4px";
        ctx.textAlign = "center";
        ctx.fillText(`TOP ${topPct}%`, HUD_CX, bY + 62);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.60)";
        ctx.font = "400 13px monospace";
        ctx.letterSpacing = "4px";
        ctx.textAlign = "center";
        ctx.fillText("OF ALL GRASS TOUCHERS", HUD_CX, bY + 86);
        ctx.restore();

      } else {
        // No prestige tier yet — show streak identity + a motivational block
        const identityLabel = currentStreak >= 3 ? "🌿 SPROUT" : "🌱 SEED";
        const identityColor = "#4ade80";

        // Identity pill
        const bW = Math.min(HUD_W - 20, 320);
        const bH = 106;
        const bX = HUD_CX - bW / 2;
        const bY = 718;

        ctx.save();
        ctx.shadowColor = "rgba(74,222,128,0.6)";
        ctx.shadowBlur  = 20;
        ctx.fillStyle   = "rgba(74,222,128,0.09)";
        roundRect(ctx, bX, bY, bW, bH, 10);
        ctx.fill();
        ctx.strokeStyle = "rgba(74,222,128,0.45)";
        ctx.lineWidth   = 1.5;
        roundRect(ctx, bX, bY, bW, bH, 10);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle   = identityColor;
        ctx.shadowColor = "rgba(74,222,128,0.7)";
        ctx.shadowBlur  = 16;
        ctx.font = "700 38px monospace";
        ctx.letterSpacing = "4px";
        ctx.textAlign = "center";
        ctx.fillText(identityLabel, HUD_CX, bY + 56);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = "400 12px monospace";
        ctx.letterSpacing = "4px";
        ctx.textAlign = "center";
        ctx.fillText("STREAK RANK: BUILDING", HUD_CX, bY + 82);
        ctx.restore();
      }

      // ── BOTTOM BAR (y = H-28) ────────────────────────────────────────
      ctx.fillStyle = "rgba(74,222,128,0.12)";
      ctx.font = "700 12px monospace";
      ctx.letterSpacing = "4px";
      ctx.textAlign = "left";
      ctx.fillText("#PROOFOFGRASS", 36, H - 28);
      ctx.fillStyle = "rgba(74,222,128,0.12)";
      ctx.textAlign = "right";
      ctx.fillText("proofofgrass.vercel.app", W - 36, H - 28);

      // ── LOGO — bottom-right quadrant, clear of badge (y~780) ────────
      const logo = new Image();
      logo.onload = () => {
        const logoSize = 100;
        const logoX    = W - logoSize - 36;      // inner right edge
        const logoY    = H - logoSize - 52;      // sits above bottom bar

        const logoGlow = ctx.createRadialGradient(
          logoX + logoSize / 2, logoY + logoSize / 2, 8,
          logoX + logoSize / 2, logoY + logoSize / 2, logoSize * 0.7
        );
        logoGlow.addColorStop(0,   "rgba(74,222,128,0.05)");
        logoGlow.addColorStop(1,   "rgba(74,222,128,0)");
        ctx.fillStyle = logoGlow;
        ctx.fillRect(logoX - 10, logoY - 10, logoSize + 20, logoSize + 20);

        ctx.save();
        ctx.globalAlpha = 0.85;
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

      {/* Share to X — Web Share API on mobile, intent fallback on desktop */}
      {downloadUrl && (
        <div className="flex flex-col items-center gap-2">
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
              <><span>✓</span> shared</>
            ) : (
              <>📤 share to x</>
            )}
          </button>
          {shareHint ? (
            <p className="font-mono text-[11px] text-[#4ade80] tracking-wide">
              select x, then tap post
            </p>
          ) : (
            <p className="font-mono text-[11px] text-[#2a4a2d] tracking-wide text-center">
              opens x with your proof attached on supported devices
            </p>
          )}
        </div>
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
            Confirm Your Proof
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

          {/* Confirm proof helper */}
          <div className="flex flex-col gap-1 font-mono text-[10px] text-[#3a5e3d] tracking-wide">
            <p>After posting on X, tap below to lock in your streak.</p>
            <p className="text-[#2a4a2d]">Your post should include your certificate, @XTouchGrass, and #proofofgrass.</p>
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

          {/* X Post URL — with clipboard auto-detect */}
          <div className="flex flex-col gap-2">
            {/* Detected state: prominent CTA replaces label */}
            {clipboardDetected && tweetUrl && submitStatus !== "success" ? (
              <div className="
                flex flex-col gap-2 px-3 py-2.5 rounded-sm
                border border-[#2d5e30] bg-[#050f07]
                shadow-[0_0_14px_rgba(74,222,128,0.1)]
              ">
                <p className="font-mono text-[11px] text-[#4ade80] tracking-wide font-semibold">
                  📋 post detected
                </p>
                <p className="font-mono text-[10px] text-[#3a5e3d] tracking-wide break-all">
                  {tweetUrl.length > 60 ? tweetUrl.slice(0, 60) + "…" : tweetUrl}
                </p>
              </div>
            ) : (
              <label className="font-mono text-[10px] tracking-[0.25em] text-[#4ade80] uppercase opacity-60">
                X Post URL <span className="normal-case opacity-50">(optional)</span>
              </label>
            )}

            {/* Input — de-emphasised when clipboard detected, always editable */}
            <input
              type="url"
              value={tweetUrl}
              onChange={(e) => {
                setTweetUrl(e.target.value);
                setSubmitStatus(null);
                // Clear detected state if user edits manually
                if (clipboardDetected) setClipboardDetected(false);
                setClipboardFeedback(null);
              }}
              placeholder="https://x.com/yourhandle/status/..."
              disabled={submitStatus === "loading" || submitStatus === "success"}
              className={`
                w-full bg-[#060e07] font-mono text-sm
                px-4 py-2.5 rounded-sm
                placeholder:text-[#2a4a2d]
                focus:outline-none focus:border-[#4ade80]
                focus:shadow-[0_0_12px_rgba(74,222,128,0.15)]
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200
                ${clipboardDetected
                  ? "border border-[#2d5e30] text-[#3a5e3d] opacity-60"
                  : "border border-[#1f3d22] text-[#d1fae5]"
                }
              `}
            />

            {/* Manual paste button — always shown so user can re-paste */}
            {submitStatus !== "success" && (
              <button
                onClick={handlePasteFromClipboard}
                disabled={submitStatus === "loading"}
                className="
                  self-start font-mono text-[10px] tracking-widest uppercase
                  text-[#3a5e3d] hover:text-[#4ade80]
                  transition-colors duration-200
                  disabled:opacity-30 disabled:cursor-not-allowed
                "
              >
                📋 paste link from clipboard
              </button>
            )}

            {/* Feedback messages */}
            {clipboardFeedback === "detected" && (
              <p className="font-mono text-[10px] text-[#4ade80] tracking-wide">
                ✓ link detected from clipboard
              </p>
            )}
            {clipboardFeedback === "invalid" && (
              <p className="font-mono text-[10px] text-[#f59e0b] tracking-wide">
                no valid x post link found
              </p>
            )}
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
                  <span className="text-[#3a5e3d] text-[11px] tracking-wide mt-0.5">
                    pending review
                  </span>
                  <span className="text-[#2a4a2d] text-[10px] tracking-wide">
                    fake or missing proofs may be rejected
                  </span>
                </div>

                {/* Urgency countdown — client-only */}
                {mounted && lockCountdown && (
                  <div>
                    <p
                      className="text-[#f59e0b] text-sm font-bold tabular-nums tracking-wide"
                      style={{textShadow:"0 0 10px rgba(245,158,11,0.4)"}}
                    >
                      🔥 {lockCountdown} until reset
                    </p>
                  </div>
                )}

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

          {/* Submit button — more prominent when clipboard link detected */}
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
                : clipboardDetected
                  ? "bg-[#4ade80] text-[#07110a] hover:bg-[#86efac] hover:shadow-[0_0_28px_rgba(74,222,128,0.5)] shadow-[0_0_16px_rgba(74,222,128,0.3)]"
                  : "bg-transparent border border-[#4ade80] text-[#4ade80] hover:bg-[#0d2b14] hover:shadow-[0_0_20px_rgba(74,222,128,0.2)]"
              }
            `}
          >
            {submitStatus === "loading" ? (
              <><span className="animate-pulse">●</span> Submitting…</>
            ) : submitStatus === "success" ? null : (
              <>✅ I posted my proof</>
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