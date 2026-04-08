import { useEffect, useState, useCallback } from "react";
import { supabase } from "../utils/supabase";

function normalizeUsername(val) {
  return String(val ?? "").replace(/@/g, "").toLowerCase().trim();
}

// ── SQL to run once in Supabase ───────────────────────────────────────────
// CREATE TABLE "Challenges" (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   creator_username TEXT NOT NULL,
//   target_days INTEGER NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT now(),
//   status TEXT NOT NULL DEFAULT 'active',
//   winner_username TEXT
// );
// CREATE TABLE "ChallengeParticipants" (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   challenge_id UUID REFERENCES "Challenges"(id) ON DELETE CASCADE,
//   username TEXT NOT NULL,
//   joined_at TIMESTAMPTZ DEFAULT now()
// );
// ─────────────────────────────────────────────────────────────────────────

const SECTION_HDR = "flex items-center gap-2 mb-3";
const LINE_L = "h-px flex-1 bg-gradient-to-r from-transparent to-[#1f3d22]";
const LINE_R = "h-px flex-1 bg-gradient-to-l from-transparent to-[#1f3d22]";
const CARD = `relative rounded-sm border border-[#1f3d22] bg-[#07110a]
  shadow-[inset_0_1px_0_rgba(74,222,128,0.08),0_0_16px_rgba(74,222,128,0.04)]
  px-5 py-4`;
const CORNER = "absolute w-3 h-3 border-[#4ade80] opacity-25";

function Corners() {
  return (
    <>
      <span className={`${CORNER} top-0 left-0 border-t border-l`} />
      <span className={`${CORNER} top-0 right-0 border-t border-r`} />
      <span className={`${CORNER} bottom-0 left-0 border-b border-l`} />
      <span className={`${CORNER} bottom-0 right-0 border-b border-r`} />
    </>
  );
}

