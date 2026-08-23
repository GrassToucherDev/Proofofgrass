// pages/grass-draw.js
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "../utils/supabase";

const T = {
  bg:      "#080a06",
  bg2:     "#0e100b",
  bg3:     "#141710",
  border:  "rgba(255,255,255,0.055)",
  olive:   "#93a85a",
  gold:    "#c8a84b",
  white:   "#f0efea",
  muted:   "rgba(240,239,234,0.52)",
  dim:     "rgba(240,239,234,0.24)",
  green:   "#4ade80",
  red:     "#f87171",
};

function normalizeUsername(v) {
  return (v || "").toLowerCase().replace(/[^a-z0-9_.\-]/g, "").slice(0, 32);
}

function StatBox({ label, value, sub, accent, large }) {
  return (
    <div style={{
      background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.dim }}>{label}</div>
      <div style={{
        fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: large ? "clamp(36px,6vw,52px)" : "clamp(22px,4vw,32px)",
        fontWeight: 700, color: accent || T.white, lineHeight: 1,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted }}>{sub}</div>}
    </div>
  );
}

function EntryRow({ entry }) {
  const LABELS = {
    proof:            { emoji: "🌿", label: "Daily Proof" },
    spotlight:        { emoji: "🌟", label: "Spotlight Winner" },
    flex_card:        { emoji: "🃏", label: "Flex Card Post" },
    field_guide:      { emoji: "📖", label: "Field Guide Entry" },
    x_engagement:     { emoji: "𝕏",  label: "X Engagement" },
    challenge_win:    { emoji: "⚡", label: "Challenge Win" },
    referral_convert: { emoji: "🤝", label: "Referral Convert" },
    manual:           { emoji: "✦",  label: "Bonus Entry" },
  };
  const { emoji, label } = LABELS[entry.entry_type] || { emoji: "✦", label: entry.entry_type };
  const date = new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0", borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(147,168,90,0.08)",
        border: `1px solid ${T.border}`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: T.white, fontWeight: 500 }}>{label}</div>
        {entry.entry_type === 'proof' && (
          <div style={{ fontSize: 11, color: T.dim }}>
            Day {entry.streak_at_time} · {entry.multiplier}× weight
          </div>
        )}
        {entry.notes && <div style={{ fontSize: 11, color: T.dim }}>{entry.notes}</div>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.olive }}>
          +{parseFloat(entry.weighted_amount).toFixed(2)}
        </div>
        <div style={{ fontSize: 10, color: T.dim }}>{date}</div>
      </div>
    </div>
  );
}

function MultiplierBadge({ streak }) {
  const tiers = [
    { min: 200, mult: "2.00×", label: "Day 200+", color: "#a855f7" },
    { min: 100, mult: "1.75×", label: "Day 100+", color: "#3b82f6" },
    { min: 50,  mult: "1.50×", label: "Day 50+",  color: "#06b6d4" },
    { min: 30,  mult: "1.30×", label: "Day 30+",  color: T.olive },
    { min: 14,  mult: "1.15×", label: "Day 14+",  color: T.gold },
    { min: 0,   mult: "1.00×", label: "Days 1–13", color: T.muted },
  ];
  const tier = tiers.find(t => streak >= t.min) || tiers[tiers.length - 1];
  const next = tiers.slice().reverse().find(t => t.min > streak);

  return (
    <div style={{
      background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: "18px 20px",
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.dim, marginBottom: 8 }}>
        Current Streak Weight
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: "clamp(32px,5vw,44px)", fontWeight: 700, color: tier.color, lineHeight: 1,
        }}>{tier.mult}</div>
        <div style={{ fontSize: 12, color: T.muted }}>per proof<br/>Day {streak} streak</div>
      </div>
      {/* Tier ladder */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {tiers.slice().reverse().map(t => {
          const active = tier.min === t.min;
          return (
            <div key={t.min} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%",
                background: active ? t.color : T.border, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: active ? t.color : T.dim, fontWeight: active ? 700 : 400 }}>
                {t.label} — {t.mult}
              </div>
              {active && <div style={{ fontSize: 9, color: t.color, letterSpacing: "0.1em" }}>← YOU</div>}
            </div>
          );
        })}
      </div>
      {next && (
        <div style={{ marginTop: 12, fontSize: 11, color: T.dim, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
          Reach Day {next.min} to unlock <span style={{ color: next.color }}>{next.mult}</span> weight
        </div>
      )}
    </div>
  );
}

