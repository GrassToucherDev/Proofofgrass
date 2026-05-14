import { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "../utils/supabase";

// Caption pools — each tier must be day-count agnostic (no "X days/weeks in" wording)
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
    "issued certificate of outdoor activity. day one.",
    "grass detected. proof generated. streak unlocked.",
    "outside interaction complete. logging for the record.",
    "nature: acknowledged. streak: initialized.",
    "the only nft that requires fresh air.",
    "departure from indoors confirmed. timestamp attached.",
    "went out. got proof. came back.",
    "first entry in the outdoor ledger.",
    "grass: touched. receipt: here.",
    "beginning of something real.",
    "started. the hardest part.",
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
    "building on-chain history. one field at a time.",
    "my wallet is degen. my schedule is not.",
    "outside committed. streak growing. vibe immaculate.",
    "the streak is compounding.",
    "not stopping. not slowing. not skipping.",
    "routine unlocked. execution ongoing.",
    "daily proof. daily discipline. daily bag.",
    "the routine is real now.",
    "this is what consistency looks like.",
    "touched grass before most people opened their eyes.",
    "another day, another certificate.",
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
    "the outdoors respect the commitment.",
    "streak confirmed. doubt: evaporating.",
    "daily execution, no announcements, just logs.",
    "the protocol runs. i run with it.",
    "not a tourist. a recurring participant.",
    "compounding days of outdoor exposure.",
    "building a track record that speaks for itself.",
    "the field is my office. i clocked in again.",
    "consistently certified. no days off.",
    "the streak has earned its own address.",
    "showing up beats showing off.",
    "another proof. another brick in the streak.",
    "entered, exited, documented. repeat.",
    "grass touched at scale.",
    "streak health: excellent.",
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
    "entering elite territory. daily.",
    "the streak compounds. the legend grows.",
    "no one else is doing this like i am.",
    "proof that consistency is the rarest trait.",
    "built different. logged different.",
    "not chasing anyone. they are chasing this.",
    "documented. verified. legendary.",
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

      // ─── 50+ PRESTIGE: GOLD AMBIENT + CORNER BURSTS ─────────────────
      if (currentStreak >= 50) {
        // Warm gold radial glow over whole canvas
        const goldGlow = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.5, W * 0.75);
        goldGlow.addColorStop(0,   "rgba(255,200,50,0.07)");
        goldGlow.addColorStop(0.5, "rgba(255,170,20,0.04)");
        goldGlow.addColorStop(1,   "rgba(255,140,0,0)");
        ctx.fillStyle = goldGlow;
        ctx.fillRect(0, 0, W, H);
        // Corner burst — top-left
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 1;
        for (let i = 0; i < 7; i++) {
          const a = (Math.PI / 14) * i;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 300, Math.sin(a) * 300);
          ctx.stroke();
        }
        ctx.restore();
        // Corner burst — bottom-right
        ctx.save();
        ctx.globalAlpha = 0.11;
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 1;
        for (let i = 0; i < 7; i++) {
          const a = Math.PI + (Math.PI / 14) * i;
          ctx.beginPath(); ctx.moveTo(W, H);
          ctx.lineTo(W + Math.cos(a) * 300, H + Math.sin(a) * 300);
          ctx.stroke();
        }
        ctx.restore();
        // Shimmer band across right panel
        const shimmer = ctx.createLinearGradient(870, H * 0.45, W, H * 0.55);
        shimmer.addColorStop(0,   "rgba(255,200,50,0)");
        shimmer.addColorStop(0.5, "rgba(255,210,70,0.07)");
        shimmer.addColorStop(1,   "rgba(255,200,50,0)");
        ctx.fillStyle = shimmer;
        ctx.fillRect(870, 0, W - 870, H);
      }

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
      ctx.shadowColor = currentStreak >= 50 ? "rgba(255,200,50,0.85)" : "rgba(74,222,128,0.7)";
      ctx.shadowBlur  = currentStreak >= 50 ? 32 : 18;
      ctx.strokeStyle = currentStreak >= 50 ? "rgba(255,200,50,0.8)" : "rgba(74,222,128,0.55)";
      ctx.lineWidth   = currentStreak >= 50 ? 2.5 : 1.5;
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
      const tagW = 300, tagH = 30, tagX = CX - tagW / 2, tagY = 58;
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
      ctx.font = "700 18px monospace";
      ctx.letterSpacing = "5px";
      ctx.textAlign = "center";
      ctx.fillText("✦  OFFICIAL CERTIFICATE  ✦", CX, tagY + 21);
      ctx.restore();

      // ── GLOWING TITLE: VERIFIED ──
      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.5)";
      ctx.shadowBlur = 32;
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 90px monospace";
      ctx.textAlign = "center";
      ctx.fillText("VERIFIED", CX, 168);
      ctx.restore();

      // ── GRASS TOUCHER ──
      const grassGrad = ctx.createLinearGradient(CX - 300, 0, CX + 300, 0);
      grassGrad.addColorStop(0,   "#6ee7b7");
      grassGrad.addColorStop(0.5, "#4ade80");
      grassGrad.addColorStop(1,   "#34d399");
      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.6)";
      ctx.shadowBlur = 26;
      ctx.fillStyle = grassGrad;
      ctx.font = "700 72px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GRASS TOUCHER", CX, 248);
      ctx.restore();

      drawGlowRule(ctx, CX, 278, 360);

      // ── DATE SECTION ──
      ctx.fillStyle = "rgba(74,222,128,0.5)";
      ctx.font = "600 20px monospace";
      ctx.letterSpacing = "4px";
      ctx.textAlign = "center";
      ctx.fillText("DATE OF CERTIFICATION", CX, 324);

      ctx.save();
      ctx.shadowColor = "rgba(74,222,128,0.35)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#d1fae5";
      ctx.font = "400 38px monospace";
      ctx.letterSpacing = "1px";
      ctx.textAlign = "center";
      ctx.fillText(dateStr, CX, 370);
      ctx.restore();

      drawGlowRule(ctx, CX, 398, 280);

      // ── STREAK SECTION ──
      ctx.fillStyle = "rgba(74,222,128,0.5)";
      ctx.font = "600 20px monospace";
      ctx.letterSpacing = "4px";
      ctx.textAlign = "center";
      ctx.fillText("CURRENT STREAK", CX, 442);

      ctx.save();
      ctx.shadowColor = currentStreak >= 50 ? "rgba(255,200,50,0.9)" : "rgba(74,222,128,0.65)";
      ctx.shadowBlur  = currentStreak >= 50 ? 65 : 44;
      ctx.fillStyle   = currentStreak >= 50 ? "#ffd700" : "#ffffff";
      ctx.font = "700 118px monospace";
      ctx.letterSpacing = "0px";
      ctx.textAlign = "center";
      ctx.fillText(`DAY ${currentStreak}`, CX, 568);
      ctx.restore();

      // ── PRESTIGE / LEGENDARY BANNER ──
      if (currentStreak >= 50) {
        ctx.save();
        ctx.font = "700 14px monospace";
        ctx.letterSpacing = "4px";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "rgba(255,200,50,0.85)";
        ctx.shadowBlur  = 24;
        ctx.fillText("✦  L E G E N D A R Y  G R A S S  T O U C H E R  ✦", CX, 606);
        ctx.restore();
      }

      // ── TOP % PRESTIGE BADGE ──
      const topPct = getTopPercent(currentStreak);
      if (topPct !== null) {
        ctx.save();
        ctx.shadowColor = currentStreak >= 50 ? "rgba(255,200,50,0.6)" : "rgba(74,222,128,0.55)";
        ctx.shadowBlur = 20;
        ctx.fillStyle = currentStreak >= 50 ? "#ffd700" : "#4ade80";
        ctx.font = "700 19px monospace";
        ctx.letterSpacing = "3px";
        ctx.textAlign = "center";
        ctx.fillText(`TOP ${topPct}% GRASS TOUCHER`, CX, currentStreak >= 50 ? 636 : 606);
        ctx.restore();
      }

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
        const logoSize = 210;          // enlarged from 160
        const gapTop = 652;             // shifted down from 638
        const gapBot = H - 56;
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