export default function ChallengeBox({ username, currentStreak, pendingChallengeId }) {
  // ── create form ─────────────────────────────────────────────────────────
  const [opponent, setOpponent] = useState("");
  const [targetDays, setTargetDays] = useState(5);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // ── pending challenge (from URL param) ──────────────────────────────────
  const [pendingChallenge, setPendingChallenge] = useState(null); // { id, target_days, creator_username }
  const [joining, setJoining] = useState(false);
  const [joinedId, setJoinedId] = useState(null);

  // ── active challenges ────────────────────────────────────────────────────
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);

  // ── load pending challenge from URL ─────────────────────────────────────
  useEffect(() => {
    if (!pendingChallengeId) return;
    async function fetchPending() {
      const { data } = await supabase
        .from("Challenges")
        .select("id, creator_username, target_days, status")
        .eq("id", pendingChallengeId)
        .maybeSingle();
      if (data) setPendingChallenge(data);
    }
    fetchPending();
  }, [pendingChallengeId]);

  // ── load active challenges for current user ──────────────────────────────
  const loadActiveChallenges = useCallback(async () => {
    if (!username) return;
    setLoadingActive(true);
    try {
      // find challenge_ids this user participates in
      const { data: participations } = await supabase
        .from("ChallengeParticipants")
        .select("challenge_id")
        .eq("username", username);

      if (!participations || participations.length === 0) {
        setActiveChallenges([]);
        return;
      }

      const ids = participations.map((p) => p.challenge_id);

      // fetch those challenges
      const { data: challenges } = await supabase
        .from("Challenges")
        .select("id, creator_username, target_days, status, winner_username, created_at")
        .in("id", ids)
        .order("created_at", { ascending: false });

      if (!challenges) { setActiveChallenges([]); return; }

      // for each challenge, fetch participants + their current streaks
      const enriched = await Promise.all(
        challenges.map(async (ch) => {
          const { data: parts } = await supabase
            .from("ChallengeParticipants")
            .select("username, joined_at")
            .eq("challenge_id", ch.id);

          const usernames = (parts || []).map((p) => normalizeUsername(p.username));

          const { data: streakRows } = await supabase
            .from("Streaks")
            .select("username, current_streak")
            .in("username", usernames);

          const streakMap = {};
          (streakRows || []).forEach((s) => {
            streakMap[normalizeUsername(s.username)] = s.current_streak ?? 0;
          });

          const participants = (parts || []).map((p) => ({
            username: normalizeUsername(p.username),
            streak: streakMap[normalizeUsername(p.username)] ?? 0,
            joined_at: p.joined_at,
          }));

          // auto-detect winner: first to hit target, else highest streak
          let winner = ch.winner_username;
          if (!winner && ch.status === "active") {
            const qualifiers = participants.filter((p) => p.streak >= ch.target_days);
            if (qualifiers.length > 0) {
              // highest streak wins; tie → earliest joined
              qualifiers.sort((a, b) => {
                if (b.streak !== a.streak) return b.streak - a.streak;
                return new Date(a.joined_at) - new Date(b.joined_at);
              });
              winner = qualifiers[0].username;
              // persist winner + status
              await supabase
                .from("Challenges")
                .update({ status: "completed", winner_username: winner })
                .eq("id", ch.id);
            }
          }

          // determine leader (highest streak, not winner-locked yet)
          const leader = participants.sort((a, b) => b.streak - a.streak)[0] ?? null;

          return { ...ch, participants, winner, leader };
        })
      );

      setActiveChallenges(enriched);
    } finally {
      setLoadingActive(false);
    }
  }, [username]);

  useEffect(() => {
    loadActiveChallenges();
  }, [loadActiveChallenges]);

  // ── create challenge ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!username) return;
    setCreating(true);
    try {
      const { data: ch, error } = await supabase
        .from("Challenges")
        .insert([{
          creator_username: username,
          target_days: targetDays,
          status: "active",
        }])
        .select()
        .single();

      if (error || !ch) { console.error(error); return; }

      // add creator as participant
      const participants = [{ challenge_id: ch.id, username }];

      // add opponent if provided
      const normOpponent = normalizeUsername(opponent);
      if (normOpponent && normOpponent !== username) {
        participants.push({ challenge_id: ch.id, username: normOpponent });
      }

      await supabase.from("ChallengeParticipants").insert(participants);

      const link = `https://proofofgrass.vercel.app/?challenge=${ch.id}`;
      setCreatedLink(link);
      setOpponent("");
      loadActiveChallenges();
    } finally {
      setCreating(false);
    }
  };

  // ── join challenge ───────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!username || !pendingChallenge) return;
    setJoining(true);
    try {
      // check not already a participant
      const { data: existing } = await supabase
        .from("ChallengeParticipants")
        .select("id")
        .eq("challenge_id", pendingChallenge.id)
        .eq("username", username)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from("ChallengeParticipants")
          .insert([{ challenge_id: pendingChallenge.id, username }]);
      }
      setJoinedId(pendingChallenge.id);
      loadActiveChallenges();
    } finally {
      setJoining(false);
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareOnX = (link, target) => {
    const text = encodeURIComponent(
      `I just challenged @${opponent || "someone"} to a ${target} day streak race.\nFirst to touch grass consistently wins.\n#proofofgrass\n${link}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  if (!username) return null;

  return (
    <div className="w-full max-w-md mb-8">

      {/* Pending challenge invite from URL */}
      {pendingChallenge && pendingChallenge.status === "active" && !joinedId && (
        <div className={`${CARD} mb-6 border-[#f59e0b]`}>
          <Corners />
          <p className="font-mono text-[11px] text-[#f59e0b] tracking-wide mb-2">
            ⚔️ you were challenged to a{" "}
            <span className="font-bold">{pendingChallenge.target_days} day streak race</span>
            {" "}by @{pendingChallenge.creator_username}
          </p>
          <button
            onClick={handleJoin}
            disabled={joining}
            className="
              font-mono text-[11px] tracking-widest uppercase
              bg-[#4ade80] text-[#07110a] font-bold px-4 py-1.5 rounded-sm
              hover:bg-[#86efac] transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {joining ? "joining…" : "accept challenge"}
          </button>
        </div>
      )}
      {joinedId && (
        <p className="font-mono text-[10px] text-[#4ade80] tracking-wide mb-4">
          ✅ you've joined the challenge
        </p>
      )}

      {/* Create challenge */}
      <div className={SECTION_HDR}>
        <div className={LINE_L} />
        <span className="text-[10px] font-mono tracking-[0.3em] text-[#3a5e3d] uppercase">Challenge</span>
        <div className={LINE_R} />
      </div>

      <div className={`${CARD} flex flex-col gap-3`}>
        <Corners />

        {createdLink ? (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[11px] text-[#4ade80] tracking-wide">
              ⚔️ challenge created
            </p>
            <p className="font-mono text-[10px] text-[#3a5e3d] break-all">{createdLink}</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => copyLink(createdLink)}
                className="
                  font-mono text-[10px] tracking-widest uppercase
                  border border-[#2d5e30] text-[#4ade80] px-3 py-1.5 rounded-sm
                  hover:bg-[#0d2b14] transition-all duration-200
                "
              >
                {copiedLink ? "✓ copied" : "⎘ copy link"}
              </button>
              <button
                onClick={() => shareOnX(createdLink, targetDays)}
                className="
                  font-mono text-[10px] tracking-widest uppercase
                  bg-[#4ade80] text-[#07110a] font-bold px-3 py-1.5 rounded-sm
                  hover:bg-[#86efac] transition-all duration-200
                "
              >
                ⬆ post on x
              </button>
              <button
                onClick={() => setCreatedLink(null)}
                className="font-mono text-[10px] text-[#2a4a2d] hover:text-[#3a5e3d] transition-colors"
              >
                new challenge
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] tracking-[0.25em] text-[#4ade80] uppercase opacity-60">
                Opponent Username
              </label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="theirhandle"
                className="
                  w-full bg-[#060e07] border border-[#1f3d22]
                  text-[#d1fae5] font-mono text-sm
                  px-4 py-2 rounded-sm
                  placeholder:text-[#2a4a2d]
                  focus:outline-none focus:border-[#4ade80]
                  transition-all duration-200
                "
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] tracking-[0.25em] text-[#4ade80] uppercase opacity-60">
                Target Streak
              </label>
              <select
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value))}
                className="
                  w-full bg-[#060e07] border border-[#1f3d22]
                  text-[#d1fae5] font-mono text-sm
                  px-4 py-2 rounded-sm
                  focus:outline-none focus:border-[#4ade80]
                  transition-all duration-200
                "
              >
                <option value={3}>3 days</option>
                <option value={5}>5 days</option>
                <option value={10}>10 days</option>
              </select>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="
                w-full font-mono text-xs font-bold tracking-widest uppercase
                bg-transparent border border-[#4ade80] text-[#4ade80]
                py-2.5 rounded-sm
                hover:bg-[#0d2b14] hover:shadow-[0_0_20px_rgba(74,222,128,0.2)]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              "
            >
              {creating ? "creating…" : "⚔️ create challenge"}
            </button>
          </>
        )}
      </div>

      {/* Active challenges list */}
      {activeChallenges.length > 0 && (
        <div className="mt-6">
          <div className={SECTION_HDR}>
            <div className={LINE_L} />
            <span className="text-[10px] font-mono tracking-[0.3em] text-[#3a5e3d] uppercase">Active Challenges</span>
            <div className={LINE_R} />
          </div>

          <div className="flex flex-col gap-3">
            {activeChallenges.map((ch) => {
              const isWon = ch.status === "completed" && ch.winner === username;
              const isLost = ch.status === "completed" && ch.winner && ch.winner !== username;

              return (
                <div
                  key={ch.id}
                  className={`${CARD} ${
                    isWon ? "border-[#4ade80] shadow-[0_0_20px_rgba(74,222,128,0.2)]" :
                    isLost ? "border-[#3a5e3d] opacity-70" :
                    ""
                  }`}
                >
                  <Corners />

                  {/* Status badge */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[11px] text-[#4ade80] font-semibold tracking-wide">
                      {isWon ? "🏆 challenge won" :
                       isLost ? "💀 challenge lost" :
                       "⚔️ in challenge"}
                    </p>
                    <span className="font-mono text-[9px] text-[#3a5e3d] tracking-widest uppercase">
                      target: {ch.target_days} days
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="flex flex-col gap-1">
                    {ch.participants.map((p) => (
                      <div key={p.username} className="flex items-center justify-between">
                        <span className={`font-mono text-[10px] tracking-wide ${p.username === username ? "text-[#4ade80]" : "text-[#3a5e3d]"}`}>
                          @{p.username}{p.username === username ? " (you)" : ""}
                        </span>
                        <span className="font-mono text-[10px] text-[#2a4a2d] tabular-nums">
                          {p.streak}/{ch.target_days} days
                          {p.streak >= ch.target_days ? " 🏆" : ""}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Leader line (active only) */}
                  {ch.status === "active" && ch.leader && (
                    <p className="font-mono text-[9px] text-[#2a4a2d] tracking-wide mt-2">
                      leader: @{ch.leader.username} ({ch.leader.streak}/{ch.target_days})
                    </p>
                  )}

                  {/* Share link */}
                  {ch.status === "active" && (
                    <button
                      onClick={() => copyLink(`https://proofofgrass.vercel.app/?challenge=${ch.id}`)}
                      className="
                        mt-2 font-mono text-[9px] tracking-widest uppercase
                        text-[#2a4a2d] hover:text-[#4ade80] transition-colors duration-200
                      "
                    >
                      ⎘ copy invite link
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}