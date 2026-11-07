// "Post to Community" button for the /create tools. Sends the finished image to /api/create/post.
import { useState } from "react";
import Link from "next/link";
import { POST_MIN_STREAK } from "../utils/createCommunity";

const T = { bg3:"#141710", border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", olive:"#93a85a", gold:"#c8a84b", white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)", red:"#e05252" };

function getUsername() {
  try { const s = localStorage.getItem("pog_username"); return s ? s.replace(/@/g, "").toLowerCase().trim() : null; } catch { return null; }
}

// Re-encode as JPEG (dark background behind any transparency) so uploads stay small.
function toJpeg(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1080 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#080a06"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export default function PostToCommunity({ dataUrl, kind, tool, theme }) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [state, setState] = useState("idle"); // idle | posting | done | error
  const [err, setErr] = useState("");

  const post = async () => {
    const as = getUsername();
    if (!as) { setState("error"); setErr("Enter your username on the dashboard first, then come back."); return; }
    setState("posting"); setErr("");
    try {
      const image = await toJpeg(dataUrl);
      const r = await fetch("/api/create/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as, kind, tool, caption, image }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setState("error"); setErr(j.code === "not_signed_in" || j.code === "unclaimed" ? "Secure your username with Google on the dashboard to post." : j.error || "Could not post that."); return; }
      setState("done");
    } catch { setState("error"); setErr("Could not post that. Check your connection and try again."); }
  };

  if (state === "done") {
    return (
      <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(147,168,90,0.08)", border:`1px solid ${T.borderG}`, fontSize:13, color:T.white, fontWeight:700 }}>
        Posted to Community Creations.{" "}
        <Link href="/create/community" style={{ color:T.olive }}>See it in the gallery</Link>
      </div>
    );
  }
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn"
        style={{ background:"transparent", color:T.olive, border:`1px solid ${T.borderG}`, width:"100%" }}>
        Post to Community
      </button>
    );
  }
  return (
    <div style={{ padding:14, borderRadius:12, background:T.bg3, border:`1px solid ${T.borderG}`, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontSize:12, color:T.muted, lineHeight:1.5 }}>
        Posts are public. Players with a {POST_MIN_STREAK}-day streak can post, up to 5 a day.{theme ? ` This week's theme: ${theme}.` : ""}
      </div>
      <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={140} placeholder="Add a caption (optional)"
        style={{ background:"#0e100b", border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 12px", color:T.white, fontSize:16, fontFamily:"Nunito,sans-serif", width:"100%", boxSizing:"border-box" }} />
      {state === "error" && <div style={{ fontSize:12, color:T.red, lineHeight:1.5 }}>{err}</div>}
      <div style={{ display:"flex", gap:8 }}>
        <button className="btn" onClick={post} disabled={state === "posting"}
          style={{ flex:1, background:T.olive, color:"#0a0c06", opacity: state === "posting" ? 0.6 : 1 }}>
          {state === "posting" ? "Posting…" : "Post"}
        </button>
        <button className="btn" onClick={() => { setOpen(false); setState("idle"); setErr(""); }}
          style={{ background:"transparent", color:T.dim, border:`1px solid ${T.border}` }}>Cancel</button>
      </div>
    </div>
  );
}