function BonusCapBar({ proofEntries, totalBonus, activeBonus, pendingBonus }) {
  const maxBonus = proofEntries * 0.5;
  const pct = maxBonus > 0 ? Math.min((activeBonus / maxBonus) * 100, 100) : 0;

  return (
    <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.dim, marginBottom: 12 }}>
        Bonus Entry Cap
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: T.muted }}>Active Bonus</span>
        <span style={{ fontSize: 12, color: T.olive, fontWeight: 700 }}>
          {parseFloat(activeBonus).toFixed(2)} / {parseFloat(maxBonus).toFixed(2)}
        </span>
      </div>
      <div style={{ height: 6, background: T.bg3, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: T.olive,
          borderRadius: 3, transition: "width 0.5s" }} />
      </div>
      <div style={{ fontSize: 11, color: T.dim }}>
        Bonus entries are capped at 50% of your Proof entries.
      </div>
      {pendingBonus > 0 && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(200,168,75,0.06)",
          border: `1px solid rgba(200,168,75,0.2)`, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: T.gold, fontWeight: 600, marginBottom: 2 }}>
            ⏳ {parseFloat(pendingBonus).toFixed(2)} bonus entries pending
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>
            Keep submitting Proofs to unlock them.
          </div>
        </div>
      )}
    </div>
  );
}

function RewardsPreview() {
  return (
    <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.dim, marginBottom: 14 }}>
        Monthly Rewards Pool
      </div>
      {[
        { icon: "⚡", label: "Grass Score Boost", detail: "+250 Grass Score", count: "10 winners" },
        { icon: "🛡️", label: "Streak Shield",     detail: "Protects your streak",  count: "5 winners" },
        { icon: "🎨", label: "Profile Pack",      detail: "Exclusive cover pack",   count: "5 winners" },
        { icon: "🖼️", label: "NFT",               detail: "Screen Touchers & more", count: "Admin set" },
      ].map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
          padding: "10px 0", borderBottom: i < 3 ? `1px solid ${T.border}` : "none" }}>
          <span style={{ fontSize: 20 }}>{r.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: T.white, fontWeight: 600 }}>{r.label}</div>
            <div style={{ fontSize: 11, color: T.dim }}>{r.detail}</div>
          </div>
          <div style={{ fontSize: 11, color: T.muted, textAlign: "right" }}>{r.count}</div>
        </div>
      ))}
      <div style={{ marginTop: 12, fontSize: 11, color: T.dim, lineHeight: 1.6 }}>
        Draw order: Score Boosts → Shields → Packs → NFTs.<br />
        NFT eligibility requires a connected Solana wallet.
      </div>
    </div>
  );
}

