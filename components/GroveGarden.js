// components/GroveGarden.js — a passive garden for a grove. Nothing to play: every member who locks in
// today puts their WAGO to work, and the garden itself grows with the grove's running streak.
// Members without an Origin get the plain WAGO. `previewOrigins` swaps in sample WAGO Origins (?garden=origins).
import Ico from "./Ico";
import { V2 } from "../utils/v2Theme";

// Garden stage from the grove streak (days).
const STAGES = [
  { min: 0,  name: "Fresh soil",   plants: ["", "", ""],                         note: "Lock in together to plant the first seeds." },
  { min: 3,  name: "Seedlings",    plants: ["sprout", "", "sprout"],             note: "Sprouts are popping up." },
  { min: 7,  name: "Leafy",        plants: ["sprout", "leaf", "sprout"],         note: "The garden is filling out." },
  { min: 14, name: "In bloom",     plants: ["flower", "leaf", "flower"],         note: "Flowers are opening." },
  { min: 30, name: "Full garden",  plants: ["flower", "tree", "flower"],         note: "A thriving garden, kept alive by the whole grove." },
];
export const gardenStage = (days) => {
  let s = 0;
  STAGES.forEach((st, i) => { if (days >= st.min) s = i; });
  return s;
};

// Sample Origins used for the preview, with what each is "doing" when its owner has locked in.
const SAMPLES = [
  { id: 980, job: "Inspecting the garden", icon: "crown" },
  { id: 583, job: "Guarding the gate", icon: "shield" },
  { id: 970, job: "Clearing weeds", icon: "leaf" },
  { id: 376, job: "Tending the flowers", icon: "flower" },
  { id: 845, job: "Selling sundaes", icon: "gift" },
  { id: 269, job: "Pruning the hedges", icon: "leaf" },
  { id: 224, job: "Hanging decorations", icon: "sparkle" },
  { id: 248, job: "Watering the plants", icon: "drop" },
  { id: 142, job: "Watering the plants", icon: "drop" },
  { id: 606, job: "Admiring the view", icon: "sun" },
];
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

