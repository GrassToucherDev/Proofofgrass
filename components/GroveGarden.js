// components/GroveGarden.js — a passive pixel garden for a grove. Nothing to play: every member who has
// locked in today has their WAGO out working the yard (fishing, watering, picking apples...), members who
// haven't are napping. The garden itself grows with the grove's running streak.
// Members without an Origin get the plain WAGO. `previewOrigins` swaps in sample WAGO Origins (?garden=origins).
import { useEffect, useMemo, useState } from "react";
import { V2 } from "../utils/v2Theme";
import Ico from "./Ico";

// ---- Garden stage from the grove streak (days) ----
const STAGES = [
  { min: 0,  name: "Fresh soil",  note: "Lock in together to plant the first seeds." },
  { min: 3,  name: "Seedlings",   note: "The first sprouts are up." },
  { min: 7,  name: "Leafy",       note: "The beds are filling out." },
  { min: 14, name: "In bloom",    note: "Flowers are opening across the yard." },
  { min: 30, name: "Full garden", note: "A thriving garden, kept alive by the whole grove." },
];
export const gardenStage = (days) => { let s = 0; STAGES.forEach((st, i) => { if (days >= st.min) s = i; }); return s; };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// ---- Scene geometry: everything is in the 1586 x 992 space of the ground art, placed as percentages ----
const W = 1586, H = 992;
const SC = "/garden/scene/";
const PX = 3.3;                      // on-screen size of one WAGO pixel, in scene units
const pw = (n) => `${((n / W) * 100).toFixed(3)}%`;
const ph = (n) => `${((n / H) * 100).toFixed(3)}%`;

// Props: anchor = bottom centre, native sprite size x scale.
const PROPS = {
  pond:      { src: "pond",      x: 420,  y: 590, w: 728, h: 424, sc: .42 },
  bench:     { src: "bench",     x: 1150, y: 345, w: 422, h: 381, sc: .62 },
  stump:     { src: "stump",     x: 930,  y: 580, w: 297, h: 226, sc: .42 },
  mushrooms: { src: "mushrooms", x: 1200, y: 600, w: 259, h: 207, sc: .42 },
  lantern:   { src: "lantern",   x: 520,  y: 800, w: 206, h: 310, sc: .30 },
};
const BEDS = [
  { color: "yellow", x: 1330, y: 500, w: 330, h: 252, sc: .52 },
  { color: "blue",   x: 1110, y: 760, w: 330, h: 252, sc: .52 },
  { color: "red",    x: 800,  y: 850, w: 330, h: 252, sc: .52 },
];
const TREE = { x: 780, y: 330, w: 480, h: 538, sc: .56 };
const bedStages = (s) => [clamp(s, 0, 3), clamp(s - 1, 0, 3), s >= 4 ? 3 : clamp(s - 2, 0, 3)];
const treeSrc = (s) => (s >= 4 ? "tree-2" : s >= 2 ? "tree-1" : "tree-0");

// Where WAGOs work (feet position, which way they face, what they hold) ...
const WORK = [
  { id: "pond1", x: 585, y: 612, face: -1, act: "fish",  prop: "rod",    job: "Fishing at the pond" },
  { id: "bedY",  x: 1285, y: 585, face: 1,  act: "water", prop: "can",    job: "Watering the flowers" },
  { id: "bedB",  x: 1055, y: 835, face: 1,  act: "water", prop: "can",    job: "Watering the flowers" },
  { id: "tree",  x: 760,  y: 360, face: 1,  act: "pick",  prop: "basket", job: "Picking apples" },
  { id: "mush",  x: 1165, y: 660, face: -1, act: "bob",   prop: "basket", job: "Foraging mushrooms" },
  { id: "bedR",  x: 735,  y: 915, face: 1,  act: "water", prop: "can",    job: "Watering the flowers" },
  { id: "path",  x: 330,  y: 835, face: 1,  act: "bob",   prop: null,     job: "Strolling the path" },
  { id: "pond2", x: 300,  y: 650, face: 1,  act: "fish",  prop: "rod",    job: "Fishing at the pond" },
];
// ... and where they nap when they haven't locked in yet.
const NAP = [
  { x: 1100, y: 340, z: 365, job: "Napping on the bench" },
  { x: 1205, y: 325, z: 365, job: "Napping on the bench" },
  { x: 930,  y: 548, z: 600, job: "Napping on the stump" },
  { x: 700,  y: 385, z: 0,   job: "Napping under the tree" },
  { x: 590,  y: 840, z: 0,   job: "Napping by the lantern" },
  { x: 1130, y: 640, z: 0,   job: "Napping by the mushrooms" },
  { x: 960,  y: 700, z: 0,   job: "Napping in the sun" },
  { x: 560,  y: 560, z: 0,   job: "Napping by the pond" },
];

