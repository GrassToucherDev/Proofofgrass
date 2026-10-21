// Grove banner helpers shared by the Groves page, Marketplace and the share card.
// Production art lives at /public/grove-banners/<file>.webp (see docs/grove-banner-art-spec.md). Until a file
// exists, a clearly-labelled development fallback (generated SVG scene) is shown instead — never a broken image.

export const BANNER_W = 1600, BANNER_H = 560;   // 20:7. Keep names/avatars/stats OUT of the art.

const SCENES = {
  default:         { sky: ["#bfe3f7", "#e6f6e0"], ground: ["#7dc832", "#4f9a1c"], accent: "#fff6c9", kind: "meadow" },
  campfire_crew:   { sky: ["#0d1b3d", "#2b2a55"], ground: ["#1f4a1a", "#0f2a0d"], accent: "#ffb347", kind: "campfire" },
  trailblazers:    { sky: ["#f7b267", "#f4e3b1"], ground: ["#3f6b3a", "#26432a"], accent: "#fff1b8", kind: "mountain" },
  rooted_together: { sky: ["#b9e3b0", "#e9f7d6"], ground: ["#2f7d32", "#1b4d1f"], accent: "#fffbd0", kind: "woodland" },
};
const fallbackScene = SCENES.default;

function tree(x, y, s, c) { return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="0" width="12" height="46" fill="#4a2f1b"/><path d="M0 -90 L46 8 L-46 8Z" fill="${c}"/><path d="M0 -60 L56 38 L-56 38Z" fill="${c}" opacity=".92"/></g>`; }

// A development-only illustration for a banner id. Calm on the LEFT (name/stats area), focal object on the RIGHT.
export function bannerFallbackSvg(id) {
  const sc = SCENES[id] || fallbackScene;
  const hills = `<path d="M0 420 C260 360 420 440 700 400 C980 360 1240 450 1600 390 L1600 560 L0 560Z" fill="${sc.ground[0]}"/><path d="M0 480 C300 430 560 510 860 470 C1160 430 1380 500 1600 470 L1600 560 L0 560Z" fill="${sc.ground[1]}"/>`;
  let extra = "", post = "";
  if (sc.kind === "campfire") {
    extra = `<circle cx="1330" cy="110" r="46" fill="#fff4c2"/><circle cx="1352" cy="98" r="40" fill="${sc.sky[0]}"/>` +
      Array.from({ length: 28 }, (_, i) => `<circle cx="${(i * 137) % 1600}" cy="${(i * 53) % 260}" r="${1 + (i % 3) * 0.7}" fill="#fff" opacity=".7"/>`).join("") +
      tree(1020, 400, 1.3, "#1d5a22") + tree(1500, 410, 1.6, "#194d1d") + tree(180, 430, 1.1, "#1d5a22") +
      "";
    post = `<circle cx="1310" cy="440" r="140" fill="${sc.accent}" opacity=".14"/><path d="M1280 470 Q1310 400 1338 470Z" fill="#ff7a1a"/><path d="M1298 470 Q1320 420 1338 470Z" fill="#ffd34d"/><rect x="1250" y="468" width="120" height="14" rx="7" fill="#5a3a1f"/>`;
  } else if (sc.kind === "mountain") {
    extra = `<circle cx="1180" cy="230" r="70" fill="${sc.accent}"/><path d="M700 430 L1000 190 L1180 330 L1330 150 L1600 430Z" fill="#7a8fb0"/><path d="M1330 150 L1400 230 L1350 220 L1320 260 L1290 215 L1260 225Z" fill="#fff" opacity=".9"/>` +
      `<path d="M1000 560 C1060 480 1120 470 1160 430 C1200 470 1260 480 1300 560Z" fill="#c8a36a" opacity=".9"/>` + tree(1450, 430, 1.1, "#1f5a2a") + tree(1530, 440, 0.9, "#1b4d24");
  } else if (sc.kind === "woodland") {
    extra = `<ellipse cx="1240" cy="330" rx="200" ry="150" fill="${sc.accent}" opacity=".5"/>` + tree(900, 420, 1.5, "#2a7a32") + tree(1060, 430, 1.1, "#2f8a36") + tree(1420, 410, 1.7, "#1f6a28") + tree(1550, 440, 1.1, "#2a7a32") + tree(120, 440, 1.2, "#2a7a32") +
      Array.from({ length: 10 }, (_, i) => `<circle cx="${1100 + i * 48}" cy="${470 + (i % 3) * 12}" r="6" fill="${i % 2 ? "#fff" : "#ffd34d"}"/>`).join("");
  } else {
    extra = `<circle cx="1360" cy="130" r="64" fill="${sc.accent}"/><ellipse cx="1000" cy="130" rx="120" ry="34" fill="#fff" opacity=".85"/><ellipse cx="1090" cy="112" rx="80" ry="30" fill="#fff" opacity=".85"/>` + tree(1250, 420, 1.5, "#3f9a2a") + tree(1500, 430, 1.2, "#3f9a2a") +
      Array.from({ length: 12 }, (_, i) => `<circle cx="${700 + i * 70}" cy="${505 + (i % 3) * 10}" r="6" fill="${i % 2 ? "#fff" : "#ffd34d"}"/>`).join("");
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BANNER_W} ${BANNER_H}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc.sky[0]}"/><stop offset="1" stop-color="${sc.sky[1]}"/></linearGradient></defs><rect width="${BANNER_W}" height="${BANNER_H}" fill="url(#s)"/>${extra}${hills}${post}</svg>`;
}
export const bannerFallbackUrl = (id) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(bannerFallbackSvg(id));

// Where to load a banner from first. (null art_path → straight to the fallback.)
export const bannerSrc = (b) => (b && b.art_path) || bannerFallbackUrl(b?.id || "default");

// Which Marketplace item id a banner ledger row uses (matches /api/groves/banners/verify).
export const bannerItemId = (id) => `grove_banner_${id}`;

export const BANNER_PURCHASE_NOTICE = "This banner unlocks for your Grove. It stays with the Grove if you leave and cannot be transferred to another Grove.";
export const BANNER_PERMISSION_NOTE = "Any member can unlock a banner for the Grove. Only the owner can set the active banner.";
