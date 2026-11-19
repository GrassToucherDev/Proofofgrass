// components/GroveGarden.js — a passive pixel garden for a grove. Nothing to play: every member who has
// locked in today has their WAGO out working the yard (fishing, watering, picking apples...), members who
// haven't are napping. The garden itself grows with the grove's running streak.
// Members without an Origin get the animated plain WAGO. `previewOrigins` swaps in sample WAGO Origins (?garden=origins).
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { V2 } from "../utils/v2Theme";
import Ico from "./Ico";

// ---- Garden stage from the grove streak (days) ----
const STAGES = [
  { min: 0,  name: "Fresh Soil",  note: "Lock in together to plant the first seeds." },
  { min: 3,  name: "Seedlings",   note: "The first sprouts are up." },
  { min: 7,  name: "Leafy",       note: "The beds are filling out and the yard is getting furnished." },
  { min: 14, name: "In Bloom",    note: "Flowers are opening across the yard." },
  { min: 30, name: "Full Garden", note: "A thriving garden, kept alive by the whole grove." },
];
export const gardenStage = (days) => { let s = 0; STAGES.forEach((st, i) => { if (days >= st.min) s = i; }); return s; };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// ---- Scene geometry: everything is in the 1586 x 992 space of the ground art, placed as percentages ----
const W = 1586, H = 992;
const SC = "/garden/scene/";
const pw = (n) => `${((n / W) * 100).toFixed(3)}%`;
const ph = (n) => `${((n / H) * 100).toFixed(3)}%`;

// Props: anchor = bottom centre, native sprite size x scale. `from` = garden stage at which it appears.
const FIXED = [
  { k: "pond",      x: 420,  y: 590, w: 728, sc: .42, from: 0 },
  { k: "bench",     x: 1150, y: 345, w: 422, sc: .62, from: 0 },
  { k: "stump",     x: 930,  y: 580, w: 297, sc: .42, from: 0 },
  { k: "mushrooms", x: 1200, y: 600, w: 259, sc: .42, from: 0 },
  { k: "lantern",   x: 590,  y: 800, w: 206, sc: .30, from: 0, glow: 2 },
  { k: "sign",      x: 395,  y: 800, w: 280, sc: .66, from: 0, sign: true },
  { k: "pots",      x: 245,  y: 745, w: 282, sc: .38, from: 1 },
  { k: "wheelbarrow", x: 1130, y: 885, w: 321, sc: .36, from: 1 },
  { k: "birdbath",  x: 270,  y: 440, w: 201, sc: .34, from: 2 },
  { k: "beehive",   x: 640,  y: 385, w: 291, sc: .40, from: 2, bob: true },
  { k: "picnic",    x: 1040, y: 690, w: 390, sc: .40, from: 3 },
  { k: "lights",    x: 950,  y: 240, w: 384, sc: .45, from: 3, glow: 3 },
  { k: "shed",      x: 450,  y: 335, w: 322, sc: .50, from: 4 },
  { k: "scarecrow", x: 1440, y: 350, w: 248, sc: .50, from: 4 },
];
const BEDS = [
  { color: "yellow", x: 1330, y: 500, w: 330, sc: .52 },
  { color: "blue",   x: 1110, y: 760, w: 330, sc: .52 },
  { color: "red",    x: 800,  y: 850, w: 330, sc: .52 },
];
const DESK = { x: 705, y: 650, w: 170 };   // sprite is 400x408
const TREE = { x: 780, y: 330, w: 480, sc: .56 };
const treeScale = (s) => (s >= 2 ? 1 : .88);   // the bare tree is taller than the leafy one
const bedStages = (s) => [clamp(s, 0, 3), clamp(s - 1, 0, 3), s >= 4 ? 3 : clamp(s - 2, 0, 3)];
const treeSrc = (s) => (s >= 4 ? "tree-2" : s >= 2 ? "tree-1" : "tree-0");

