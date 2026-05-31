import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabase";

const T = {
  bg:"#0a0b08", bg2:"#111209", bg3:"#181a12",
  border:"rgba(255,255,255,0.06)", borderG:"rgba(147,168,90,0.18)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.48)", dim:"rgba(240,239,234,0.22)",
};

function norm(v) { return String(v??"").replace(/@/g,"").toLowerCase().trim(); }

function makeSlug(a, b, days) {
  const ts = Date.now().toString(36);
  return `${norm(a)}-vs-${norm(b)}-${days}d-${ts}`;
}

export default function ChallengeModal({ targetUsername, viewerUsername, onClose }) {
  const router = useRouter();
  const [duration, setDuration]   = useState(7);
  const [message,  setMessage]    = useState("");
  const [sending,  setSending]    = useState(false);
  const [error,    setError]      = useState("");
  const [sent,     setSent]       = useState(false);
  const [slug,     setSlug]       = useState("");

  const handleSend = async () => {
    if (!viewerUsername) { setError("Enter your username first."); return; }
    if (norm(viewerUsername) === norm(targetUsername)) { setError("You can't challenge yourself."); return; }
    setSending(true); setError("");

    const newSlug = makeSlug(viewerUsername, targetUsername, duration);

    const { error: insertErr } = await supabase.from("Challenges").insert([{
      slug:          newSlug,
      challenger:    norm(viewerUsername),
      challenged:    norm(targetUsername),
      duration_days: duration,
      message:       message.trim() || null,
      status:        "pending",
    }]);

    if (insertErr) {
      setError("Failed to send — try again.");
      setSending(false);
      return;
    }

    await supabase.from("ChallengeEvents").insert([{
      challenge_id: null, // will be updated via trigger or can be fetched
      username: norm(viewerUsername),
      event_type: "sent",
    }]);

    setSlug(newSlug);
    setSent(true);
    setSending(false);
  };

  const copyLink = () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/challenge/${slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const goToChallenge = () => {
    router.push(`/challenge/${slug}`);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.72)",
        backdropFilter:"blur(8px)", zIndex:1000,
      }} />

      {/* Modal */}
      <div style={{
        position:"fixed", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)", zIndex:1001,
        width:"min(92vw,460px)",
        background:T.bg2, border:`1px solid ${T.borderG}`,
        borderRadius:18, padding:28,
        boxShadow:"0 24px 80px rgba(0,0,0,0.6)",
        display:"flex", flexDirection:"column", gap:20,
      }}>

        {sent ? (
          /* SUCCESS STATE */
          <>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🌿</div>
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:24, fontWeight:700, color:T.white, marginBottom:8 }}>
                Challenge Sent
              </div>
              <div style={{ fontSize:13, color:T.muted, lineHeight:1.6 }}>
                @{norm(targetUsername)} will receive your {duration}-day challenge.
              </div>
            </div>

            <div style={{ background:T.bg3, borderRadius:10, padding:14,
              border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, color:T.dim, letterSpacing:"0.12em",
                textTransform:"uppercase", marginBottom:6 }}>Challenge Link</div>
              <div style={{ fontSize:11, color:T.olive, wordBreak:"break-all" }}>
                proofofgrass.app/challenge/{slug}
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={copyLink} style={{
                flex:1, background:"transparent", border:`1px solid ${T.border}`,
                borderRadius:8, padding:"11px 0", color:T.white,
                fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600,
                cursor:"pointer", transition:"all 0.2s",
              }}>Copy Link</button>
              <button onClick={goToChallenge} style={{
                flex:1, background:T.olive, border:"none",
                borderRadius:8, padding:"11px 0", color:"#0e1108",
                fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700,
                cursor:"pointer", letterSpacing:"0.06em",
              }}>View Challenge</button>
            </div>

            <button onClick={onClose} style={{
              background:"transparent", border:"none", color:T.dim,
              fontSize:12, cursor:"pointer", textAlign:"center",
            }}>Close</button>
          </>
        ) : (
          /* SEND STATE */
          <>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:T.olive,
                  textTransform:"uppercase", fontWeight:600, marginBottom:4 }}>
                  New Challenge
                </div>
                <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:22, fontWeight:700, color:T.white }}>
                  Challenge @{norm(targetUsername)}
                </div>
              </div>
              <button onClick={onClose} style={{
                background:"transparent", border:"none", color:T.dim,
                fontSize:20, cursor:"pointer", lineHeight:1, flexShrink:0,
              }}>✕</button>
            </div>

            {/* Duration */}
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em",
                textTransform:"uppercase", color:T.muted, marginBottom:10 }}>
                Challenge Length
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setDuration(d)} style={{
                    flex:1, padding:"11px 0", borderRadius:8, cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700,
                    transition:"all 0.2s",
                    background: duration === d ? T.olive : "transparent",
                    color:      duration === d ? "#0e1108" : T.dim,
                    border:     duration === d ? "none" : `1px solid ${T.border}`,
                  }}>
                    {d}d
                  </button>
                ))}
              </div>
              <div style={{ fontSize:10, color:T.dim, marginTop:8, textAlign:"center" }}>
                Both must log outdoor proof every day for {duration} days
              </div>
            </div>

            {/* Message */}
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em",
                textTransform:"uppercase", color:T.muted, marginBottom:8 }}>
                Message (optional)
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Let's see who stays outside."
                maxLength={140}
                rows={2}
                style={{
                  width:"100%", background:T.bg3,
                  border:`1px solid ${T.border}`, borderRadius:8,
                  padding:"10px 13px", color:T.white,
                  fontFamily:"'DM Sans',sans-serif", fontSize:13,
                  outline:"none", resize:"none",
                }}
              />
              <div style={{ fontSize:10, color:T.dim, textAlign:"right", marginTop:4 }}>
                {message.length}/140
              </div>
            </div>

            {error && (
              <div style={{ fontSize:11, color:"#ef4444", padding:"8px 12px",
                background:"rgba(239,68,68,0.08)", borderRadius:6,
                border:"1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={onClose} style={{
                flex:1, background:"transparent", border:`1px solid ${T.border}`,
                borderRadius:8, padding:"12px 0", color:T.white,
                fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600,
                cursor:"pointer",
              }}>Cancel</button>
              <button onClick={handleSend} disabled={sending} style={{
                flex:2, background:T.olive, border:"none",
                borderRadius:8, padding:"12px 0", color:"#0e1108",
                fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700,
                cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase",
                opacity: sending ? 0.7 : 1,
              }}>
                {sending ? "Sending…" : "Send Challenge"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}