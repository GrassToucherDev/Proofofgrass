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
// ─── Referral badge thresholds ───────────────────────────────────────────────
const REFERRAL_BADGES = [
  { count:1,   slug:"community-builder",     name:"Community Builder",    emoji:"🤝" },
  { count:5,   slug:"grass-recruiter",       name:"Grass Recruiter",      emoji:"🌱" },
  { count:10,  slug:"community-grower",      name:"Community Grower",     emoji:"🌿" },
  { count:25,  slug:"movement-builder",      name:"Movement Builder",     emoji:"🌳" },
  { count:50,  slug:"founding-ambassador",   name:"Founding Ambassador",  emoji:"🏛" },
  { count:100, slug:"touchgrass-ambassador", name:"Touch Grass Ambassador",emoji:"👑"},
];

async function checkAndAwardReferralBadge(referrerUsername) {
  if (!referrerUsername) return;
  try {
    const { data: prof } = await supabase
      .from("Profiles").select("referral_count_successful,referral_badge")
      .eq("username", referrerUsername).maybeSingle();
    if (!prof) return;
    const count = (prof.referral_count_successful || 0) + 1;
    const earned = [...REFERRAL_BADGES].reverse().find(b => count >= b.count);
    if (!earned || prof.referral_badge === earned.slug) return;
    await supabase.from("Profiles").update({ referral_badge: earned.slug })
      .eq("username", referrerUsername);
  } catch(e) { console.warn("[referral badge]", e?.message); }
}

