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
  const [streakStatus, setStreakStatus] = useState("");
  const [streakTone, setStreakTone] = useState("neutral"); // neutral | success | warning | reset
  const [timeUntilReset, setTimeUntilReset] = useState("");
  const [countdownMs, setCountdownMs] = useState(null);
  const resultRef = useRef(null);

  const username = normalizeUsername(rawUsername);
  const hasUsername = username.length > 0;

  // Preload streak preview whenever username changes (debounced 500ms).
  // Single authoritative rule: latest submission date drives the preview,
  // with the Streaks row used to determine the exact count.
  useEffect(() => {
    if (!username) {
      setCurrentStreak(1);
      setStreakStatus("");
      setStreakTone("neutral");
      return;
    }
    const timer = setTimeout(async () => {
      // All date comparisons use UTC YYYY-MM-DD
      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      try {
        // Query both tables in parallel — Streaks for count, Submissions for recency
        const [{ data: streakRow }, { data: latestSub }] = await Promise.all([
          supabase
            .from("Streaks")
            .select("current_streak, last_submission_date")
            .eq("username", username)
            .maybeSingle(),
          supabase
            .from("Submissions")
            .select("created_at")
            .eq("username", username)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        let finalPreview = 1;

        if (!latestSub?.created_at) {
          // No submission history — brand new user, preview Day 1
          finalPreview = 1;
        } else {
          const subDateStr = new Date(latestSub.created_at).toISOString().slice(0, 10);

          if (subDateStr === todayStr) {
            // Already submitted today — show the current saved streak (or 1 if no row yet)
            finalPreview = streakRow?.current_streak ?? 1;
          } else if (subDateStr === yesterdayStr) {
            // Submitted yesterday — today would extend the streak by 1
            // If no Streaks row exists yet, assume current = 1 so preview = 2
            finalPreview = (streakRow?.current_streak ?? 1) + 1;
          } else {
            // Gap of more than one day — streak resets to Day 1
            finalPreview = 1;
          }
        }

        // Determine streak status + tone based on latest submission date
        if (!latestSub?.created_at) {
          setStreakStatus("start your streak today");
          setStreakTone("neutral");
        } else {
          const subDateStr = new Date(latestSub.created_at).toISOString().slice(0, 10);
          if (subDateStr === todayStr) {
            setStreakStatus("streak locked in for today");
            setStreakTone("success");
          } else if (subDateStr === yesterdayStr) {
            setStreakStatus(`you're on day ${finalPreview} — don't break it`);
            setStreakTone("warning");
          } else {
            setStreakStatus("streak lost — start again today");
            setStreakTone("reset");
          }
        }

        console.log({ username, streakRow, latestSub, finalPreview });
        setCurrentStreak(finalPreview);
      } catch {
        // On any error, fall back safely to Day 1
        setCurrentStreak(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // Live countdown to next UTC midnight — updates every second
  useEffect(() => {
    function calcCountdown() {
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setUTCHours(24, 0, 0, 0);
      const diff = nextMidnight - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdownMs(diff);
      setTimeUntilReset(`resets in ${h}h ${m}m ${String(s).padStart(2,"0")}s`);
    }
    calcCountdown();
    const interval = setInterval(calcCountdown, 1000);
    return () => clearInterval(interval);
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
        {/* Deep radial centre glow */}
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse 80% 60% at 50% 0%, rgba(74,222,128,0.07) 0%, transparent 70%)",
        }} />
        {/* Bottom-left accent */}
        <div style={{
          position:"absolute", bottom:0, left:0, width:"55vw", height:"55vw",
          background:"radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)",
        }} />
        {/* Top-right accent */}
        <div style={{
          position:"absolute", top:0, right:0, width:"45vw", height:"45vw",
          background:"radial-gradient(circle, rgba(74,222,128,0.05) 0%, transparent 70%)",
        }} />
        {/* Subtle noise grid overlay */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(74,222,128,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.025) 1px, transparent 1px)",
          backgroundSize:"48px 48px",
        }} />
      </div>

      {/* Grass silhouettes — bottom corners */}
      <div className="pointer-events-none fixed bottom-0 left-0 z-0 opacity-[0.07]" aria-hidden="true">
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
        @keyframes grassGrow {
          from { clip-path: inset(0 100% 0 0); opacity: 0; }
          to   { clip-path: inset(0 0% 0 0);   opacity: 1; }
        }
        .grass-line { animation: grassGrow 2.8s cubic-bezier(0.22,1,0.36,1) 0.8s both; }
        @keyframes livePulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.75); }
        }
        .live-dot { animation: livePulse 2s ease-in-out infinite; }
        @keyframes certReveal {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cert-reveal { animation: certReveal 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes uploadShimmer {
          0%   { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
          50%  { box-shadow: 0 0 28px 4px rgba(74,222,128,0.13); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }
        .upload-live { animation: uploadShimmer 3s ease-in-out infinite; }
      `}</style>

      {/* All page content sits above fixed bg */}
      <div className="relative z-10 w-full flex flex-col items-center">

      {/* Header */}
      <div className="text-center mb-14">
        <span className="text-xs tracking-[0.4em] text-[#4ade80] uppercase mb-3 block">
          Official Certification System
        </span>
        <h1 className="text-5xl font-bold tracking-tight text-white leading-tight">
          Proof of Grass
        </h1>
        <p className="mt-4 text-[#6b8f6e] text-sm max-w-sm mx-auto">
          Upload your evidence. Receive your certificate. Touch more grass.
        </p>
        <a
          href="/leaderboard"
          className="
            inline-flex items-center gap-2 mt-5 mb-1
            font-mono text-xs tracking-widest uppercase
            text-[#4ade80] opacity-60
            hover:opacity-100 hover:shadow-[0_0_12px_rgba(74,222,128,0.3)]
            transition-all duration-200
          "
        >
          🌱 View Leaderboard
        </a>
        <div className="mt-3 h-px w-24 bg-[#4ade80] mx-auto opacity-40" />
      </div>

      {/* Step 1 — Username */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1f3d22]" />
          <span className="text-[10px] tracking-[0.3em] text-[#3a5e3d] uppercase">
            Step 1 — Your Username
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1f3d22]" />
        </div>

        <div className="relative rounded-sm border border-[#1f3d22] bg-[#07110a] shadow-[inset_0_1px_0_rgba(74,222,128,0.1),0_0_20px_rgba(74,222,128,0.05)] px-5 py-5">
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#4ade80] opacity-30" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#4ade80] opacity-30" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#4ade80] opacity-30" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#4ade80] opacity-30" />

          <label className="block font-mono text-[10px] tracking-[0.25em] text-[#4ade80] uppercase opacity-60 mb-1.5">
            X Username
          </label>
          <input
            type="text"
            value={rawUsername}
            onChange={(e) => { setRawUsername(e.target.value); setRestoredFromStorage(false); }}
            placeholder="yourhandle"
            className="
              w-full bg-[#060e07] border border-[#1f3d22]
              text-[#d1fae5] font-mono text-sm
              px-4 py-2.5 rounded-sm
              placeholder:text-[#2a4a2d]
              focus:outline-none focus:border-[#4ade80]
              focus:shadow-[0_0_12px_rgba(74,222,128,0.15)]
              transition-all duration-200
            "
          />
          {!hasUsername ? (
            <p className="font-mono text-[10px] text-[#3a5e3d] tracking-wide mt-2">
              enter your username — your streak loads automatically
            </p>
          ) : (
            <div className="flex flex-col gap-1 mt-2">
              {/* Welcome back line — shown only when username was restored */}
              {restoredFromStorage && (
                <p className="font-mono text-[10px] text-[#2a4a2d] tracking-wide">
                  welcome back @{username}
                </p>
              )}
              {/* Line 1: streak confirmation — always bright green */}
              <p className="font-mono text-[10px] text-[#4ade80] tracking-wide">
                ✓ streak loaded for @{username} — day {currentStreak}
              </p>
              {/* Line 2: status with tone-driven icon and color */}
              {streakStatus && (() => {
                const toneStyles = {
                  neutral: { color: "text-[#3a5e3d]",  icon: "🌱" },
                  success: { color: "text-[#4ade80]",  icon: "✅" },
                  warning: { color: "text-[#f59e0b]",  icon: "🔥" },
                  reset:   { color: "text-[#ef4444]",  icon: "💀" },
                };
                const { color, icon } = toneStyles[streakTone] ?? toneStyles.neutral;
                return (
                  <p className={`font-mono text-[10px] tracking-wide ${color}`}>
                    {icon} {streakStatus}
                  </p>
                );
              })()}
              {/* Line 3: urgency countdown to UTC midnight */}
              {(() => {
                const msLeft = countdownMs ?? Infinity;
                const minsLeft = Math.floor(msLeft / 60000);
                let urgencyColor, urgencyMsg;
                if (msLeft < 3600000) {
                  // < 1 hour — danger
                  urgencyColor = "text-[#ef4444]";
                  urgencyMsg = `🔥 ${minsLeft}m left — don't lose your streak`;
                } else if (msLeft < 10800000) {
                  // 1–3 hours — warning
                  urgencyColor = "text-[#f59e0b]";
                  urgencyMsg = "⚠️ don't forget to check in today";
                } else {
                  // > 3 hours — normal
                  urgencyColor = "text-[#2a4a2d]";
                  urgencyMsg = "streak active — keep it going";
                }
                return (
                  <div className="flex flex-col gap-0.5">
                    <p className={`font-mono text-[10px] tracking-wide ${urgencyColor}`}>
                      {urgencyMsg}
                    </p>
                    <p className={`font-mono text-[10px] tabular-nums tracking-wide ${urgencyColor} opacity-60`}>
                      {timeUntilReset}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Step 2 — Upload */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1f3d22]" />
          <span className={`text-[10px] tracking-[0.3em] uppercase transition-colors duration-300 ${hasUsername ? "text-[#3a5e3d]" : "text-[#1a3520]"}`}>
            Step 2 — Upload Your Proof
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1f3d22]" />
        </div>

        <div className={`transition-all duration-300 rounded-sm ${hasUsername ? "opacity-100 upload-live" : "opacity-30 pointer-events-none select-none"}`}>
          <UploadBox onUpload={handleImageUpload} />
        </div>

        {!hasUsername && (
          <p className="font-mono text-[10px] text-[#1f3d22] tracking-wide text-center mt-2">
            enter your username above to unlock this step
          </p>
        )}
      </div>

      {/* Live Activity Feed */}
      <div className="w-full max-w-md mb-8">
        <StreakFeed />
      </div>

      {/* Certificate */}
      {imageSrc && hasUsername && (
        <div ref={resultRef} className="mt-8 w-full max-w-4xl cert-reveal">
          <p className="text-center text-xs tracking-widest text-[#4ade80] uppercase mb-6">
            ✦ Certificate Generated ✦
          </p>
          <ResultCard
            imageSrc={imageSrc}
            username={username}
            initialStreak={currentStreak}
            onStreakUpdate={setCurrentStreak}
          />
          <div className="flex justify-center mt-10">
            <a
              href="/leaderboard"
              className="
                inline-flex items-center gap-2
                font-mono text-xs tracking-widest uppercase
                text-[#4ade80] opacity-60
                hover:opacity-100 hover:shadow-[0_0_12px_rgba(74,222,128,0.3)]
                transition-all duration-200
              "
            >
              🌱 View Leaderboard
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

      <footer className="mt-2 text-[#334d35] text-xs text-center pb-4">
        © {new Date().getFullYear()} Proof of Grass · All rights reserved
      </footer>
      </div>{/* end z-10 wrapper */}
    </main>
  );
}