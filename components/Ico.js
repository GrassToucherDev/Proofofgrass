// components/Ico.js — 3D icon set. Accepts an icon name or the emoji it replaces.
// Unknown values fall back to rendering the text as-is.
const NAMES = new Set(["camera","lock","share","check","flame","shield","trophy","sprout","bolt",
  "home","profile","more","medal1","medal2","medal3","crown","sparkle","calendar","pin",
  "clock","handshake","glove","hourglass","sunrise","confetti","clover","tree","wheat","gem","ticket","gift",
  "palette","magnifier","book","backpack","box","megaphone","headphones","coin"]);
const EMOJI = {
  "🏠":"home","👤":"profile","🥇":"medal1","🥈":"medal2","🥉":"medal3","👑":"crown",
  "✦":"sparkle","✨":"sparkle","📅":"calendar","📍":"pin","🔥":"flame","🏆":"trophy",
  "🛡":"shield","🛡️":"shield","🔒":"lock","📸":"camera","⚡":"bolt","🌱":"sprout",
  "⏰":"clock","🕐":"clock","⏳":"hourglass","🤝":"handshake","🥊":"glove","🌅":"sunrise","🎉":"confetti",
  "🍀":"clover","🌳":"tree","🌾":"wheat","💎":"gem","🎟️":"ticket","🎁":"gift","🎨":"palette","🔍":"magnifier",
  "📖":"book","🎒":"backpack","📦":"box","📣":"megaphone","🎧":"headphones","🪙":"coin","💰":"coin",
};

export default function Ico({ n, size = 24, style, inline }) {
  const name = NAMES.has(n) ? n : EMOJI[n];
  if (!name) return <span style={{ fontSize: size * 0.8, lineHeight: 1, ...style }}>{n}</span>;
  const w = name === "more" ? size * 2.4 : size;
  const h = name === "more" ? size * 0.8 : size;
  const layout = inline ? { display: "inline-block", verticalAlign: "-0.2em", margin: "0 0.3em 0 0" } : { display: "block", margin: "0 auto" };
  return <img src={`/icons3d/${name}.webp`} alt="" width={w} height={h}
    style={{ width: w, height: h, objectFit: "contain", ...layout, ...style }} />;
}