export default function GroveGarden({ members = [], streakDays = 0, slots = 6, previewOrigins = false }) {
  if (!members.length) return null;
  const stage = gardenStage(streakDays);
  const st = STAGES[stage];
  const next = STAGES[stage + 1];
  const done = members.filter((m) => m.locked_today).length;
  const plots = members.slice(0, slots);
  return (
    <div className="gv-card gg-card" id="gv-garden">
      <style dangerouslySetInnerHTML={{ __html: `
        .gg-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}
        .gg-title{font-size:18px;font-weight:900;color:${V2.forestGreen};display:flex;align-items:center;gap:8px;margin:0}
        .gg-chip{font-size:12px;font-weight:800;color:${V2.forestGreen};background:#e3f5d6;padding:4px 10px;border-radius:999px}
        .gg-scene{position:relative;border-radius:16px;overflow:hidden;border:1px solid ${V2.borderSoft};
          background:linear-gradient(180deg,#cdeaff 0%,#eaf7ff 38%,#bfe38a 38%,#8fcb4f 100%);padding:14px 10px 12px}
        .gg-sun{position:absolute;top:8px;right:12px;opacity:.95}
        .gg-grid{position:relative;display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:12px 8px;padding-top:34px}
        .gg-plot{display:flex;flex-direction:column;align-items:center;min-width:0}
        .gg-stage{position:relative;width:100%;max-width:150px;aspect-ratio:1/1;display:flex;align-items:flex-end;justify-content:center}
        .gg-wago{width:78%;height:auto;max-height:100%;object-fit:contain;transform-origin:50% 100%;position:relative;z-index:2}
        .gg-wago.on{animation:gg-work 2.4s ease-in-out infinite}
        .gg-wago.off{filter:saturate(.7) brightness(.92);animation:gg-nap 4.2s ease-in-out infinite}
        .gg-prop{position:absolute;top:2px;right:6px;z-index:3;animation:gg-pop 2.4s ease-in-out infinite}
        .gg-zzz{position:absolute;top:4px;right:10px;z-index:3;font-weight:900;font-size:13px;color:#4b6b9a;letter-spacing:1px;animation:gg-zzz 3s ease-in-out infinite}
        .gg-soil{position:relative;z-index:1;width:104%;height:26px;margin-top:-14px;border-radius:50%;background:radial-gradient(ellipse at 50% 40%,#8b5e34 0%,#6b4423 70%,#5a3a1d 100%);box-shadow:0 3px 0 rgba(0,0,0,.12)}
        .gg-plants{position:absolute;left:0;right:0;bottom:-4px;display:flex;justify-content:space-between;padding:0 2px;z-index:3;pointer-events:none}
        .gg-plants span{display:block;animation:gg-sway 3.6s ease-in-out infinite}
        .gg-plants span:nth-child(2){animation-delay:.9s}.gg-plants span:nth-child(3){animation-delay:1.7s}
        .gg-name{margin-top:6px;font-size:12.5px;font-weight:800;color:${V2.forestGreen};max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
          background:rgba(255,255,255,.85);padding:2px 9px;border-radius:999px}
        .gg-job{font-size:11px;color:${V2.textMuted};margin-top:2px;text-align:center;line-height:1.25;min-height:14px}
        .gg-foot{margin-top:12px;font-size:13px;color:${V2.textMuted};line-height:1.45}
        .gg-foot b{color:${V2.forestGreen}}
        .gg-prev{margin-top:8px;font-size:12px;color:${V2.textMuted}}
        @keyframes gg-work{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}
        @keyframes gg-nap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.975)}}
        @keyframes gg-pop{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.12)}}
        @keyframes gg-zzz{0%,100%{opacity:.35;transform:translateY(2px)}50%{opacity:1;transform:translateY(-3px)}}
        @keyframes gg-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
        @media (prefers-reduced-motion:reduce){.gg-wago,.gg-prop,.gg-zzz,.gg-plants span{animation:none!important}}
      ` }} />
      <div className="gg-head">
        <h3 className="gg-title"><Ico n="sprout" size={24} /> Grove Garden</h3>
        <span className="gg-chip">{st.name}</span>
      </div>
      <div className="gg-scene" role="img" aria-label={`Grove garden, ${st.name}. ${done} of ${members.length} WAGOs at work.`}>
        <span className="gg-sun"><Ico n="sun" size={34} /></span>
        <div className="gg-grid">
          {plots.map((m, idx) => {
            const on = !!m.locked_today;
            const sample = previewOrigins ? SAMPLES[(hash(plots[0].username) + idx) % SAMPLES.length] : null;
            const src = sample ? `/garden/origins/${sample.id}.webp` : on ? "/garden/wago-awake.webp" : "/garden/wago-asleep.webp";
            const job = !on ? "Napping until you lock in" : sample ? sample.job : "Hard at work";
            const icon = sample ? sample.icon : "drop";
            return (
              <div className="gg-plot" key={m.username}>
                <div className="gg-stage">
                  <img className={`gg-wago ${on ? "on" : "off"}`} src={src} alt="" loading="lazy" />
                  {on ? <span className="gg-prop"><Ico n={icon} size={22} /></span> : <span className="gg-zzz">Zzz</span>}
                  <div className="gg-plants" aria-hidden="true">
                    {st.plants.map((p, i) => <span key={i}>{p ? <Ico n={p} size={26} /> : <i style={{ display: "block", width: 26, height: 26 }} />}</span>)}
                  </div>
                </div>
                <div className="gg-soil" />
                <div className="gg-name">@{m.username}</div>
                <div className="gg-job">{job}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="gg-foot">
        <b>{done} of {members.length}</b> WAGOs at work today. {st.note}
        {next ? <> The next stage, <b>{next.name}</b>, arrives at a {next.min}-day grove streak.</> : null}
        {previewOrigins && <div className="gg-prev">Preview: sample WAGO Origins are standing in until the collection mints.</div>}
      </div>
    </div>
  );
}