// Where WAGOs work (feet position, which way they face, which pose, what an Origin holds) ...
const WORK = [
  { x: 585,  y: 612, face: -1, act: "fish",  pose: "fish",   prop: "rod",    job: "Fishing at the pond" },
  { x: 1285, y: 585, face: 1,  act: "water", pose: "water",  prop: "can",    job: "Watering the flowers" },
  { x: 1055, y: 835, face: 1,  act: "water", pose: "water",  prop: "can",    job: "Watering the flowers" },
  { x: 760,  y: 360, face: 1,  act: "pick",  pose: "reach",  prop: "basket", job: "Picking apples" },
  { x: 1165, y: 660, face: -1, act: "bob",   pose: "crouch", prop: "basket", job: "Foraging mushrooms" },
  { x: 735,  y: 915, face: 1,  act: "water", pose: "water",  prop: "can",    job: "Watering the flowers" },
  { x: 330,  y: 850, face: 1,  act: "bob",   pose: "idle",   prop: null,     job: "Strolling the path" },
  { x: 300,  y: 650, face: 1,  act: "fish",  pose: "fish",   prop: "rod",    job: "Fishing at the pond" },
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

// ---- Characters ----
// Plain WAGO: pixel pose sheet (native pixel sizes). Origins: one static pixelated pose each.
const POSE = {
  walk0: [38, 57], walk1: [35, 58], walk2: [38, 57], walk3: [34, 57],
  idle0: [35, 56], idle1: [35, 58], sleep: [35, 46], sit: [37, 58],
  fish: [48, 58], water: [53, 57], reach: [41, 59], crouch: [42, 50],
};
const WALK = ["walk0", "walk1", "walk2", "walk3"];
const IDLE = ["idle0", "idle1"];
const PXW = 2.55;            // on-screen size of one WAGO-pose pixel, in scene units
const BOX_W = 58, BOX_H = 59; // the cell every pose is centred in
const ORIGIN_H = { 980: 35, 583: 40, 970: 37, 376: 37, 845: 39, 269: 39, 224: 38, 248: 38, 142: 37, 606: 32 };
const PXO = 3.7;             // on-screen size of one Origin pixel
const SAMPLE_IDS = [980, 583, 970, 376, 845, 269, 224, 248, 142, 606];
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const STEP_MS = 7000, WALK_MS = 3300;

// Frame stack: a few images shown in turn (walk cycle, idle breathing).
function Frames({ names, dur }) {
  return names.map((n, i) => (
    <img key={n} className="gg-fr" src={`/garden/poses/${n}.png`} alt=""
      style={{ height: `${(POSE[n][1] / BOX_H) * 100}%`, animationDuration: `${dur}s`, animationDelay: `${(dur / names.length) * i}s` }} />
  ));
}

export default function GroveGarden({ members = [], streakDays = 0, slots = 6, groveName = "", previewOrigins = false, forceDesk = false, onOpen = null, bannerUrl = "", onGift = null, me = "", children = null }) {
  const [sel, setSel] = useState("");
  const hasDesk = forceDesk || members.some((m) => m.has_screen_toucher);
  const [step, setStep] = useState(0);
  const [walking, setWalking] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    let reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
    setStill(reduce);
    if (reduce) return undefined;
    let tw;
    const t = setInterval(() => {
      setStep((n) => n + 1); setWalking(true);
      clearTimeout(tw); tw = setTimeout(() => setWalking(false), WALK_MS);
    }, STEP_MS);
    return () => { clearInterval(t); clearTimeout(tw); };
  }, []);

  const stage = gardenStage(streakDays);
  const st = STAGES[stage];
  const next = STAGES[stage + 1];
  const beds = bedStages(stage);
  const plots = members.slice(0, Math.max(slots, 1));
  const seed = plots.length ? hash(plots[0].username) : 0;

  // Where is each member this step (and last step, so we know which way they walk)?
  const cast = useMemo(() => {
    let workIdx = 0, napIdx = 0;
    const base = plots.map((m, idx) => {
      const on = !!m.locked_today;
      const sampleId = previewOrigins ? SAMPLE_IDS[(seed + idx) % SAMPLE_IDS.length] : null;
      return { m, idx, on, sampleId, wi: on ? workIdx++ : -1, ni: on ? -1 : napIdx++ };
    });
    const spotAt = (c, s) => (c.on
      ? { ...WORK[(c.wi + (still ? 0 : s)) % WORK.length], z: 0 }
      : { ...NAP[c.ni % NAP.length], act: "nap", pose: "sleep", prop: null, face: 1 });
    return base.map((c) => ({ ...c, spot: spotAt(c, step), prev: step > 0 ? spotAt(c, step - 1) : null }));
  }, [plots, step, still, previewOrigins, seed]);

  const done = plots.filter((m) => m.locked_today).length;
  if (!plots.length) return null;
  const cname = (groveName || "").trim();
  const tapAttrs = (u) => (onOpen ? { role: "button", tabIndex: 0, "aria-label": `@${u}`, onClick: () => setSel((x) => (x === u ? "" : u)), onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel((x) => (x === u ? "" : u)); } } } : {});
  const selCast = cast.find((c) => c.m.username === sel);
  return (
    <div className="gv-card gg-card" id="gv-garden">
      <style dangerouslySetInnerHTML={{ __html: `
        .gg-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}
        .gg-title{font-size:18px;font-weight:900;color:${V2.forestGreen};display:flex;align-items:center;gap:8px;margin:0}
        .gg-chip{font-size:12px;font-weight:800;color:${V2.forestGreen};background:#e3f5d6;padding:4px 10px;border-radius:999px}
        .gg-scene{position:relative;isolation:isolate;width:100%;aspect-ratio:${W}/${H};border-radius:16px;overflow:hidden;border:1px solid ${V2.borderSoft};container-type:inline-size;
          background:#6a9a3c url(${SC}ground.webp) center/100% 100% no-repeat;image-rendering:pixelated}
        .gg-scene img{image-rendering:pixelated;display:block;max-width:none}
        .gg-it{position:absolute;transform:translate(-50%,-100%);pointer-events:none}
        .gg-it>img{width:100%;height:auto}
        .gg-tap{pointer-events:auto!important;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .gg-tap:focus-visible{outline:2px solid #fff;outline-offset:2px}
        .gg-nav{position:absolute;left:50%;transform:translateX(-50%);width:min(calc(100% - 16px),340px);bottom:6px;z-index:2000}
        .gg-nav .gv-bar{margin:0;background:rgba(255,255,255,.9);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.7);box-shadow:0 2px 8px rgba(0,0,0,.18);padding:3px}
        .gg-nav .gv-bar-b{padding:3px 2px;gap:1px}
        .gg-nav .gv-bar-b img{width:26px;height:26px;object-fit:contain}
        .gg-nav .gv-bar-b span{display:none}
        @container (min-width: 520px){.gg-nav .gv-bar-b span{display:block}}
        .gg-tip{margin:10px 0 0;font-size:12px;color:#5b6b50}
        .gg-pop{margin-top:12px;border:1px solid ${V2.borderGreen};background:#f4fbec;border-radius:14px;padding:12px 14px}
        .gg-pop-h{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;position:relative;padding-right:28px}
        .gg-pop-h b{color:${V2.forestGreen};font-size:15px}
        .gg-pop-h span{font-size:13px;color:${V2.textMuted}}
        .gg-pop-x{position:absolute;right:0;top:-4px;border:0;background:none;font-size:22px;line-height:1;color:${V2.textMuted};cursor:pointer;padding:4px 6px}
        .gg-pop-a{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .gg-pop-b{padding:8px 14px;border-radius:999px;border:1.5px solid ${V2.borderSoft};background:#fff;color:${V2.forestGreen};font-weight:800;font-size:13px;cursor:pointer;text-decoration:none;font-family:inherit}
        .gg-desk{position:absolute;transform:translate(-50%,-100%);aspect-ratio:400/408}
        .gg-desk img{position:absolute;inset:0;width:100%;height:100%}
        .gg-desk-a{animation:gg-chartA 9s steps(1,end) infinite}
        .gg-desk-b{opacity:0;animation:gg-chartB 9s steps(1,end) infinite}
        @keyframes gg-chartA{0%{opacity:1}22%{opacity:0}30%{opacity:1}52%{opacity:0}60%{opacity:1}70%{opacity:0}78%{opacity:1}}
        @keyframes gg-chartB{0%{opacity:0}22%{opacity:1}30%{opacity:0}52%{opacity:1}60%{opacity:0}70%{opacity:1}78%{opacity:0}}
        .gg-wago{position:absolute;pointer-events:none;transform:translate(-50%,-100%) scale(var(--gs,1));transform-origin:50% 100%;transition:left 3.2s ease-in-out,top 3.2s ease-in-out}
        .gg-wago.still{transition:none}
        .gg-flip{position:absolute;inset:0}
        .gg-body{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:auto;transform-origin:50% 100%}
        .gg-fr{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:auto;opacity:0;animation:gg-frame 1s steps(1,end) infinite}
        .gg-fr.solo{opacity:1;animation:none}
        .gg-origin.gg-walk .gg-body{animation:gg-walk .5s steps(2,end) infinite}
        .gg-origin.gg-act-water .gg-body,.gg-origin.gg-act-pick .gg-body{animation:gg-pick 2.2s ease-in-out infinite}
        .gg-origin.gg-act-fish .gg-body{animation:gg-sway 3s ease-in-out infinite}
        .gg-origin.gg-act-bob .gg-body{animation:gg-bob 1.6s ease-in-out infinite}
        .gg-origin.gg-act-nap .gg-body{animation:gg-nap 3.6s ease-in-out infinite;filter:brightness(.92) saturate(.85)}
        .gg-nappose .gg-fr{animation:gg-nap 3.6s ease-in-out infinite;opacity:1;filter:brightness(.94)}
        .gg-prop{position:absolute;bottom:18%}
        .gg-prop img{width:100%;height:auto}
        .gg-origin.gg-act-water .gg-prop{animation:gg-tilt 2.2s ease-in-out infinite;transform-origin:30% 70%}
        .gg-origin.gg-act-fish .gg-prop{animation:gg-rod 3s ease-in-out infinite;transform-origin:15% 90%}
        .gg-origin.gg-act-pick .gg-prop,.gg-origin.gg-act-bob .gg-prop{animation:gg-bob 1.6s ease-in-out infinite}
        .gg-name{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:2px;white-space:nowrap;
          font-size:clamp(8px,1.5vw,11px);font-weight:800;color:#fff;background:rgba(20,40,20,.72);padding:1px 6px;border-radius:999px;
          max-width:11ch;overflow:hidden;text-overflow:ellipsis}
        .gg-zzz{position:absolute;left:62%;bottom:78%;font-weight:900;font-size:clamp(9px,1.9vw,15px);color:#e9f4ff;text-shadow:0 1px 0 #1d2c3f,1px 0 0 #1d2c3f,-1px 0 0 #1d2c3f;letter-spacing:1px;animation:gg-zzz 3s ease-in-out infinite}
        .gg-fly{position:absolute;pointer-events:none;animation:gg-fly 4.5s ease-in-out infinite}
        .gg-fly img{width:100%;height:auto}
        .gg-bfly{position:absolute;pointer-events:none;z-index:900;animation:gg-flutter 17s linear infinite}
        .gg-bfly img{width:100%;height:auto;animation:gg-flap .5s steps(2,end) infinite}
        .gg-glow{animation:gg-glow 3.2s ease-in-out infinite}
        .gg-hive{animation:gg-bob 2.4s ease-in-out infinite}
        .gg-sign-t{position:absolute;left:14%;right:14%;top:14%;height:46%;display:flex;flex-direction:column;align-items:center;justify-content:center;
          color:#5a3a1d;font-weight:900;text-align:center;line-height:1.1;overflow:hidden}
        .gg-sign-t b{font-size:.95cqw;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gg-sign-t i{font-style:normal;font-size:.8cqw;opacity:.85;margin-top:1px}
        @container (max-width: 560px){.gg-sign-t{display:none}.gg-wago{--gs:1.4}.gg-name{font-size:calc(clamp(8px,1.5vw,11px)/1.4)}}
        .gg-legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 12px;margin-top:12px}
        .gg-li{display:flex;align-items:baseline;gap:6px;min-width:0;font-size:12.5px;color:${V2.textMuted}}
        .gg-li b{color:${V2.forestGreen};max-width:11ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gg-li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gg-foot{margin-top:12px;font-size:13px;color:${V2.textMuted};line-height:1.45}
        .gg-foot b{color:${V2.forestGreen}}
        .gg-prev{margin-top:8px;font-size:12px;color:${V2.textMuted}}
        @keyframes gg-frame{0%,24.999%{opacity:1}25%,100%{opacity:0}}
        @keyframes gg-walk{0%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-3.5%)}100%{transform:translateX(-50%) translateY(0)}}
        @keyframes gg-bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-2.5%)}}
        @keyframes gg-sway{0%,100%{transform:translateX(-50%) rotate(-1.5deg)}50%{transform:translateX(-50%) rotate(1.5deg)}}
        @keyframes gg-pick{0%,100%{transform:translateX(-50%) scaleY(1)}40%{transform:translateX(-50%) scaleY(1.05) translateY(-1%)}70%{transform:translateX(-50%) scaleY(.96)}}
        @keyframes gg-nap{0%,100%{transform:translateX(-50%) scaleY(1)}50%{transform:translateX(-50%) scaleY(.96)}}
        @keyframes gg-tilt{0%,35%,100%{transform:rotate(0)}55%,80%{transform:rotate(-28deg)}}
        @keyframes gg-rod{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
        @keyframes gg-zzz{0%,100%{opacity:.25;transform:translateY(3px)}50%{opacity:1;transform:translateY(-4px)}}
        @keyframes gg-fly{0%,100%{opacity:.15;transform:translate(0,0)}50%{opacity:1;transform:translate(6px,-8px)}}
        @keyframes gg-flutter{0%{left:6%;top:52%}20%{left:30%;top:36%}40%{left:55%;top:48%}60%{left:78%;top:30%}80%{left:50%;top:62%}100%{left:6%;top:52%}}
        @keyframes gg-flap{0%{transform:scaleY(1)}100%{transform:scaleY(.62)}}
        @keyframes gg-glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35) drop-shadow(0 0 6px #ffd45a)}}
        @media (prefers-reduced-motion:reduce){.gg-desk img,.gg-wago *,.gg-zzz,.gg-fly,.gg-bfly,.gg-bfly img,.gg-glow,.gg-hive{animation:none!important;transition:none!important}
          .gg-fr{opacity:0!important}.gg-fr:first-child{opacity:1!important}}
      ` }} />
      <div className="gg-head">
        <h3 className="gg-title"><Ico n="sprout" size={24} /> Grove Garden</h3>
        <span className="gg-chip">{st.name} – {streakDays} day streak</span>
      </div>

      <div className="gg-scene" role="img" aria-label={`Grove garden, ${st.name}. ${done} of ${plots.length} WAGOs at work.`}>
        {/* the yard (z = ground line, so WAGOs walk in front of / behind things) */}
        {BEDS.map((b, i) => (
          <div className="gg-it" key={b.color} style={{ left: pw(b.x), top: ph(b.y), width: pw(b.w * b.sc), zIndex: b.y }}>
            <img src={`${SC}bed-${b.color}-${beds[i]}.webp`} alt="" />
          </div>
        ))}
        <div className="gg-it" style={{ left: pw(TREE.x), top: ph(TREE.y), width: pw(TREE.w * TREE.sc * treeScale(stage)), zIndex: TREE.y }}><img src={`${SC}${treeSrc(stage)}.webp`} alt="" /></div>
        {FIXED.filter((p) => stage >= p.from).map((p) => (
          <div className={`gg-it${p.glow && stage >= p.glow ? " gg-glow" : ""}${p.bob ? " gg-hive" : ""}`} key={p.k}
            style={{ left: pw(p.x), top: ph(p.y), width: pw(p.w * p.sc), zIndex: p.k === "pond" ? 1 : p.y }}>
            <img src={`${SC}${p.k}.webp`} alt="" />
            {p.sign && cname && <span className="gg-sign-t"><b>{cname}</b><i>Day {streakDays}</i></span>}
          </div>
        ))}

        {/* Screen Toucher holder perk: a desk whose monitor flips between a green and a red chart */}
        {hasDesk && (
          <div className="gg-it gg-desk" title="Screen Toucher desk" style={{ left: pw(DESK.x), top: ph(DESK.y), width: pw(DESK.w), zIndex: DESK.y }}>
            <img className="gg-desk-a" src={`${SC}desk-up.png`} alt="" />
            <img className="gg-desk-b" src={`${SC}desk-down.png`} alt="" />
          </div>
        )}

        {/* ambient life */}
        {[[300, 300], [560, 480], [900, 420], [1000, 640], [1400, 300], [650, 760]].map(([x, y], i) => (
          <div className="gg-fly" key={i} style={{ left: pw(x), top: ph(y), width: pw(26), zIndex: 800, animationDelay: `${i * 0.9}s` }}><img src={`${SC}sparkle.webp`} alt="" /></div>
        ))}
        {stage >= 3 && <div className="gg-bfly" style={{ width: pw(54) }}><img src={`${SC}butterfly.webp`} alt="" /></div>}

        {/* the WAGOs */}
        {cast.map(({ m, on, sampleId, spot, prev }) => {
          const moving = !still && walking && on && prev && (prev.x !== spot.x || prev.y !== spot.y);
          const dir = moving ? Math.sign(spot.x - prev.x) || 1 : spot.face || 1;
          const z = spot.z || Math.round(spot.y);
          if (sampleId) {
            const h = ORIGIN_H[sampleId] * PXO;
            return (
              <div key={m.username} className={`gg-wago gg-origin gg-act-${spot.act}${moving ? " gg-walk" : ""}${still ? " still" : ""}${onOpen ? " gg-tap" : ""}`} {...tapAttrs(m.username)}
                style={{ left: pw(spot.x), top: ph(spot.y), height: ph(h), width: pw(h * 0.9), zIndex: z }}>
                <div className="gg-flip" style={{ transform: `scaleX(${dir})` }}>
                  <img className="gg-body" style={{ height: "100%" }} src={`/garden/pix/origin-${sampleId}.png`} alt="" />
                  {spot.prop && !moving && <span className="gg-prop" style={{ left: "62%", width: spot.prop === "rod" ? "70%" : "46%" }}><img src={`${SC}${spot.prop}.webp`} alt="" /></span>}
      </div>
                {!on && <span className="gg-zzz">Zzz</span>}
                <span className="gg-name">@{m.username}</span>
              </div>
            );
          }
          // plain WAGO: real pose art
          const napping = !on;
          const frames = moving ? WALK : spot.pose === "idle" ? IDLE : [spot.pose];
          const dur = moving ? 0.6 : 1.8;
          return (
            <div key={m.username} className={`gg-wago${still ? " still" : ""}${napping ? " gg-nappose" : ""}${onOpen ? " gg-tap" : ""}`} {...tapAttrs(m.username)}
              style={{ left: pw(spot.x), top: ph(spot.y), height: ph(BOX_H * PXW), width: pw(BOX_W * PXW), zIndex: z }}>
              <div className="gg-flip" style={{ transform: `scaleX(${dir})` }}>
                {frames.length === 1
                  ? <img className="gg-fr solo" src={`/garden/poses/${frames[0]}.png`} alt="" style={{ height: `${(POSE[frames[0]][1] / BOX_H) * 100}%` }} />
                  : <Frames names={frames} dur={dur} />}
              </div>
              {napping && <span className="gg-zzz">Zzz</span>}
              <span className="gg-name">@{m.username}</span>
            </div>
          );
        })}
        {children && <div className="gg-nav">{children}</div>}
      </div>

      {onOpen && !selCast && <p className="gg-tip">Tap a WAGO to see what they are up to.</p>}
      {onOpen && selCast && (
        <div className="gg-pop" role="dialog" aria-label={`@${selCast.m.username}`}>
          <div className="gg-pop-h">
            <b>@{selCast.m.username}</b>
            <span>{selCast.on ? "Locked in today" : "Not locked in yet"} · {selCast.spot.job}</span>
            <button className="gg-pop-x" aria-label="Close" onClick={() => setSel("")}>×</button>
          </div>
          <div className="gg-pop-a">
            <Link href={`/u/${selCast.m.username}`} className="gg-pop-b">View profile</Link>
            {onGift && selCast.m.username !== me && <button className="gg-pop-b" onClick={() => { onGift(selCast.m.username); setSel(""); }}>Gift a shield</button>}
          </div>
        </div>
      )}

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
