// /create/community — gallery of finished memes and PFPs posted by players.
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import Ico from "../../components/Ico";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b", red:"#e05252",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.3)",
};
const getUsername = () => { try { const s = localStorage.getItem("pog_username"); return s ? s.replace(/@/g, "").toLowerCase().trim() : ""; } catch { return ""; } };
const ago = (iso) => { const m = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000)); return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; };

export default function CommunityCreations() {
  const [me, setMe] = useState("");
  const [sort, setSort] = useState("new");
  const [kind, setKind] = useState("");
  const [mine, setMine] = useState(false);
  const [items, setItems] = useState(null);
  const [next, setNext] = useState(null);
  const [theme, setTheme] = useState(null);
  const [minStreak, setMinStreak] = useState(7);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMe(getUsername()); }, []);

  const load = useCallback(async (before) => {
    setBusy(true);
    try {
      const qs = new URLSearchParams({ sort, ...(kind ? { kind } : {}), ...(mine ? { mine: "1" } : {}), ...(me ? { as: me } : {}), ...(before ? { before } : {}) });
      const r = await fetch(`/api/create/community?${qs}`, { cache: "no-store" });
      const j = await r.json();
      if (j.theme) setTheme(j.theme);
      if (j.minStreak) setMinStreak(j.minStreak);
      setPending(!!j.needsSql);
      setItems((prev) => (before && prev ? [...prev, ...(j.items || [])] : j.items || []));
      setNext(j.next || null);
    } catch { setItems((p) => p || []); setNote("Could not load creations."); }
    setBusy(false);
  }, [sort, kind, mine, me]);
  useEffect(() => { load(); }, [load]);

  const act = async (path, body) => {
    const r = await fetch(`/api/create/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: me, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.code === "not_signed_in" || j.code === "unclaimed" ? "Secure your username with Google on the dashboard to do that." : j.error || "Something went wrong.");
    return j;
  };
  const guard = () => { if (!me) { setNote("Enter your username on the dashboard first."); return false; } return true; };
  const like = async (it) => {
    if (!guard()) return;
    setNote("");
    const on = !it.liked;
    setItems((l) => l.map((x) => (x.id === it.id ? { ...x, liked: on, likes: x.likes + (on ? 1 : -1) } : x)));
    try { const j = await act("like", { id: it.id, on }); setItems((l) => l.map((x) => (x.id === it.id ? { ...x, likes: j.likes } : x))); }
    catch (e) { setItems((l) => l.map((x) => (x.id === it.id ? { ...x, liked: !on, likes: x.likes + (on ? -1 : 1) } : x))); setNote(e.message); }
  };
  const report = async (it) => {
    if (!guard()) return;
    try { await act("report", { id: it.id }); setNote("Thanks, we'll take a look."); } catch (e) { setNote(e.message); }
  };
  const del = async (it) => {
    if (!window.confirm("Delete this creation? This can't be undone.")) return;
    try { await act("delete", { id: it.id }); setItems((l) => l.filter((x) => x.id !== it.id)); } catch (e) { setNote(e.message); }
  };
  const shareX = (it) => {
    const text = `${it.caption ? it.caption + "\n\n" : ""}Made by @${it.username} on Touch Grass\n\n$TOUCHGRASS #TouchGrass #ProofOfGrass\nhttps://proofofgrass.app/create/community`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const pill = (on) => ({ background: on ? "rgba(147,168,90,0.14)" : "transparent", color: on ? T.olive : T.muted, border: `1px solid ${on ? T.borderG : T.border}`, borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Nunito,sans-serif" });
  const small = { background: "transparent", border: "none", color: T.dim, fontSize: 12, cursor: "pointer", fontFamily: "Nunito,sans-serif", padding: "6px 4px" };

  return (
    <>
      <Head><title>Community Creations | Touch Grass</title></Head>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{overflow-x:hidden;} body{background:${T.bg};color:${T.white};font-family:'Nunito',sans-serif;}
        .cc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;}
        @media(max-width:560px){.cc-grid{grid-template-columns:1fr;}}
      ` }} />
      <div style={{ minHeight: "100vh", background: T.bg }}>
        <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(14px,4vw,48px)", height: 56, background: `${T.bg}ec`, backdropFilter: "blur(18px)", borderBottom: `1px solid ${T.border}` }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
            <span style={{ fontFamily: "Fredoka,system-ui,sans-serif", fontSize: 17, fontWeight: 700, color: T.white }}>touch grass</span>
          </Link>
          <Link href="/create" style={{ fontSize: 11, color: T.olive, textDecoration: "none", letterSpacing: "0.06em" }}>← Creator Hub</Link>
        </nav>

        <div style={{ padding: "36px clamp(14px,5vw,64px) 20px" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", color: T.gold, textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>Community</div>
          <h1 style={{ fontFamily: "Fredoka,system-ui,sans-serif", fontSize: "clamp(32px,6vw,52px)", fontWeight: 700, lineHeight: 1, marginBottom: 12 }}>Community Creations</h1>
          <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, maxWidth: 520 }}>Memes and profile pics made by Touch Grass players. Like your favorites, make your own, and post once you hit a {minStreak}-day streak.</p>
        </div>

        {theme && (
          <div style={{ margin: "0 clamp(14px,5vw,64px) 20px", padding: "16px 18px", borderRadius: 14, background: "rgba(200,168,75,0.07)", border: `1px solid ${T.borderGold}`, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <Ico n="sparkle" size={30} />
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.16em", color: T.gold, textTransform: "uppercase", fontWeight: 800 }}>This week's theme</div>
              <div style={{ fontFamily: "Fredoka,system-ui,sans-serif", fontSize: 21, fontWeight: 700, margin: "2px 0" }}>{theme.title}</div>
              <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>{theme.hint}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/create/meme" style={{ ...pill(true), textDecoration: "none" }}>Make a meme</Link>
              <Link href="/create/pfp" style={{ ...pill(false), textDecoration: "none" }}>Make a PFP</Link>
            </div>
          </div>
        )}

        <div style={{ padding: "0 clamp(14px,5vw,64px) 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={pill(sort === "new")} onClick={() => setSort("new")}>New</button>
          <button style={pill(sort === "top")} onClick={() => setSort("top")}>Top this month</button>
          <span style={{ width: 8 }} />
          <button style={pill(!kind)} onClick={() => setKind("")}>All</button>
          <button style={pill(kind === "meme")} onClick={() => setKind("meme")}>Memes</button>
          <button style={pill(kind === "pfp")} onClick={() => setKind("pfp")}>PFPs</button>
          {me && <button style={pill(mine)} onClick={() => setMine((v) => !v)}>My posts</button>}
        </div>

        {note && <div style={{ margin: "0 clamp(14px,5vw,64px) 12px", fontSize: 13, color: T.gold }}>{note}</div>}

        <div style={{ padding: "6px clamp(14px,5vw,64px) 64px" }}>
          {pending && <div style={{ fontSize: 13, color: T.muted }}>Community Creations is almost ready. Check back soon.</div>}
          {items === null && <div style={{ fontSize: 13, color: T.dim }}>Loading…</div>}
          {items && !pending && items.length === 0 && (
            <div style={{ padding: "40px 16px", textAlign: "center", border: `1px dashed ${T.border}`, borderRadius: 14, color: T.muted, fontSize: 14, lineHeight: 1.6 }}>
              {mine ? "You haven't posted anything yet." : "Nothing here yet. Be the first to post one."}<br />
              <Link href="/create/meme" style={{ color: T.olive, fontWeight: 700 }}>Make a meme</Link>
            </div>
          )}
          <div className="cc-grid">
            {(items || []).map((it) => (
              <div key={it.id} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", minWidth: 0 }}>
                <img src={it.url} alt={it.caption || `${it.kind} by ${it.username}`} loading="lazy" style={{ width: "100%", display: "block", aspectRatio: it.kind === "pfp" ? "1 / 1" : "auto", objectFit: "cover", background: "#000" }} />
                <div style={{ padding: "10px 12px 8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                    <Link href={`/u/${it.username}`} style={{ color: T.olive, fontWeight: 800, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{it.username}</Link>
                    <span style={{ color: T.dim, flexShrink: 0 }}>{ago(it.created_at)}</span>
                  </div>
                  {it.caption && <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.45, marginTop: 4, overflowWrap: "anywhere" }}>{it.caption}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    <button onClick={() => like(it)} disabled={it.own} aria-pressed={it.liked}
                      style={{ ...pill(it.liked), padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6, opacity: it.own ? 0.6 : 1, cursor: it.own ? "default" : "pointer" }}>
                      <Ico n="leaf" size={16} style={{ margin: 0 }} />{it.likes}
                    </button>
                    <button style={small} onClick={() => shareX(it)}>Share</button>
                    {it.own ? <button style={small} onClick={() => del(it)}>Delete</button> : <button style={small} onClick={() => report(it)}>Report</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {next && <div style={{ textAlign: "center", marginTop: 20 }}><button style={pill(false)} disabled={busy} onClick={() => load(next)}>{busy ? "Loading…" : "Load more"}</button></div>}
        </div>
      </div>
    </>
  );
}
