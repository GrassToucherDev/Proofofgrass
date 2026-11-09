// GET /api/og?type=site|groves|profile&u=<username> — 1200×630 link-preview image (Open Graph / X card).
// Reads public data only (Profiles avatar + grass score, Streaks), so nothing private can leak and
// no free text is accepted, so nobody can mint a fake card under our domain.
import { ImageResponse } from "next/og";

export const config = { runtime: "edge" };

const SB = "https://fndhqtnsdqlyedpwecys.supabase.co";
const KEY = "sb_publishable_VtcdAaymV20dOd5Q39ZrfQ_VcNInpSF";
const GREEN = "#1f6b12", INK = "#0d2a05", CREAM = "#fdf6e2", GOLD = "#f6b93b";

async function rest(path) {
  try { const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }); return r.ok ? await r.json() : []; } catch { return []; }
}
// Same fonts as the site: Fredoka for headings/numbers, Nunito for labels (served from /public/fonts).
async function loadFonts(origin) {
  try {
    const [a, b] = await Promise.all([
      fetch(`${origin}/fonts/fredoka-latin-700-normal.woff`).then((r) => r.arrayBuffer()),
      fetch(`${origin}/fonts/nunito-latin-800-normal.woff`).then((r) => r.arrayBuffer()),
    ]);
    return [{ name: "Fredoka", data: a, weight: 700, style: "normal" }, { name: "Nunito", data: b, weight: 800, style: "normal" }];
  } catch { return undefined; }
}
const FRED = "Fredoka, Nunito, sans-serif", NUN = "Nunito, sans-serif";
const clean = (v) => String(v || "").replace(/@/g, "").toLowerCase().trim().replace(/[^a-z0-9_.-]/g, "").slice(0, 40);

function Frame({ children, origin }) {
  return (
    <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(180deg,#c5e3f7 0%,#e8f4fd 45%,#eef6e2 100%)", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, display: "flex", background: "linear-gradient(180deg,rgba(125,200,50,0) 0%,rgba(125,200,50,.45) 100%)" }} />
      <div style={{ width: 1080, height: 510, display: "flex", background: "#ffffff", border: `8px solid ${GREEN}`, borderRadius: 48, padding: 44, position: "relative" }}>
        {children}
      </div>
      <div style={{ position: "absolute", bottom: 14, display: "flex", fontFamily: NUN, fontSize: 24, fontWeight: 800, color: GREEN, letterSpacing: 3 }}>PROOFOFGRASS.APP</div>
    </div>
  );
}

function Chip({ value, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: CREAM, border: `5px solid ${GREEN}`, borderRadius: 28, padding: "14px 30px", marginRight: 18 }}>
      <div style={{ display: "flex", fontFamily: FRED, fontSize: 62, fontWeight: 700, color: INK }}>{value}</div>
      <div style={{ display: "flex", fontFamily: NUN, fontSize: 20, fontWeight: 800, color: "#2d5a1a", letterSpacing: 2 }}>{label}</div>
    </div>
  );
}

