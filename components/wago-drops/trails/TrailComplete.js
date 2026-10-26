// Celebration screen: reward summary, stats, reward collection, share card.
import Link from "next/link";
import { useState } from "react";
import { V2 } from "../../../utils/v2Theme";
import { T } from "../../../utils/wagoTheme";
import Wago from "../Wago";
import { RewardChips, trailRewardParts, btnPrimary, btnGhost } from "./trailBits";
import TrailShareCard from "./TrailShareCard";
import { formatDistance, formatMinutes, hasReward } from "../../../utils/wagoTrails";

export default function TrailComplete({ trail, progress, stopCount, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [username, setUsername] = useState("");
  const [needUser, setNeedUser] = useState(false);

  const mins = progress.completed_at ? Math.max(1, Math.round((new Date(progress.completed_at) - new Date(progress.started_at)) / 60000)) : null;
  const parts = trailRewardParts(trail);
  const rs = progress.reward_status;
  const collected = !!progress.reward_claimed_at && rs !== "awaiting_wallet" && !(Number(trail.reward_tickets) > 0 && progress.reward_tickets_awarded == null);

  async function collect() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/wago-drops/trails/${trail.id}/claim-reward`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pogUsername: username || undefined }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't collect reward");
      setNeedUser(!!d.need_username);
      if (d.tickets_error) setMsg({ ok: false, text: d.tickets_error });
      else if (d.awaiting_wallet) setMsg({ ok: false, text: "Verify your wallet in Settings to receive the token reward, then tap collect again." });
      else if (d.need_username) setMsg({ ok: false, text: "Enter your Proof of Grass username to receive your Grass Tickets." });
      else setMsg({ ok: true, text: "Reward collected!" });
      onChanged?.();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  }

  const rewardText = parts.map(p => p.text).join("  +  ");
  const shareText = `I just completed the ${trail.name} Trail on WAGO Drops! 🌼 ${stopCount} stops walked for real. #WAGO #ProofOfGrass`;

  return (
    <div style={{ background: "#fff", borderRadius: 22, padding: "22px 18px", border: `1px solid ${V2.borderSoft}`, boxShadow: "0 6px 24px rgba(26,74,10,0.1)", textAlign: "center" }}>
      <Wago pose="cheer" size={150} float />
      <div style={{ fontFamily: "'Fredoka',serif", fontSize: 34, fontWeight: 700, color: T.white, lineHeight: 1.05, marginTop: 4 }}>Trail complete!</div>
      <div style={{ color: T.muted, fontSize: 14, margin: "6px 0 14px" }}>You walked every stop of <b>{trail.name}</b>.</div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[`${stopCount} stops`, trail.distance_m != null && formatDistance(trail.distance_m), mins != null && formatMinutes(mins)].filter(Boolean).map(s => (
          <span key={s} style={{ background: V2.cloudSoft, borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>{s}</span>
        ))}
      </div>

      {hasReward(trail) && (
        <div style={{ background: "#f3fae9", border: "1.5px solid #cfe8b0", borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: V2.grassDark, marginBottom: 8 }}>TRAIL REWARD</div>
          <div style={{ display: "flex", justifyContent: "center" }}><RewardChips trail={trail} size={15} /></div>
          {!collected && (
            <>
              {needUser && (
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Proof of Grass username"
                  style={{ marginTop: 12, width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${V2.borderSoft}`, fontSize: 14 }} />
              )}
              <button onClick={collect} disabled={busy} style={{ ...btnPrimary, marginTop: 12, width: "100%", opacity: busy ? 0.6 : 1 }}>{busy ? "Collecting…" : "Collect reward"}</button>
            </>
          )}
          {collected && (
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: V2.grassDark }}>
              {rs === "pending" ? "✓ Queued — tokens are sent in the next payout run." : rs === "failed" ? "Payout hit a snag — we'll retry." : "✓ Collected"}
              {progress.reward_tickets_awarded ? ` · 🎟️ ${progress.reward_tickets_awarded} tickets added` : ""}
            </div>
          )}
          {msg && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: msg.ok ? V2.grassDark : T.red }}>{msg.text}</div>}
        </div>
      )}

      <TrailShareCard coverUrl={trail.cover_image_url} name={trail.name} city={trail.city} stops={stopCount}
        distanceText={trail.distance_m != null ? formatDistance(trail.distance_m) : null} durationText={mins != null ? formatMinutes(mins) : null}
        rewardText={rewardText} shareText={shareText} />

      <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/wago-drops/trails" style={btnGhost}>More Trails</Link>
        <Link href="/wago-drops/trails/mine" style={btnGhost}>My Trails</Link>
      </div>
    </div>
  );
}