export default function GrassDraw() {
  const [rawUsername, setRawUsername]   = useState("");
  const [cycle,       setCycle]         = useState(null);
  const [totals,      setTotals]        = useState(null);
  const [streak,      setStreak]        = useState(0);
  const [entries,     setEntries]       = useState([]);
  const [loading,     setLoading]       = useState(false);
  const [searched,    setSearched]      = useState(false);
  const [error,       setError]         = useState("");
  const [walletOk,    setWalletOk]      = useState(false);

  const username = normalizeUsername(rawUsername);

  // Load active cycle on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("grass_draw_cycles")
        .select("*")
        .eq("status", "active")
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString())
        .single();
      setCycle(data || null);
    })();
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!username || !cycle) return;
    setLoading(true);
    setError("");

    try {
      const [totalsRes, streakRes, entriesRes, profileRes] = await Promise.all([
        supabase.from("grass_draw_user_totals")
          .select("*").eq("cycle_id", cycle.id).ilike("username", username).maybeSingle(),
        supabase.from("Streaks")
          .select("current_streak").ilike("username", username).maybeSingle(),
        supabase.from("grass_draw_entries")
          .select("*").eq("cycle_id", cycle.id).ilike("username", username)
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("Profiles")
          .select("wallet_verified,wallet_address").ilike("username", username).maybeSingle(),
      ]);

      if (!totalsRes.data && !streakRes.data) {
        setError("Username not found.");
      } else {
        setTotals(totalsRes.data || null);
        setStreak(streakRes.data?.current_streak || 0);
        setEntries(entriesRes.data || []);
        setWalletOk(!!(profileRes.data?.wallet_verified && profileRes.data?.wallet_address));
      }
    } catch(e) {
      setError("Failed to load data.");
    }
    setLoading(false);
    setSearched(true);
  }, [username, cycle]);

  const daysRemaining = cycle
    ? Math.max(0, Math.ceil((new Date(cycle.ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  const cycleMonth = cycle
    ? new Date(cycle.starts_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const css = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;min-height:100vh;}
    .username-input{background:rgba(0,0,0,0.3);border:1px solid ${T.border};border-radius:10px;
      padding:10px 14px;color:${T.white};font-size:14px;outline:none;width:100%;}
    .username-input:focus{border-color:rgba(147,168,90,0.5);}
    .search-btn{background:${T.olive};color:#0a0c08;border:none;border-radius:10px;
      padding:10px 24px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;}
    @media(max-width:600px){.stats-grid{grid-template-columns:1fr 1fr !important;}}
    @media(max-width:400px){.stats-grid{grid-template-columns:1fr !important;}}
  `;

  return (
    <>
      <Head>
        <title>Grass Draw | Proof of Grass</title>
        <meta name="description" content="Check your Grass Draw entries and monthly reward eligibility." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 0", borderBottom: `1px solid ${T.border}`, marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src="/touchgrass-transparent.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: T.white }}>Proof of Grass</span>
            </div>
          </Link>
          <Link href="/" style={{ fontSize: 12, color: T.dim, textDecoration: "none" }}>← Dashboard</Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            color: T.gold, marginBottom: 10 }}>Monthly Draw</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: "clamp(32px,6vw,52px)", fontWeight: 700, color: T.white, marginBottom: 12 }}>
            The Grass Draw
          </h1>
          {cycle ? (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: T.muted }}>
                📅 {new Date(cycle.starts_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                {" – "}
                {new Date(cycle.ends_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
              </div>
              <div style={{ fontSize: 13, color: T.olive, fontWeight: 600 }}>
                {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: T.dim }}>No active draw cycle right now.</div>
          )}
        </div>

        {/* Username search */}
        <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
          <input className="username-input" type="text" placeholder="Enter your username"
            value={rawUsername}
            onChange={e => setRawUsername(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") fetchUserData(); }}
          />
          <button className="search-btn" onClick={fetchUserData} disabled={!username || !cycle || loading}>
            {loading ? "Loading…" : "Check Entries"}
          </button>
        </div>

        {error && (
          <div style={{ fontSize: 13, color: T.red, marginBottom: 24, padding: "12px 16px",
            background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 10 }}>{error}</div>
        )}

        {searched && !error && cycle && (
          <>
            {/* Eligibility banner */}
            {totals ? (
              totals.disqualified ? (
                <div style={{ padding: "14px 16px", background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.red }}>
                    ⛔ Disqualified from this cycle
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                    Your entries have been removed for this draw cycle.
                  </div>
                </div>
              ) : totals.eligible ? (
                <div style={{ padding: "14px 16px", background: "rgba(147,168,90,0.08)",
                  border: "1px solid rgba(147,168,90,0.3)", borderRadius: 10, marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.olive }}>
                    ✓ Eligible for the {cycleMonth} Grass Draw
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                    {walletOk
                      ? "Wallet connected — eligible for all rewards including NFTs."
                      : "Connect a wallet to become eligible for NFT rewards."}
                  </div>
                </div>
              ) : (
                <div style={{ padding: "14px 16px", background: "rgba(200,168,75,0.06)",
                  border: "1px solid rgba(200,168,75,0.2)", borderRadius: 10, marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>
                    ⏳ Not yet eligible — {totals.proof_day_count}/7 proof days
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                    Complete {7 - totals.proof_day_count} more proof day{7 - totals.proof_day_count !== 1 ? "s" : ""} to unlock eligibility.
                    Your entries are already accumulating.
                  </div>
                </div>
              )
            ) : (
              <div style={{ padding: "14px 16px", background: "rgba(200,168,75,0.06)",
                border: "1px solid rgba(200,168,75,0.2)", borderRadius: 10, marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: T.gold }}>
                  No entries yet this cycle. Submit your first proof to start earning!
                </div>
              </div>
            )}

            {/* Main stats */}
            <div className="stats-grid" style={{ display: "grid",
              gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              <StatBox
                label="Total Active Entries"
                value={totals ? parseFloat(totals.total_active_entries).toFixed(2) : "0.00"}
                large
                accent={T.olive}
              />
              <StatBox
                label="Proof Entries"
                value={totals ? parseFloat(totals.proof_entries).toFixed(2) : "0.00"}
                sub={`${totals?.proof_day_count ?? 0} proof days`}
              />
              <StatBox
                label="Active Bonus"
                value={totals ? parseFloat(totals.active_bonus_entries).toFixed(2) : "0.00"}
                sub={totals?.pending_bonus_entries > 0
                  ? `+${parseFloat(totals.pending_bonus_entries).toFixed(2)} pending`
                  : "No pending"}
                accent={totals?.pending_bonus_entries > 0 ? T.gold : undefined}
              />
            </div>

            {/* Multiplier + bonus cap */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <MultiplierBadge streak={streak} />
              <BonusCapBar
                proofEntries={parseFloat(totals?.proof_entries ?? 0)}
                totalBonus={parseFloat(totals?.total_bonus_entries ?? 0)}
                activeBonus={parseFloat(totals?.active_bonus_entries ?? 0)}
                pendingBonus={parseFloat(totals?.pending_bonus_entries ?? 0)}
              />
            </div>

            {/* Recent entries */}
            {entries.length > 0 && (
              <div style={{ background: T.bg2, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
                  color: T.dim, marginBottom: 14 }}>Recent Entry Activity</div>
                {entries.map(e => <EntryRow key={e.id} entry={e} />)}
              </div>
            )}

            {/* Wallet CTA */}
            {!walletOk && (
              <div style={{ background: "rgba(200,168,75,0.04)", border: `1px solid rgba(200,168,75,0.2)`,
                borderRadius: 12, padding: "18px 20px", marginBottom: 16,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.gold, marginBottom: 4 }}>
                    Connect your wallet for NFT eligibility
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>
                    A Solana wallet is required to be eligible for NFT rewards in the Grass Draw.
                  </div>
                </div>
                <Link href={`/u/${username}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px",
                  background: "rgba(200,168,75,0.12)", border: `1px solid rgba(200,168,75,0.35)`,
                  borderRadius: 8, color: T.gold, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  Go to Profile →
                </Link>
              </div>
            )}
          </>
        )}

        {/* Rewards preview — always visible */}
        <div style={{ marginTop: searched ? 0 : 0 }}>
          <RewardsPreview />
        </div>

        {/* How it works */}
        <div style={{ marginTop: 16, background: T.bg2, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
            color: T.dim, marginBottom: 14 }}>How It Works</div>
          {[
            { emoji: "🌿", title: "Submit Daily Proofs", body: "Every approved outdoor proof earns Grass Draw entries. The longer your streak, the more entries each proof is worth." },
            { emoji: "📈", title: "Build Your Streak Weight", body: "Reach Day 14 for 1.15× weight, Day 30 for 1.30×, Day 50 for 1.50×, Day 100 for 1.75×, and Day 200 for 2.00×." },
            { emoji: "✦",  title: "Earn Bonus Entries", body: "Win spotlights, post Flex Cards, log Field Guide entries, win challenges, and refer new members for bonus entries. Bonus entries are capped at 50% of your proof entries." },
            { emoji: "🎁", title: "Monthly Draw", body: "At the end of each cycle, winners are drawn by weighted random selection. The more entries you have, the stronger your position. Every proof counts." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0",
              borderBottom: i < 3 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(147,168,90,0.08)",
                border: `1px solid ${T.border}`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{item.emoji}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}