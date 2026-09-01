// components/V2Ticker.js
// V2 pill-style scrolling activity ticker
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { V2 } from "../utils/v2Theme";

const MILESTONE_LABELS = {
  milestone_10:  "hit Day 10 🔥",
  milestone_20:  "hit Day 20 🌱",
  milestone_30:  "hit Day 30 🌿",
  milestone_50:  "hit Day 50 ⭐",
  milestone_100: "hit Day 100 🏆",
  milestone_180: "hit Day 180 ⚡",
  milestone_365: "hit Day 365 👑",
  milestone_500: "hit Day 500 🌌",
  lucky_touch_rare:   "got a Rare Lucky Touch ✨",
  lucky_touch_common: "got a Lucky Touch 🍀",
};

export default function V2Ticker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [subRes, actRes, chalRes, spotRes, refRes] = await Promise.all([
          supabase.from("Submissions").select("username,created_at")
            .eq("status", "approved").order("created_at", { ascending: false }).limit(20),
          supabase.from("ScoreEvents").select("username,event_type,created_at")
            .in("event_type", Object.keys(MILESTONE_LABELS))
            .order("created_at", { ascending: false }).limit(15),
          supabase.from("Challenges").select("challenger,challenged,duration_days,status,created_at")
            .order("created_at", { ascending: false }).limit(8),
          supabase.from("CommunitySpotlights").select("username,category,display_name,created_at")
            .eq("status", "active").order("created_at", { ascending: false }).limit(5),
          supabase.from("Referrals").select("referrer_username,referred_username,converted_at,created_at")
            .eq("status", "converted").order("created_at", { ascending: false }).limit(5),
        ]);

        const feed = [];

        (subRes.data || []).forEach(s => feed.push({
          emoji: "🌿", text: `@${s.username} touched grass`, time: s.created_at,
        }));
        (actRes.data || []).forEach(se => {
          const label = MILESTONE_LABELS[se.event_type];
          if (label) feed.push({ emoji: "⚡", text: `@${se.username} ${label}`, time: se.created_at });
        });
        (chalRes.data || []).forEach(c => {
          if (c.status === "completed") {
            feed.push({ emoji: "🏆", text: `@${c.challenger} vs @${c.challenged} — ${c.duration_days}d challenge complete`, time: c.created_at });
          } else {
            feed.push({ emoji: "⚡", text: `@${c.challenger} challenged @${c.challenged} · ${c.duration_days} days`, time: c.created_at });
          }
        });
        (spotRes.data || []).forEach(s => feed.push({
          emoji: "🌟", text: `@${s.username} won ${s.display_name || s.category} Spotlight`, time: s.created_at,
        }));
        (refRes.data || []).forEach(r => feed.push({
          emoji: "🤝", text: `@${r.referrer_username} brought @${r.referred_username} to Day 10`, time: r.converted_at || r.created_at,
        }));

        feed.sort((a, b) => new Date(b.time) - new Date(a.time));
        setItems(feed.slice(0, 40));
      } catch(e) { console.warn("ticker error", e); }
    })();
  }, []);

  if (!items.length) return null;

  const doubled = [...items, ...items];

  const css = `
    .v2-ticker-outer {
      width: 100%;
      overflow: hidden;
      background: rgba(255,255,255,0.6);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(200,220,190,0.4);
      padding: 8px 0;
    }
    .v2-ticker-track {
      display: flex;
      gap: 8px;
      width: max-content;
      animation: v2TickerScroll 120s linear infinite;
      align-items: center;
    }
    .v2-ticker-track:hover { animation-play-state: paused; }
    @keyframes v2TickerScroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .v2-ticker-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.9);
      border: 1px solid rgba(200,220,190,0.5);
      border-radius: 20px;
      padding: 5px 14px;
      font-size: 12px;
      font-weight: 500;
      color: ${V2.forestGreen};
      white-space: nowrap;
      flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(26,74,10,0.06);
      font-family: ${V2.fontSans};
    }
    .v2-ticker-emoji { font-size: 13px; }
    @media (prefers-reduced-motion: reduce) {
      .v2-ticker-track { animation: none; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="v2-ticker-outer">
        <div className="v2-ticker-track">
          {doubled.map((item, i) => (
            <div key={i} className="v2-ticker-pill">
              <span className="v2-ticker-emoji">{item.emoji}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}