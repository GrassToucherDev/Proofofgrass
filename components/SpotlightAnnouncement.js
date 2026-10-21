import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../utils/supabase";
import {
  renderWinnersImage, buildAnnouncementText, weekRangeLabel, xLength, TONES, SPOTLIGHT_CATEGORIES,
} from "../utils/spotlightImage";

const T = {
  bg2:"#0e100b", bg3:"#141710", border:"rgba(255,255,255,0.055)", gold:"#c8a84b", olive:"#93a85a",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)", red:"#f87171",
};

// Weekly winners announcement: image (template frame + pictures + names) and a post for the main X account.
export default function SpotlightAnnouncement({ spotlights }) {
  const weeks = useMemo(
    () => [...new Set((spotlights || []).filter(s => (s.status ?? "active") === "active").map(s => s.week_start))].sort().reverse(),
    [spotlights]
  );
  const [week, setWeek] = useState("");
  const [tone, setTone] = useState("hype");
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [img, setImg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const runRef = useRef(0);

  useEffect(() => { if (!week || !weeks.includes(week)) setWeek(weeks[0] || ""); }, [weeks, week]);

  const rows = useMemo(() => (spotlights || []).filter(s => s.week_start === week && (s.status ?? "active") === "active"), [spotlights, week]);
  const weekEnd = rows[0]?.week_end;
  const label = week ? weekRangeLabel(week, weekEnd) : "";

  // Build winners (+ avatar lookup) and render the image
  useEffect(() => {
    if (!week) return;
    const run = ++runRef.current;
    (async () => {
      setBusy(true); setErr("");
      try {
        const names = [...new Set(rows.map(r => r.username).filter(Boolean))];
        let av = {};
        if (names.length) {
          const { data } = await supabase.from("Profiles").select("username, avatar_url").in("username", names);
          av = Object.fromEntries((data ?? []).map(p => [p.username, p.avatar_url]));
        }
        const winners = {};
        for (const r of rows) {
          if (!r.username || winners[r.category]) continue;
          winners[r.category] = { handle: r.username.replace(/^@/, ""), avatarUrl: r.avatar_url || av[r.username] || null };
        }
        if (run !== runRef.current) return;
        setWinnersState(winners);
        const url = await renderWinnersImage({ weekLabel: label, winners });
        if (run !== runRef.current) return;
        setImg(url);
      } catch (e) {
        if (run === runRef.current) setErr("Couldn't build the image: " + (e?.message || e));
      } finally {
        if (run === runRef.current) setBusy(false);
      }
    })();
  }, [week, rows, label]);

  const [winnersState, setWinnersState] = useState({});
  useEffect(() => {
    if (edited) return;
    setText(buildAnnouncementText({ weekLabel: label, winners: winnersState, tone }));
  }, [winnersState, tone, label, edited]);

  const missing = SPOTLIGHT_CATEGORIES.filter(c => !winnersState[c.key]);
  const len = xLength(text);
  const flash = m => { setNote(m); setTimeout(() => setNote(""), 2200); };

  const download = () => {
    if (!img) return;
    const a = document.createElement("a");
    a.href = img; a.download = `touchgrass-spotlight-${week}.png`; a.click();
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); flash("Post copied"); }
    catch { flash("Copy failed — select the text manually"); }
  };
  const openX = () => window.open("https://x.com/intent/post?text=" + encodeURIComponent(text), "_blank", "noopener");
  const share = async () => {
    try {
      const blob = await (await fetch(img)).blob();
      const file = new File([blob], `touchgrass-spotlight-${week}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
      else flash("Sharing files isn't supported here — use Download + Open in X");
    } catch (e) { if (e?.name !== "AbortError") flash("Share failed"); }
  };

  const btn = (bg, color, border) => ({ background: bg, color, border: border || "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" });

  return (
    <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:"20px", marginBottom:24 }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.muted, marginBottom:14 }}>
        Weekly Announcement
      </div>
      {!weeks.length ? (
        <div style={{ fontSize:13, color:T.dim }}>Save at least one winner to build an announcement.</div>
      ) : (
        <>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:14 }}>
            <select value={week} onChange={e => { setWeek(e.target.value); setEdited(false); }}
              style={{ background:T.bg3, color:T.white, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 10px", fontSize:13 }}>
              {weeks.map(w => <option key={w} value={w}>{weekRangeLabel(w)}</option>)}
            </select>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {TONES.map(t => (
                <button key={t.id} onClick={() => { setTone(t.id); setEdited(false); }}
                  style={{ ...btn(tone === t.id ? T.gold : T.bg3, tone === t.id ? "#0e1108" : T.muted, `1px solid ${T.border}`), padding:"7px 12px" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {missing.length > 0 && (
            <div style={{ fontSize:12, color:T.gold, marginBottom:12 }}>
              No winner saved yet for: {missing.map(m => m.name).join(", ")}. Those slots show “No winner yet” on the image.
            </div>
          )}
          {err && <div style={{ fontSize:12, color:T.red, marginBottom:12 }}>{err}</div>}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:18 }}>
            <div>
              <div style={{ position:"relative", borderRadius:10, overflow:"hidden", background:T.bg3, aspectRatio:"1672 / 941" }}>
                {img && <img src={img} alt="Community Spotlight winners" style={{ width:"100%", display:"block", opacity: busy ? 0.5 : 1 }} />}
                {busy && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:T.muted, fontSize:13 }}>Building image…</div>}
              </div>
              <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                <button onClick={download} disabled={!img} style={btn(T.gold, "#0e1108")}>Download image</button>
                <button onClick={share} disabled={!img} style={btn(T.bg3, T.white, `1px solid ${T.border}`)}>Share…</button>
              </div>
            </div>
            <div>
              <textarea value={text} onChange={e => { setText(e.target.value); setEdited(true); }} rows={13}
                style={{ width:"100%", boxSizing:"border-box", background:T.bg3, color:T.white, border:`1px solid ${T.border}`, borderRadius:10, padding:12, fontSize:13, lineHeight:1.5, fontFamily:"inherit", resize:"vertical" }} />
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:12, color: len > 280 ? T.red : T.muted }}>{len} / 280</span>
                {edited && <button onClick={() => setEdited(false)} style={{ ...btn("transparent", T.muted, `1px solid ${T.border}`), padding:"4px 10px", fontSize:12 }}>Reset text</button>}
                <span style={{ marginLeft:"auto", fontSize:12, color:T.olive }}>{note}</span>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                <button onClick={copy} disabled={!text} style={btn(T.bg3, T.white, `1px solid ${T.border}`)}>Copy post</button>
                <button onClick={openX} disabled={!text} style={btn(T.bg3, T.white, `1px solid ${T.border}`)}>Open in X</button>
              </div>
              <div style={{ fontSize:11, color:T.dim, marginTop:8 }}>
                Open in X fills in the text only — download the image and attach it there. Usernames are posted as @handles, so check they match each winner's X account.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