// ---- Characters (pixelated art, native sizes) ----
const SPR_H = { awake: 34, asleep: 34, 980: 35, 583: 40, 970: 37, 376: 37, 845: 39, 269: 39, 224: 38, 248: 38, 142: 37, 606: 32 };
const SAMPLE_IDS = [980, 583, 970, 376, 845, 269, 224, 248, 142, 606];
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const STEP_MS = 7000;

export default function GroveGarden({ members = [], streakDays = 0, slots = 6, previewOrigins = false }) {
  const [step, setStep] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    let reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
    setStill(reduce);
    if (reduce) return undefined;
    const t = setInterval(() => setStep((n) => n + 1), STEP_MS);
    return () => clearInterval(t);
  }, []);

  const stage = gardenStage(streakDays);
  const st = STAGES[stage];
  const next = STAGES[stage + 1];
  const beds = bedStages(stage);
  const plots = members.slice(0, Math.max(slots, 1));
  const seed = plots.length ? hash(plots[0].username) : 0;

  // Work out, for this step, where each member is and what they're doing.
  const cast = useMemo(() => {
    let napIdx = 0, workIdx = 0;
    return plots.map((m, idx) => {
      const on = !!m.locked_today;
      const sampleId = previewOrigins ? SAMPLE_IDS[(seed + idx) % SAMPLE_IDS.length] : null;
      let spot;
      if (on) {
        const w = WORK[(workIdx + (still ? 0 : step)) % WORK.length]; workIdx += 1;
        spot = { ...w, z: 0 };
      } else {
        const n = NAP[napIdx % NAP.length]; napIdx += 1;
        spot = { ...n, act: "nap", prop: null, face: 1 };
      }
      return { m, on, sampleId, spot, idx };
    });
  }, [plots, step, still, previewOrigins, seed]);

  const done = plots.filter((m) => m.locked_today).length;
  if (!plots.length) return null;
  const treeS = TREE;
  return (
    <div className="gv-card gg-card" id="gv-garden">
      <style dangerouslySetInnerHTML={{ __html: `
        .gg-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}
        .gg-title{font-size:18px;font-weight:900;color:${V2.forestGreen};display:flex;align-items:center;gap:8px;margin:0}
        .gg-chip{font-size:12px;font-weight:800;color:${V2.forestGreen};background:#e3f5d6;padding:4px 10px;border-radius:999px}
        .gg-scene{position:relative;width:100%;aspect-ratio:${W}/${H};border-radius:16px;overflow:hidden;border:1px solid ${V2.borderSoft};
          background:#6a9a3c url(${SC}ground.webp) center/100% 100% no-repeat;image-rendering:pixelated}
        .gg-scene img{image-rendering:pixelated;display:block;max-width:none}
        .gg-it{position:absolute;transform:translate(-50%,-100%);pointer-events:none}
        .gg-it img{width:100%;height:auto}
        .gg-wago{position:absolute;pointer-events:none;transform:translate(-50%,-100%);
          transition:left 3.2s ease-in-out,top 3.2s ease-in-out}
        .gg-wago.still{transition:none}
        .gg-flip{position:absolute;inset:0}
        .gg-body{position:absolute;left:0;bottom:0;height:100%;width:auto;transform-origin:50% 100%}
        .gg-walk .gg-body{animation:gg-walk .5s steps(2,end) infinite}
        .gg-act-water .gg-body,.gg-act-pick .gg-body{animation:gg-pick 2.2s ease-in-out infinite}
        .gg-act-fish .gg-body{animation:gg-sway 3s ease-in-out infinite}
        .gg-act-bob .gg-body{animation:gg-bob 1.6s ease-in-out infinite}
        .gg-act-nap .gg-body{animation:gg-nap 3.6s ease-in-out infinite;filter:brightness(.92) saturate(.85)}
        .gg-prop{position:absolute;bottom:18%}
        .gg-prop img{width:100%;height:auto}
        .gg-act-water .gg-prop{animation:gg-tilt 2.2s ease-in-out infinite;transform-origin:30% 70%}
        .gg-act-fish .gg-prop{animation:gg-rod 3s ease-in-out infinite;transform-origin:15% 90%}
        .gg-act-pick .gg-prop,.gg-act-bob .gg-prop{animation:gg-bob 1.6s ease-in-out infinite}
        .gg-name{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:2px;white-space:nowrap;
          font-size:clamp(8px,1.5vw,11px);font-weight:800;color:#fff;background:rgba(20,40,20,.72);padding:1px 6px;border-radius:999px;
          max-width:11ch;overflow:hidden;text-overflow:ellipsis}
        .gg-zzz{position:absolute;left:62%;bottom:78%;font-weight:900;font-size:clamp(9px,1.9vw,15px);color:#e9f4ff;text-shadow:0 1px 0 #1d2c3f,1px 0 0 #1d2c3f,-1px 0 0 #1d2c3f;letter-spacing:1px;animation:gg-zzz 3s ease-in-out infinite}
        .gg-fly{position:absolute;pointer-events:none;animation:gg-fly 4.5s ease-in-out infinite}
        .gg-fly img{width:100%;height:auto}
        .gg-bfly{position:absolute;pointer-events:none;z-index:900;animation:gg-flutter 17s linear infinite}
        .gg-bfly img{width:100%;height:auto;animation:gg-flap .5s steps(2,end) infinite}
        .gg-glow{animation:gg-glow 3.2s ease-in-out infinite}
        .gg-legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 12px;margin-top:12px}
        .gg-li{display:flex;align-items:baseline;gap:6px;min-width:0;font-size:12.5px;color:${V2.textMuted}}
        .gg-li b{color:${V2.forestGreen};max-width:11ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gg-li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gg-foot{margin-top:12px;font-size:13px;color:${V2.textMuted};line-height:1.45}
        .gg-foot b{color:${V2.forestGreen}}
        .gg-prev{margin-top:8px;font-size:12px;color:${V2.textMuted}}
        @keyframes gg-walk{0%{transform:translateY(0)}50%{transform:translateY(-3.5%)}100%{transform:translateY(0)}}
        @keyframes gg-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5%)}}
        @keyframes gg-sway{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}
        @keyframes gg-pick{0%,100%{transform:scaleY(1)}40%{transform:scaleY(1.05) translateY(-1%)}70%{transform:scaleY(.96)}}
        @keyframes gg-nap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.96)}}
        @keyframes gg-tilt{0%,35%,100%{transform:rotate(0)}55%,80%{transform:rotate(-28deg)}}
        @keyframes gg-rod{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
        @keyframes gg-zzz{0%,100%{opacity:.25;transform:translateY(3px)}50%{opacity:1;transform:translateY(-4px)}}
        @keyframes gg-fly{0%,100%{opacity:.15;transform:translate(0,0)}50%{opacity:1;transform:translate(6px,-8px)}}
        @keyframes gg-flutter{0%{left:6%;top:52%}20%{left:30%;top:36%}40%{left:55%;top:48%}60%{left:78%;top:30%}80%{left:50%;top:62%}100%{left:6%;top:52%}}
        @keyframes gg-flap{0%{transform:scaleY(1)}100%{transform:scaleY(.62)}}
        @keyframes gg-glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35) drop-shadow(0 0 6px #ffd45a)}}
        @media (prefers-reduced-motion:reduce){.gg-wago,.gg-body,.gg-prop,.gg-zzz,.gg-fly,.gg-bfly,.gg-bfly img,.gg-glow{animation:none!important;transition:none!important}}
      ` }} />
      <div className="gg-head">
        <h3 className="gg-title"><Ico n="sprout" size={24} /> Grove Garden</h3>
        <span className="gg-chip">{st.name}</span>
      </div>

      <div className="gg-scene" role="img" aria-label={`Grove garden, ${st.name}. ${done} of ${plots.length} WAGOs at work.`}>
        {/* props (z = their ground line, so WAGOs walk in front of / behind them) */}
        <div className="gg-it" style={{ left: pw(PROPS.pond.x), top: ph(PROPS.pond.y), width: pw(PROPS.pond.w * PROPS.pond.sc), zIndex: 1 }}><img src={`${SC}pond.webp`} alt="" /></div>
        {BEDS.map((b, i) => (
          <div className="gg-it" key={b.color} style={{ left: pw(b.x), top: ph(b.y), width: pw(b.w * b.sc), zIndex: b.y }}>
            <img src={`${SC}bed-${b.color}-${beds[i]}.webp`} alt="" />
          </div>
        ))}
        <div className="gg-it" style={{ left: pw(treeS.x), top: ph(treeS.y), width: pw(treeS.w * treeS.sc), zIndex: treeS.y }}><img src={`${SC}${treeSrc(stage)}.webp`} alt="" /></div>
        {["bench", "stump", "mushrooms"].map((k) => (
          <div className="gg-it" key={k} style={{ left: pw(PROPS[k].x), top: ph(PROPS[k].y), width: pw(PROPS[k].w * PROPS[k].sc), zIndex: PROPS[k].y }}><img src={`${SC}${k}.webp`} alt="" /></div>
        ))}
        <div className={`gg-it${stage >= 2 ? " gg-glow" : ""}`} style={{ left: pw(PROPS.lantern.x), top: ph(PROPS.lantern.y), width: pw(PROPS.lantern.w * PROPS.lantern.sc), zIndex: PROPS.lantern.y }}><img src={`${SC}lantern.webp`} alt="" /></div>

        {/* ambient life */}
        {[[300, 300], [560, 480], [900, 420], [1000, 640], [1400, 300], [650, 760]].map(([x, y], i) => (
          <div className="gg-fly" key={i} style={{ left: pw(x), top: ph(y), width: pw(26), zIndex: 800, animationDelay: `${i * 0.9}s` }}><img src={`${SC}sparkle.webp`} alt="" /></div>
        ))}
        {stage >= 3 && <div className="gg-bfly" style={{ width: pw(54) }}><img src={`${SC}butterfly.webp`} alt="" /></div>}

        {/* the WAGOs */}
        {cast.map(({ m, on, sampleId, spot, idx }) => {
          const key = sampleId || (on ? "awake" : "asleep");
          const h = SPR_H[key] * PX;
          const src = sampleId ? `/garden/pix/origin-${sampleId}.png` : `/garden/pix/wago-${on ? "awake" : "asleep"}.png`;
          const act = spot.act;
          const z = spot.z || Math.round(spot.y);
          return (
            <div key={m.username} className={`gg-wago gg-act-${act}${still ? " still" : ""}`}
              style={{ left: pw(spot.x), top: ph(spot.y), height: ph(h), width: pw(h * 0.9), zIndex: z }}>
              <div className="gg-flip" style={{ transform: `scaleX(${spot.face || 1})` }}>
                <img className="gg-body" src={src} alt="" />
                {spot.prop && <span className="gg-prop" style={{ left: "62%", width: spot.prop === "rod" ? "70%" : "46%" }}><img src={`${SC}${spot.prop}.webp`} alt="" /></span>}
              </div>
              {!on && <span className="gg-zzz">Zzz</span>}
              <span className="gg-name">@{m.username}</span>
            </div>
          );
        })}
      </div>

      <div className="gg-legend">
        {cast.map(({ m, spot }) => (
          <div className="gg-li" key={m.username}><b>@{m.username}</b><span>{spot.job}</span></div>
        ))}
      </div>
      <div className="gg-foot">
        <b>{done} of {plots.length}</b> WAGOs at work today. {st.note}
        {next ? <> The next stage, <b>{next.name}</b>, arrives at a {next.min}-day grove streak.</> : null}
        {previewOrigins && <div className="gg-prev">Preview: sample WAGO Origins are standing in until the collection mints.</div>}
      </div>
    </div>
  );
}
