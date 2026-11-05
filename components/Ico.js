// components/Ico.js — 3D icon set. Accepts an icon name or the emoji it replaces.
// Unknown values fall back to rendering the text as-is.
const NAMES = new Set(["camera","lock","share","check","flame","shield","trophy","sprout","bolt",
  "home","profile","more","medal1","medal2","medal3","crown","sparkle","calendar","pin"]);
const EMOJI = {
  "🏠":"home","👤":"profile","🥇":"medal1","🥈":"medal2","🥉":"medal3","👑":"crown",
  "✦":"sparkle","✨":"sparkle","📅":"calendar","📍":"pin","🔥":"flame","🏆":"trophy",
  "🛡":"shield","🛡️":"shield","🔒":"lock","📸":"camera","⚡":"bolt","🌱":"sprout",
};

export default function Ico({ n, size = 24, style }) {
  const name = NAMES.has(n) ? n : EMOJI[n];
  if (!name) return <span style={{ fontSize: size * 0.8, lineHeight: 1, ...style }}>{n}</span>;
  const w = name === "more" ? size * 2.4 : size;
  const h = name === "more" ? size * 0.8 : size;
  return <img src={`/icons3d/${name}.webp`} alt="" width={w} height={h}
    style={{ width: w, height: h, objectFit: "contain", display: "block", margin: "0 auto", ...style }} />;
}
