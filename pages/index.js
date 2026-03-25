import { useState, useRef, useEffect } from "react";
import UploadBox from "../components/UploadBox";
import ResultCard from "../components/ResultCard";
import { supabase } from "../utils/supabase";

function normalizeUsername(val) {
  return String(val ?? "").replace(/@/g, "").toLowerCase().trim();
}

function computePreviewStreak(streakRow) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (!streakRow) return 1;
  const last = streakRow.last_submission_date;
  if (last === todayStr) return streakRow.current_streak;
  if (last === yesterdayStr) return streakRow.current_streak + 1;
  return 1;
}

export default function Home() {
  const [rawUsername, setRawUsername] = useState("");
  const [imageSrc, setImageSrc] = useState(null);
  const [currentStreak, setCurrentStreak] = useState(1);
  const resultRef = useRef(null);

  const username = normalizeUsername(rawUsername);
  const hasUsername = username.length > 0;

  // Preload streak whenever username changes (debounced 500ms)
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

  const handleImageUpload = (src) => {
    setImageSrc(src);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <main className="min-h-screen bg-[#0d1a0f] text-white flex flex-col items-center px-4 py-16 font-mono">

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

        <div className="relative rounded-sm border border-[#1a3520] bg-[#0a140b] shadow-[inset_0_1px_0_rgba(74,222,128,0.06)] px-5 py-5">
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
            onChange={(e) => setRawUsername(e.target.value)}
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
          <p className="font-mono text-[10px] text-[#3a5e3d] tracking-wide mt-2">
            {hasUsername
              ? `✓ streak loaded for @${username} — day ${currentStreak}`
              : "enter your username — your streak loads automatically"
            }
          </p>
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

        <div className={`transition-all duration-300 ${hasUsername ? "opacity-100" : "opacity-30 pointer-events-none select-none"}`}>
          <UploadBox onUpload={handleImageUpload} />
        </div>

        {!hasUsername && (
          <p className="font-mono text-[10px] text-[#1f3d22] tracking-wide text-center mt-2">
            enter your username above to unlock this step
          </p>
        )}
      </div>

      {/* Certificate */}
      {imageSrc && hasUsername && (
        <div ref={resultRef} className="mt-8 w-full max-w-4xl">
          <p className="text-center text-xs tracking-widest text-[#4ade80] uppercase mb-6">
            ✦ Certificate Generated ✦
          </p>
          <ResultCard
            imageSrc={imageSrc}
            username={username}
            initialStreak={currentStreak}
            onStreakUpdate={setCurrentStreak}
          />
        </div>
      )}

      <footer className="mt-24 text-[#334d35] text-xs text-center">
        © {new Date().getFullYear()} Proof of Grass · All rights reserved
      </footer>
    </main>
  );
}