export default async function handler(req) {
  const url = new URL(req.url);
  const origin = url.origin;
  const type = url.searchParams.get("type") || "site";
  const u = clean(url.searchParams.get("u"));
  const logo = `${origin}/touchgrass-transparent.png`;

  let profile = null, streak = null;
  if (type === "profile" && u) {
    const [p, s] = await Promise.all([
      rest(`Profiles?select=avatar_url,grass_score&username=eq.${encodeURIComponent(u)}&limit=1`),
      rest(`Streaks?select=current_streak&username=eq.${encodeURIComponent(u)}&limit=1`),
    ]);
    profile = p[0] || null; streak = s[0] || null;
  }

  const build = (avatar) => {
    if (type === "profile" && u) {
      return (
        <Frame origin={origin}>
          <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
            <div style={{ display: "flex", width: 330, height: 330, borderRadius: 165, border: `12px solid ${GREEN}`, overflow: "hidden", background: "#e3f3d4", alignItems: "center", justifyContent: "center", marginRight: 48 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar || logo} width={avatar ? 330 : 200} height={avatar ? 330 : 200} style={{ objectFit: "cover" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", fontFamily: NUN, fontSize: 28, fontWeight: 800, color: "#2d5a1a", letterSpacing: 4 }}>PROOF OF GRASS</div>
              <div style={{ display: "flex", fontFamily: FRED, fontSize: u.length > 16 ? 62 : 82, fontWeight: 700, color: INK, marginTop: 6, marginBottom: 26 }}>@{u}</div>
              <div style={{ display: "flex" }}>
                {streak ? <Chip value={String(streak.current_streak ?? 0)} label="DAY STREAK" /> : null}
                {profile?.grass_score ? <Chip value={Number(profile.grass_score).toLocaleString("en-US")} label="GRASS SCORE" /> : null}
              </div>
            </div>
          </div>
        </Frame>
      );
    }
    if (type === "groves") {
      return (
        <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", background: "#c5e3f7" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${origin}/og-meadow.jpg`} width={1200} height={630} style={{ position: "absolute", left: 0, top: 0 }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex", background: "linear-gradient(180deg,rgba(197,227,247,.55) 0%,rgba(238,246,226,0) 55%)" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 56, width: 1040, height: 290, borderRadius: 120, border: `10px solid ${GREEN}`, position: "relative", overflow: "hidden",
            background: "linear-gradient(180deg,#6ec0f2 0%,#bfe6fa 70%,#8fd24a 100%)", boxShadow: "0 12px 30px rgba(26,74,10,.3)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${origin}/og-groves-logo.png`} width={720} height={240} />
          </div>
          <div style={{ display: "flex", marginTop: 34, alignItems: "center" }}>
            <div style={{ display: "flex", background: CREAM, border: `6px solid ${GREEN}`, borderRadius: 60, padding: "14px 30px", fontFamily: FRED, fontSize: 32, fontWeight: 700, color: INK, marginRight: 18 }}>Team up. Touch grass together.</div>
            <div style={{ display: "flex", background: GOLD, border: `6px solid ${GREEN}`, borderRadius: 60, padding: "14px 28px", fontFamily: FRED, fontSize: 32, fontWeight: 700, color: INK }}>Grove vs Grove</div>
          </div>
          <div style={{ position: "absolute", bottom: 14, display: "flex", fontFamily: NUN, fontSize: 24, fontWeight: 800, color: GREEN, letterSpacing: 3, background: "rgba(253,246,226,.85)", padding: "4px 20px", borderRadius: 20 }}>PROOFOFGRASS.APP</div>
        </div>
      );
    }
    // Site-wide preview: the shared "new style" (sunny sky, glass panel, logo + laurel title, cream/gold capsules).
    return (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative", background: "#c5e3f7" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${origin}/card/bg.jpg`} width={1200} height={900} style={{ position: "absolute", left: 0, top: -270 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${origin}/card/grass-l.png`} width={250} height={250} style={{ position: "absolute", left: -30, bottom: -50 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${origin}/card/grass-r.png`} width={250} height={250} style={{ position: "absolute", right: -30, bottom: -50 }} />
        <div style={{ position: "absolute", left: 60, top: 36, width: 1080, height: 548, display: "flex", alignItems: "center",
          background: "rgba(255,255,255,.9)", border: "4px solid rgba(255,255,255,.95)", borderRadius: 56, boxShadow: "0 14px 40px rgba(26,74,10,.25)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${origin}/brand/wago-wave.png`} width={437} height={446} style={{ marginLeft: 36, marginTop: 40 }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, marginLeft: 8, marginRight: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${origin}/touchgrass-logo-card.png`} width={420} height={192} />
            <div style={{ display: "flex", fontFamily: FRED, fontSize: 68, fontWeight: 700, color: INK, marginTop: 4 }}>PROOF OF GRASS</div>
            <div style={{ display: "flex", fontFamily: NUN, fontSize: 26, fontWeight: 800, color: GREEN, letterSpacing: 9, marginTop: 2 }}>TOUCH. PROVE. WIN.</div>
            <div style={{ display: "flex", background: "linear-gradient(180deg,#fffef6,#f6edcf)", border: `5px solid ${GREEN}`, borderRadius: 60, padding: "10px 26px", fontFamily: FRED, fontSize: 25, whiteSpace: "nowrap", fontWeight: 700, color: INK, marginTop: 22 }}>Go outside. Post proof. Build your streak.</div>
            <div style={{ display: "flex", background: GOLD, border: `5px solid ${GREEN}`, borderRadius: 60, padding: "8px 28px", fontFamily: FRED, fontSize: 29, fontWeight: 700, color: INK, marginTop: 14 }}>$TOUCHGRASS</div>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 8, left: 0, width: 1200, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: NUN, fontSize: 22, fontWeight: 800, color: GREEN, letterSpacing: 3, background: "rgba(253,246,226,.92)", padding: "3px 22px", borderRadius: 20 }}>PROOFOFGRASS.APP</div>
        </div>
      </div>
    );
  };

  const fonts = await loadFonts(origin);
  const opts = { width: 1200, height: 630, ...(fonts ? { fonts } : {}), headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } };
  try {
    return new ImageResponse(build(profile?.avatar_url || null), opts);
  } catch {
    // avatar couldn't be decoded (unsupported format etc.) -> same card with the logo instead
    return new ImageResponse(build(null), opts);
  }
}