export default function ResultCard({ imageSrc, username, initialStreak = 1, onStreakUpdate }) {
  const canvasRef = useRef(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const sharableFileRef   = useRef(null); // pre-built File object ready for navigator.share()
  const pendingPhotoUrlRef = useRef(null); // photo URL waiting to be attached after lockInStreak
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
  const [inAppBrowserMode, setInAppBrowserMode] = useState(false); // true when inside X/IG in-app browser
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
  const TAGS = "$TOUCHGRASS #TouchGrass #ProofOfGrass";
  const buildTags = () => `${TAGS}\n${HANDLE} · proofofgrass.app`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`${caption}\n\nDay ${currentStreak} · proof of grass 🌿\n\n${TAGS}\n${HANDLE} · proofofgrass.app`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [caption]);

  const [shared, setShared] = useState(false);
  const [shareHint, setShareHint] = useState(false); // "Select X, then tap Post" nudge

  const buildShareText = useCallback(() =>
    `${caption}\n\nDay ${currentStreak} · proof of grass 🌿\n\n${TAGS}\n${HANDLE} · proofofgrass.app`,
  [caption, currentStreak]);

  // ── Submission — always fires after share, no tweetUrl dependency ──────
  const lockInStreak = useCallback(async () => {
    if (!username) return;
    setSubmitStatus("loading");
    setSubmitError("");
    try {
      const { data: result, error: rpcError } = await supabase.rpc("lock_in_streak", {
        p_username:     username,
        p_tweet_url:    null,
        p_verification: "self_attested",
      });

      if (rpcError) {
        console.error("lock_in_streak RPC error", rpcError);
        setSubmitError("Streak log failed — tap again.");
        setSubmitStatus("error");
        return;
      }

      const newStreak = result?.current_streak ?? currentStreak;
      setCurrentStreak(newStreak);
      onStreakUpdate?.(newStreak);
      setSubmitStatus("success");

      // ── Attach pending photo URL to the submission just created ───────────
      if (pendingPhotoUrlRef.current) {
        const photoUrl = pendingPhotoUrlRef.current;
        pendingPhotoUrlRef.current = null; // clear so it's not reused
        try {
          // Give the RPC a moment to commit before we query
          await new Promise(r => setTimeout(r, 800));
          const { data: latestSub } = await supabase
            .from("Submissions")
            .select("id")
            .eq("username", username)
            .in("status", ["pending", "approved"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestSub?.id) {
            await supabase.from("Submissions")
              .update({ photo_url: photoUrl })
              .eq("id", latestSub.id);
            console.log("[photo] attached to submission", latestSub.id);
          } else {
            console.warn("[photo] no submission found after lockInStreak");
          }
        } catch(photoErr) {
          console.warn("[photo] attach failed (non-fatal):", photoErr?.message);
        }
      }

      // ── Insert referral on first proof ────────────────────────────────────
      try {
        const referrer = typeof localStorage !== "undefined"
          ? localStorage.getItem("pog_referrer") : null;
        if (referrer && referrer !== username) {
          const { data: existing } = await supabase.from("Referrals")
            .select("id").eq("referred_username", username).maybeSingle();
          if (!existing) {
            const { data: refExists } = await supabase.from("Streaks")
              .select("username").eq("username", referrer).maybeSingle();
            if (refExists) {
              await supabase.from("Referrals").insert([{
                referrer_username: referrer,
                referred_username: username,
                status: "pending",
                source_url: typeof window !== "undefined" ? window.location.href : null,
              }]);
              // Increment referrer pending count
              const { data: rp } = await supabase.from("Profiles")
                .select("referral_count_pending").eq("username", referrer).maybeSingle();
              await supabase.from("Profiles").update({
                referral_count_pending: (rp?.referral_count_pending ?? 0) + 1,
              }).eq("username", referrer);
            }
          }
        }
      } catch(refErr) {
        console.warn("[referral] insert non-fatal:", refErr?.message);
      }

      // ── Check referral conversion at Day 10 ───────────────────────────────
      try {
        const newStreak = result?.current_streak ?? currentStreak;
        if (newStreak >= 10) {
          const { data: pendingRef } = await supabase.from("Referrals")
            .select("id,referrer_username")
            .eq("referred_username", username)
            .eq("status", "pending")
            .maybeSingle();
          if (pendingRef) {
            const { count: proofCount } = await supabase.from("Submissions")
              .select("id", { count:"exact", head:true })
              .eq("username", username).in("status", ["pending","approved"]);
            if (proofCount >= 7) {
              // Convert
              await supabase.from("Referrals").update({
                status: "converted",
                converted_at: new Date().toISOString(),
                referred_reached_day_10: true,
              }).eq("id", pendingRef.id);
              // Update referrer counts
              const { data: rProf } = await supabase.from("Profiles")
                .select("referral_count_successful,referral_count_pending")
                .eq("username", pendingRef.referrer_username).maybeSingle();
              await supabase.from("Profiles").update({
                referral_count_successful: (rProf?.referral_count_successful ?? 0) + 1,
                referral_count_pending: Math.max(0, (rProf?.referral_count_pending ?? 1) - 1),
              }).eq("username", pendingRef.referrer_username);
              // Award badge if threshold reached
              await checkAndAwardReferralBadge(pendingRef.referrer_username);
              // Clear stored referrer since it's been used
              if (typeof localStorage !== "undefined") localStorage.removeItem("pog_referrer");
              console.log("[referral] converted:", username, "→", pendingRef.referrer_username);
            }
          }
        }
      } catch(convErr) {
        console.warn("[referral] conversion non-fatal:", convErr?.message);
      }

      // ── Update ChallengeProgress for any active challenges ──────────────
      try {
        const todayUTC = new Date().toISOString().slice(0, 10);
        const { data: activeChals } = await supabase
          .from("Challenges")
          .select("id")
          .or(`challenger.eq.${username},challenged.eq.${username}`)
          .eq("status", "active");

        if (activeChals?.length) {
          for (const ch of activeChals) {
            // Only increment if not already logged today
            const { data: prog } = await supabase
              .from("ChallengeProgress")
              .select("id, days_complete, last_checked")
              .eq("challenge_id", ch.id)
              .eq("username", username)
              .maybeSingle();

            if (prog && prog.last_checked !== todayUTC) {
              const newDays = (prog.days_complete ?? 0) + 1;
              await supabase
                .from("ChallengeProgress")
                .update({ days_complete: newDays, last_checked: todayUTC })
                .eq("id", prog.id);

              // Log the event
              await supabase.from("ChallengeEvents").insert([{
                challenge_id: ch.id,
                username,
                event_type: "day_logged",
              }]);
            }
          }
        }
      } catch (chalErr) {
        console.warn("challenge progress update failed", chalErr);
        // Non-fatal — streak still locked in
      }

    } catch (err) {
      console.error("lock_in_streak exception", err);
      setSubmitError("Something went wrong — tap again.");
      setSubmitStatus("error");
    }
  }, [username, currentStreak, onStreakUpdate]);

  // ── Share to X — then lock in streak regardless of share path ───────────
  // Detect X / Twitter in-app browser — blocks window.open and Web Share API
  const isInAppBrowser = typeof navigator !== "undefined" && (
    /Twitter/i.test(navigator.userAgent) ||
    /Instagram/i.test(navigator.userAgent) ||
    /FBAN|FBAV/i.test(navigator.userAgent) ||  // Facebook in-app
    /MicroMessenger/i.test(navigator.userAgent) // WeChat
  );

  const handleShareAndSubmit = useCallback(async () => {
    if (!downloadUrl) return;
    const text = buildShareText();

    const isMobile = typeof navigator !== "undefined" &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const canShareFiles = !isInAppBrowser &&
      isMobile &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function";

    let cancelled = false;

    // ── X in-app browser — can't open windows or use Web Share ───────────
    if (isInAppBrowser) {
      await lockInStreak();
      setInAppBrowserMode(true);
      return;
    }

    if (canShareFiles) {
      // Use pre-cached file if available, otherwise build synchronously from dataURL
      // The file must be ready BEFORE any await to keep the user-gesture chain intact
      let file = sharableFileRef.current;

      if (!file && downloadUrl.startsWith("data:")) {
        // dataURL is already in memory — convert synchronously via fetch (fast, no network)
        try {
          const res = await fetch(downloadUrl);
          const blob = await res.blob();
          file = new File([blob], "proof-of-grass.png", { type: "image/png" });
          sharableFileRef.current = file;
        } catch(e) {
          file = null;
        }
      }

      if (file && navigator.canShare({ files: [file] })) {
        setShareHint(true);
        try {
          await navigator.share({ files: [file], text });
          setShared(true);
          setTimeout(() => { setShared(false); setShareHint(false); }, 4000);
        } catch (err) {
          setShareHint(false);
          if (err?.name === "AbortError") {
            cancelled = true;
          } else {
            navigator.clipboard.writeText(text).catch(() => {});
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
            setShared(true);
            setTimeout(() => setShared(false), 2500);
          }
        }
      } else {
        // canShare returned false — fall back to X intent
        navigator.clipboard.writeText(text).catch(() => {});
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      }
    } else {
      // Desktop — open intent, copy caption to clipboard
      navigator.clipboard.writeText(text).catch(() => {});
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }

    if (!cancelled) {
      await lockInStreak();
    }
  }, [downloadUrl, buildShareText, lockInStreak, isInAppBrowser]); // sharableFileRef is a ref, intentionally omitted from deps

  // Alias for any other buttons that call this
  const handleShareAndPost = handleShareAndSubmit;

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

    // Lucky Touch — show popup if triggered
    if (result?.lucky_touch?.triggered) {
      setLuckyTouch(result.lucky_touch);
    }
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
      const W = 1600, H = 900;

      // ── FULL BLEED — smart cover crop, biased right for portrait shots ──
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const overflow = dw - W;
      const dx = overflow > 0 ? -overflow * 0.65 : (W - dw) / 2;
      const dy = (H - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      // ── EDITORIAL VIGNETTE — four-edge soft burn, never a panel ────────
      // Top
      const vTop = ctx.createLinearGradient(0, 0, 0, H * 0.28);
      vTop.addColorStop(0,   "rgba(0,0,0,0.52)");
      vTop.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = vTop; ctx.fillRect(0, 0, W, H * 0.28);

      // Bottom
      const vBot = ctx.createLinearGradient(0, H * 0.72, 0, H);
      vBot.addColorStop(0,   "rgba(0,0,0,0)");
      vBot.addColorStop(1,   "rgba(0,0,0,0.58)");
      ctx.fillStyle = vBot; ctx.fillRect(0, H * 0.72, W, H * 0.28);

      // Left edge blush
      const vLeft = ctx.createLinearGradient(0, 0, W * 0.18, 0);
      vLeft.addColorStop(0,   "rgba(0,0,0,0.28)");
      vLeft.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = vLeft; ctx.fillRect(0, 0, W * 0.18, H);

      // Right edge blush
      const vRight = ctx.createLinearGradient(W * 0.82, 0, W, 0);
      vRight.addColorStop(0,   "rgba(0,0,0,0)");
      vRight.addColorStop(1,   "rgba(0,0,0,0.32)");
      ctx.fillStyle = vRight; ctx.fillRect(W * 0.82, 0, W * 0.18, H);

      // ── THIN CINEMATIC BORDER ───────────────────────────────────────────
      const INSET = 22;
      ctx.strokeStyle = currentStreak >= 50 ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.22)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(INSET, INSET, W - INSET * 2, H - INSET * 2);

      // ── CORNER BRACKETS ─────────────────────────────────────────────────
      const bracketLen = 28;
      const bGap = INSET;
      ctx.strokeStyle = currentStreak >= 50 ? "rgba(212,175,55,0.80)" : "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.2;
      [ [bGap, bGap, 1, 1], [W - bGap, bGap, -1, 1],
        [bGap, H - bGap, 1, -1], [W - bGap, H - bGap, -1, -1] ]
        .forEach(([cx, cy, sx, sy]) => {
          ctx.beginPath();
          ctx.moveTo(cx + sx * bracketLen, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy + sy * bracketLen);
          ctx.stroke();
        });

      // ── HELPER: ultra-light text ─────────────────────────────────────────
      // ghost() — text with automatic drop shadow for legibility over any photo
      const ghost = (text, x, y, size, align = "left", col = "rgba(255,255,255,0.90)", font = "400") => {
        ctx.save();
        ctx.font = `${font} ${size}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
        ctx.fillStyle = col;
        ctx.textAlign = align;
        ctx.letterSpacing = "0.10em";
        ctx.shadowColor = "rgba(0,0,0,0.80)";
        ctx.shadowBlur  = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.fillText(text, x, y);
        ctx.restore();
      };

      const accentText = currentStreak >= 50 ? "rgba(212,175,55,1.0)" : "rgba(160,230,160,1.0)";
      const mutedText  = currentStreak >= 50 ? "rgba(212,175,55,0.80)" : "rgba(255,255,255,0.70)";

      // ── TOP-LEFT — brand lockup ───────────────────────────────────────────
      const TL_X = INSET + 22, TL_Y = INSET + 44;
      ghost("PROOF OF GRASS", TL_X, TL_Y, 16, "left", "rgba(255,255,255,0.95)", "600");
      ghost("verified outdoors", TL_X, TL_Y + 22, 20, "left", "rgba(255,255,255,0.88)", "700");
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(TL_X, TL_Y + 32); ctx.lineTo(TL_X + 160, TL_Y + 32); ctx.stroke();

      // ── TOP-RIGHT — streak counter ────────────────────────────────────────
      const TR_X = W - INSET - 28, TR_Y = INSET + 44;
      ghost("STREAK", TR_X, TR_Y, 13, "right", mutedText, "500");

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.90)";
      ctx.shadowBlur  = 14;
      ctx.textAlign = "right";
      ctx.letterSpacing = "-0.01em";
      const dayStr = "DAY";
      const numStr = ` ${currentStreak}`;
      ctx.font = `300 88px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(dayStr, TR_X - ctx.measureText(numStr).width, TR_Y + 92);
      ctx.fillStyle = accentText;
      ctx.font = `400 88px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
      ctx.fillText(numStr, TR_X, TR_Y + 92);
      ctx.restore();

      if (currentStreak >= 7) {
        const tierLabel = currentStreak >= 180 ? "MYTHIC"
          : currentStreak >= 100 ? "IMMORTAL"
          : currentStreak >= 50  ? "LEGENDARY"
          : currentStreak >= 30  ? "ELITE"
          : currentStreak >= 14  ? "LOCKED IN"
          : "ROOTED";
        ghost(`· ${tierLabel} ·`, TR_X, TR_Y + 118, 14, "right", accentText, "400");
      }

      // ── LEFT EDGE — vertical tagline ──────────────────────────────────────
      ctx.save();
      ctx.translate(INSET + 16, H * 0.72);
      ctx.rotate(-Math.PI / 2);
      ctx.font = "300 12px 'Helvetica Neue', Helvetica, Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.40)";
      ctx.shadowColor = "rgba(0,0,0,0.70)";
      ctx.shadowBlur = 5;
      ctx.letterSpacing = "0.18em";
      ctx.textAlign = "center";
      ctx.fillText("KEEP GOING.  LIVE BETTER.  TOUCH MORE.", 0, 0);
      ctx.restore();

      // ── RIGHT EDGE — vertical secondary ───────────────────────────────────
      ctx.save();
      ctx.translate(W - INSET - 16, H * 0.42);
      ctx.rotate(Math.PI / 2);
      ctx.font = "300 12px 'Helvetica Neue', Helvetica, Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.shadowColor = "rgba(0,0,0,0.70)";
      ctx.shadowBlur = 5;
      ctx.letterSpacing = "0.18em";
      ctx.textAlign = "center";
      ctx.fillText("REAL MOMENTS.  REAL LIFE.", 0, 0);
      ctx.restore();

      // ── BOTTOM-LEFT — certification metadata ──────────────────────────────
      const BL_X = INSET + 22, BL_BASE = H - INSET - 28;
      ghost("DATE OF CERTIFICATION", BL_X, BL_BASE - 22, 12, "left", mutedText, "500");
      ghost(dateStr, BL_X, BL_BASE, 20, "left", "rgba(255,255,255,0.95)", "300");

      // ── BOTTOM-RIGHT — prestige seal ──────────────────────────────────────
      const BR_X = W - INSET - 28;
      const BR_BASE = H - INSET - 28;
      ghost("CERTIFIED BY", BR_X, BR_BASE - 24, 12, "right", mutedText, "400");
      ghost("touch grass", BR_X, BR_BASE, 19, "right", "rgba(255,255,255,0.95)", "300");

      const topPct = getTopPercent(currentStreak);
      if (topPct !== null) {
        const SEAL_CX = BR_X - 55;
        const SEAL_Y  = BR_BASE - 108;
        ctx.save();
        ctx.strokeStyle = accentText;
        ctx.lineWidth   = 1.4;
        ctx.shadowColor = "rgba(0,0,0,0.70)";
        ctx.shadowBlur  = 8;
        ctx.globalAlpha = 0.90;
        ctx.beginPath();
        ctx.arc(SEAL_CX, SEAL_Y, 46, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ghost(`TOP ${topPct}%`, SEAL_CX, SEAL_Y - 4, 16, "center", accentText, "600");
        ghost("grass touchers", SEAL_CX, SEAL_Y + 18, 15, "center", "rgba(255,255,255,0.92)", "700");
        ctx.save();
        ctx.strokeStyle = accentText;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.55;
        [[-40, -5], [40, -5]].forEach(([ox, oy]) => {
          ctx.beginPath();
          ctx.moveTo(SEAL_CX + ox, SEAL_Y + oy - 10);
          ctx.lineTo(SEAL_CX + ox, SEAL_Y + oy + 10);
          ctx.stroke();
        });
        ctx.restore();
      }

      const logo = new Image();
      // Upload certificate to Supabase Storage and save photo_url on latest submission
      const savePhotoUrl = async (dataUrl) => {
        setDownloadUrl(dataUrl);
        if (!username) { console.log("[photo] no username, skipping upload"); return; }
        try {
          // Convert dataURL to blob
          const res  = await fetch(dataUrl);
          const blob = await res.blob();
          // Pre-cache as a File so navigator.share() needs zero awaits at share time
          sharableFileRef.current = new File([blob], "proof-of-grass.png", { type: "image/png" });
          // Use upsert:true so re-uploads on same day overwrite cleanly
          const fileName = `${username}/${new Date().toISOString().slice(0,10)}.png`;
          console.log("[photo] uploading to proof-photos/", fileName);

          const { data: uploaded, error: uploadErr } = await supabase
            .storage.from("proof-photos").upload(fileName, blob, {
              contentType: "image/png", upsert: true,
            });

          if (uploadErr) {
            console.error("[photo] upload failed:", uploadErr.message, uploadErr);
            return;
          }
          console.log("[photo] upload success:", uploaded);

          const { data: urlData } = supabase.storage.from("proof-photos").getPublicUrl(fileName);
          const publicUrl = urlData?.publicUrl;
          if (!publicUrl) { console.warn("[photo] no public URL returned"); return; }
          console.log("[photo] public URL:", publicUrl);

          // Store URL in ref — will be attached to the submission AFTER lockInStreak creates it
          pendingPhotoUrlRef.current = publicUrl;
          console.log("[photo] URL ready to attach after streak lock:", publicUrl);
        } catch (e) {
          console.error("[photo] exception:", e);
        }
      };

      logo.onload = () => {
        const logoSize = 36;
        const logoX = BR_X - logoSize;
        const logoY = BR_BASE - 72;
        ctx.save();
        ctx.globalAlpha = 0.60;
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        ctx.restore();
        savePhotoUrl(canvas.toDataURL("image/png"));
      };
      logo.onerror = () => savePhotoUrl(canvas.toDataURL("image/png"));
      logo.src = "/touchgrass-transparent.png";
    };
        img.src = imageSrc;
  }, [imageSrc, dateStr, currentStreak]);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:24,width:"100%"}}>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{display:"none"}} />

      {/* Card preview */}
      <div style={{width:"100%"}}>
        <div style={{width:"100%",overflow:"hidden",borderRadius:6,
          border:"1px solid #1a3a1e",
          boxShadow:"0 0 80px rgba(74,222,128,0.08)"}}>
          {downloadUrl ? (
            <img src={downloadUrl} alt="Proof of Grass Certificate"
              style={{width:"100%",height:"auto",display:"block",maxWidth:"100%"}} />
          ) : (
            <div style={{width:"100%",aspectRatio:"1/1",background:"#0a140b",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:"monospace",color:"#2a4a2d",fontSize:11,
                letterSpacing:"0.3em"}}>generating…</span>
            </div>
          )}
        </div>
      </div>

      {/* Download — also locks in streak so bypass is impossible */}
      {downloadUrl && (
        <a href={downloadUrl} download="proof-of-grass.png"
          onClick={()=>{ if (submitStatus!=="success") lockInStreak(); }}
          style={{
            display:"inline-flex",alignItems:"center",gap:10,
            padding:"12px 32px",
            fontFamily:"monospace",fontSize:13,fontWeight:700,
            letterSpacing:"0.15em",textTransform:"uppercase",
            color:"#0e1108",background:"#93a85a",
            borderRadius:3,textDecoration:"none",
            boxShadow:"0 0 20px rgba(147,168,90,0.3)",
          }}>
          ↓ Download Certificate
        </a>
      )}

      {/* In-app browser warning */}
      {isInAppBrowser && !inAppBrowserMode && downloadUrl && (
        <div style={{
          background:"rgba(200,168,75,0.08)",
          border:"1px solid rgba(200,168,75,0.4)",
          borderRadius:10,padding:"14px 16px",
          fontSize:12,color:"#c8a84b",lineHeight:1.6,width:"100%",
        }}>
          <div style={{fontWeight:700,marginBottom:4}}>⚠ You're in the X in-app browser</div>
          <div style={{fontSize:11,color:"rgba(200,168,75,0.7)"}}>
            Tap <b>···</b> → <b>Open in browser</b> to share with your image.
          </div>
        </div>
      )}

      {/* In-app browser locked state */}
      {inAppBrowserMode && (
        <div style={{
          background:"rgba(147,168,90,0.06)",
          border:"1px solid rgba(147,168,90,0.3)",
          borderRadius:10,padding:"18px 16px",
          display:"flex",flexDirection:"column",alignItems:"center",gap:12,
          textAlign:"center",width:"100%",
        }}>
          <div style={{fontSize:22}}>✓</div>
          <div style={{fontWeight:700,color:"#93a85a",fontSize:13,letterSpacing:"0.06em"}}>
            STREAK LOCKED IN
          </div>
          <div style={{fontSize:11,color:"rgba(240,239,234,0.5)",lineHeight:1.7}}>
            Your streak is saved. Open in Safari to share with image.
          </div>
          {downloadUrl && (
            <a href={downloadUrl} download="proof-of-grass.png" style={{
              display:"inline-flex",alignItems:"center",gap:7,
              background:"#93a85a",color:"#080a06",
              borderRadius:8,padding:"10px 20px",
              fontSize:12,fontWeight:700,textDecoration:"none",
            }}>↓ Save Card to Photos</a>
          )}
        </div>
      )}

      {/* Share button */}
      {downloadUrl && !inAppBrowserMode && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,width:"100%"}}>
          <button onClick={handleShareAndSubmit}
            disabled={submitStatus==="loading"||submitStatus==="success"}
            style={{
              display:"inline-flex",alignItems:"center",gap:10,
              padding:"13px 32px",width:"100%",justifyContent:"center",
              fontFamily:"monospace",fontSize:13,fontWeight:700,
              letterSpacing:"0.15em",textTransform:"uppercase",
              borderRadius:3,cursor:"pointer",border:"1px solid #93a85a",
              background: submitStatus==="success"?"#2a3018"
                        : submitStatus==="loading"?"#1e2410"
                        : "transparent",
              color:"#93a85a",
              opacity: submitStatus==="loading"||submitStatus==="success" ? 0.7 : 1,
            }}>
            {submitStatus==="loading" ? "posting…"
              : submitStatus==="success" ? "✓ streak locked in"
              : "📤 share to x + lock in streak"}
          </button>
          {shareHint && (
            <p style={{fontFamily:"monospace",fontSize:11,color:"#93a85a",
              letterSpacing:"0.08em",margin:0}}>
              select x, then tap post
            </p>
          )}
          {!shareHint && submitStatus!=="success" && (
            <p style={{fontFamily:"monospace",fontSize:11,
              color:"rgba(147,168,90,0.45)",textAlign:"center",
              letterSpacing:"0.06em",margin:0,lineHeight:1.6}}>
              {isInAppBrowser
                ? "tap ··· → open in browser to share with image"
                : "opens X with your caption · save & attach your certificate image"
              }
            </p>
          )}
          {submitStatus==="error" && submitError && (
            <p style={{fontFamily:"monospace",fontSize:10,color:"#ef4444",
              textAlign:"center",margin:0}}>{submitError}</p>
          )}
        </div>
      )}

      {/* Caption Generator */}
      <div style={{width:"100%"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <div style={{flex:1,height:1,background:"linear-gradient(to right,transparent,#1f3d22)"}}/>
          <span style={{fontFamily:"monospace",fontSize:10,letterSpacing:"0.3em",
            color:"#3a5e3d",textTransform:"uppercase"}}>Caption Generator</span>
          <div style={{flex:1,height:1,background:"linear-gradient(to left,transparent,#1f3d22)"}}/>
        </div>

        {/* Caption box */}
        <div style={{
          position:"relative",borderRadius:4,
          border:"1px solid #1a3520",background:"#0a140b",
          padding:"20px 24px",
          boxShadow:"inset 0 1px 0 rgba(74,222,128,0.06),0 0 24px rgba(0,0,0,0.4)",
        }}>
          {/* Corner accents */}
          {[{t:0,l:0,bt:"border-top",bl:"border-left"},{t:0,r:0},{b:0,l:0},{b:0,r:0}].map((_,i)=>(
            <span key={i} style={{
              position:"absolute",width:10,height:10,
              top: i<2?0:undefined, bottom: i>=2?0:undefined,
              left: i%2===0?0:undefined, right: i%2===1?0:undefined,
              borderTop: i<2?"1px solid rgba(147,168,90,0.25)":undefined,
              borderBottom: i>=2?"1px solid rgba(147,168,90,0.25)":undefined,
              borderLeft: i%2===0?"1px solid rgba(147,168,90,0.25)":undefined,
              borderRight: i%2===1?"1px solid rgba(147,168,90,0.25)":undefined,
            }}/>
          ))}
          <p style={{
            fontFamily:"monospace",fontSize:14,color:"#d1fae5",
            lineHeight:1.7,textAlign:"center",margin:0,
          }}>{caption}</p>
          <p style={{
            fontFamily:"monospace",fontSize:11,color:"#93a85a",
            textAlign:"center",marginTop:12,letterSpacing:"0.08em",
            lineHeight:1.7,opacity:0.6,
          }}>
            {TAGS}<br/>
            <span style={{opacity:0.7}}>{HANDLE} · proofofgrass.app</span>
          </p>
        </div>

        {/* Buttons */}
        <div style={{display:"flex",gap:10,marginTop:10}}>
          <button onClick={handleNewCaption} style={{
            flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
            padding:"10px 16px",
            border:"1px solid #1f3d22",background:"#0a140b",
            color:"#93a85a",fontFamily:"monospace",fontSize:11,
            letterSpacing:"0.12em",textTransform:"uppercase",
            borderRadius:3,cursor:"pointer",
          }}>↺ New Caption</button>
          <button onClick={handleCopy} style={{
            flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
            padding:"10px 16px",
            border: copied?"1px solid #93a85a":"1px solid transparent",
            background: copied?"#2a3018":"#93a85a",
            color: copied?"#93a85a":"#0e1108",
            fontFamily:"monospace",fontSize:11,
            letterSpacing:"0.12em",textTransform:"uppercase",
            borderRadius:3,cursor:"pointer",fontWeight:700,
          }}>{copied?"✓ Copied!":"⎘ Copy Caption"}</button>
        </div>
      </div>

    </div>

    {/* ── LUCKY TOUCH MODAL ──────────────────────────────────────────────── */}
    {luckyTouch?.triggered && (
      <div style={{
        position:"fixed", inset:0, zIndex:9999,
        display:"flex", alignItems:"center", justifyContent:"center",
        background:"rgba(4,5,3,0.85)", backdropFilter:"blur(8px)",
        padding:"24px",
      }}
      onClick={() => setLuckyTouch(null)}>
        <div style={{
          position:"relative",
          background: luckyTouch.tier === "legendary"
            ? "linear-gradient(145deg,#1a1200,#2d2000,#1a0e00)"
            : luckyTouch.tier === "rare"
            ? "linear-gradient(145deg,#0a0e14,#141e2a,#0a0e14)"
            : "linear-gradient(145deg,#0a100a,#141e10,#0a100a)",
          border: `1px solid ${
            luckyTouch.tier === "legendary" ? "#c8a84b"
            : luckyTouch.tier === "rare"    ? "#a78bfa"
            : "#93a85a"
          }`,
          borderRadius:20,
          padding:"40px 32px",
          maxWidth:340,
          width:"100%",
          textAlign:"center",
          boxShadow: luckyTouch.tier === "legendary"
            ? "0 0 60px rgba(200,168,75,0.35), 0 0 120px rgba(200,168,75,0.15)"
            : luckyTouch.tier === "rare"
            ? "0 0 40px rgba(167,139,250,0.3)"
            : "0 0 30px rgba(147,168,90,0.2)",
          animation: "ltPop 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onClick={e => e.stopPropagation()}>

          {/* Icon */}
          <div style={{
            fontSize: luckyTouch.tier === "legendary" ? 56 : 48,
            marginBottom:16,
            filter: luckyTouch.tier === "legendary"
              ? "drop-shadow(0 0 16px rgba(200,168,75,0.8))"
              : luckyTouch.tier === "rare"
              ? "drop-shadow(0 0 12px rgba(167,139,250,0.7))"
              : "drop-shadow(0 0 8px rgba(147,168,90,0.6))",
          }}>
            {luckyTouch.tier === "legendary" ? "☀️" : "🍀"}
          </div>

          {/* Tier label */}
          <div style={{
            fontSize:9, fontWeight:700, letterSpacing:"0.22em",
            textTransform:"uppercase", marginBottom:10,
            color: luckyTouch.tier === "legendary" ? "#c8a84b"
              : luckyTouch.tier === "rare"          ? "#a78bfa"
              : "#93a85a",
          }}>
            {luckyTouch.tier === "legendary" ? "☀ Sun's Blessing"
              : luckyTouch.tier === "rare"   ? "🍀 Rare Lucky Touch"
              : "🍀 Lucky Touch"}
          </div>

          {/* Title */}
          <div style={{
            fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize: luckyTouch.tier === "legendary" ? 32 : 28,
            fontWeight:700, lineHeight:1.1, marginBottom:12,
            color:"#f0efea",
          }}>
            {luckyTouch.tier === "legendary"
              ? "A Rare Blessing"
              : luckyTouch.tier === "rare"
              ? "Rare Reward"
              : "Lucky Touch"}
          </div>

          {/* Reward */}
          <div style={{
            fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:22, fontWeight:600, marginBottom:8,
            color: luckyTouch.tier === "legendary" ? "#c8a84b"
              : luckyTouch.tier === "rare"          ? "#a78bfa"
              : "#93a85a",
          }}>
            {luckyTouch.type === "shield"
              ? "🛡 +1 Shield"
              : `🌱 +${luckyTouch.points} Grass Score`}
          </div>

          {/* Flavour text */}
          <div style={{
            fontSize:12, color:"rgba(240,239,234,0.45)",
            lineHeight:1.6, marginBottom:28,
          }}>
            {luckyTouch.tier === "legendary"
              ? "A rare blessing from the Touch Grass Sun."
              : luckyTouch.tier === "rare"
              ? "Not everyone gets this. Keep touching grass."
              : "Keep touching grass."}
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setLuckyTouch(null)}
            style={{
              width:"100%", padding:"14px",
              background: luckyTouch.tier === "legendary" ? "#c8a84b"
                : luckyTouch.tier === "rare"               ? "#a78bfa"
                : "#93a85a",
              color: luckyTouch.tier === "rare" ? "#f0efea" : "#0e1108",
              border:"none", borderRadius:10, cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif", fontSize:13,
              fontWeight:700, letterSpacing:"0.06em",
            }}>
            Keep Going ✦
          </button>
        </div>

        {/* Pop-in animation */}
        <style>{`
          @keyframes ltPop {
            from { opacity:0; transform:scale(0.82) translateY(16px); }
            to   { opacity:1; transform:scale(1)    translateY(0);     }
          }
        `}</style>
      </div>
    )}

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