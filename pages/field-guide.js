// pages/field-guide.js — V2 Field Guide (Mockup Match)
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Head from "next/head";
import { supabase } from "../utils/supabase";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";

function norm(v) { return String(v ?? "").replace(/@/g, "").toLowerCase().trim(); }

// ── Collection definitions — rendered dynamically ─────────────────────────────
const COLLECTIONS = [
  {
    id: "skies",
    name: "Skies",
    icon: "⛅",
    description: "Capture 10 unique sky moments — golden hour, storm clouds, clear blue, star trails, and more.",
    slots: 10,
    bg: "linear-gradient(135deg,#e0f0ff,#c5e3f7)",
  },
  {
    id: "plants_foliage",
    name: "Plants & Foliage",
    icon: "🌿",
    description: "Document 10 unique plants and foliage — leaves, bark, roots, canopy, and everything in between.",
    slots: 10,
    bg: "linear-gradient(135deg,#e8f5e9,#d4edda)",
  },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ w="100%", h=16, r=8 }) {
  return <div style={{ width:w, height:h, borderRadius:r,
    background:"linear-gradient(90deg,rgba(200,220,190,0.3) 0%,rgba(220,235,210,0.5) 50%,rgba(200,220,190,0.3) 100%)",
    backgroundSize:"200% 100%", animation:"v2Shimmer 1.4s ease-in-out infinite" }} />;
}

// ── Slot component ────────────────────────────────────────────────────────────
function Slot({ num, entry, onTapEmpty, onTapFilled, isOwner }) {
  const filled = !!entry;
  return (
    <button
      onClick={()=> filled ? onTapFilled(entry) : isOwner ? onTapEmpty(num) : null}
      aria-label={`Slot ${num} — ${filled ? "filled" : "empty"}`}
      style={{
        width:"100%", aspectRatio:"1/1", borderRadius:12,
        border: filled ? `2px solid ${V2.borderGreen}` : "2px dashed rgba(200,220,190,0.6)",
        background: filled ? "rgba(125,200,50,0.06)" : "rgba(255,255,255,0.6)",
        cursor: filled || isOwner ? "pointer" : "default",
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", gap:4, overflow:"hidden", position:"relative",
        padding:0, transition:"all 0.15s",
      }}
      onMouseEnter={e=>{ if(filled||isOwner) e.currentTarget.style.transform="scale(1.04)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=""; }}>
      {filled ? (
        <>
          <img src={entry.image_url} alt={`Slot ${num}`} loading="lazy"
            style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0 }} />
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(180deg,transparent 60%,rgba(0,0,0,0.5) 100%)" }} />
          <div style={{ position:"absolute", bottom:4, right:6, fontSize:9,
            fontWeight:700, color:"white" }}>✓</div>
          <div style={{ position:"absolute", bottom:4, left:6, fontSize:9,
            color:"rgba(255,255,255,0.8)" }}>#{num}</div>
        </>
      ) : (
        <>
          <div style={{ fontSize:20, color:"rgba(200,220,190,0.8)" }}>+</div>
          <div style={{ fontSize:9, color:V2.midGray, fontWeight:600 }}>#{num}</div>
        </>
      )}
    </button>
  );
}

// ── Collection card ───────────────────────────────────────────────────────────
function CollectionCard({ col, entries, onTapEmpty, onTapFilled, isOwner }) {
  const filled = entries.length;
  const pct    = Math.round((filled / col.slots) * 100);
  const complete = filled >= col.slots;

  return (
    <div style={{ background:"white", borderRadius:20, overflow:"hidden",
      boxShadow:"0 2px 20px rgba(26,74,10,0.08)", border:`1px solid ${V2.borderSoft}` }}>

      {/* Header */}
      <div style={{ padding:"20px 20px 16px",
        background:complete?"rgba(125,200,50,0.08)":"white",
        borderBottom:`1px solid ${V2.borderSoft}` }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:16 }}>
          <div style={{ width:56, height:56, borderRadius:14, flexShrink:0,
            background:col.bg,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>
            {col.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <h3 style={{ fontFamily:V2.fontSans, fontSize:20, fontWeight:800,
                color:V2.forestGreen }}>{col.name}</h3>
              {complete && <span style={{ fontSize:11, fontWeight:700, color:V2.grassGreen,
                background:"rgba(125,200,50,0.1)", border:`1px solid ${V2.borderGreen}`,
                borderRadius:20, padding:"2px 10px" }}>✓ Complete</span>}
            </div>
            <p style={{ fontSize:13, color:V2.textMuted, lineHeight:1.5 }}>{col.description}</p>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          marginBottom:8 }}>
          <span style={{ fontSize:12, color:V2.midGray }}>{filled} / {col.slots} entries</span>
          <span style={{ fontSize:12, fontWeight:700, color:complete?V2.grassGreen:V2.midGray }}>{pct}%</span>
        </div>
        <div style={{ height:6, background:"rgba(200,220,190,0.3)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, borderRadius:3,
            background:complete?V2.gradientGrassBtn:"linear-gradient(90deg,#7dc832,#5ba622)",
            transition:"width 1s ease" }} />
        </div>
      </div>

      {/* Slot grid */}
      <div style={{ padding:16,
        display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
        {Array.from({ length:col.slots }, (_,i) => {
          const num   = i + 1;
          const entry = entries.find(e => e.slot_number === num);
          return (
            <Slot key={num} num={num} entry={entry||null}
              onTapEmpty={onTapEmpty} onTapFilled={onTapFilled}
              isOwner={isOwner} />
          );
        })}
      </div>
    </div>
  );
}

// ── Upload modal ──────────────────────────────────────────────────────────────
function UploadModal({ collection, slotNum, username, onClose, onSuccess }) {
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [status,    setStatus]    = useState("idle"); // idle|uploading|verifying|done|error
  const [message,   setMessage]   = useState("");
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file || !username) return;
    setStatus("uploading"); setMessage("");
    try {
      // Convert to base64 for Claude vision
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setStatus("verifying"); setMessage("AI is verifying your photo…");

      // Get existing labels for this collection to check uniqueness
      const { data: existingEntries } = await supabase
        .from("FieldGuideEntries")
        .select("label")
        .eq("username", username)
        .eq("collection_id", collection.id);
      const existingLabels = (existingEntries || []).map(e => e.label).filter(Boolean);

      // Call classify API
      const classifyRes = await fetch("/api/field-guide/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type || "image/jpeg",
          collectionSlug: collection.id,
          existingLabels,
        }),
      });

      const result = await classifyRes.json();

      if (!classifyRes.ok) {
        setStatus("error");
        setMessage("Verification service unavailable. Please try again.");
        return;
      }

      if (result.approved) {
        // Upload to Supabase storage
        const ext  = file.name.split(".").pop() || "jpg";
        const path = `${username}/${collection.id}/slot_${slotNum}_${Date.now()}.${ext}`;
        const { error:upErr } = await supabase.storage
          .from("field-guide-photos").upload(path, file, { upsert:true });
        if (upErr) throw upErr;

        const { data:urlData } = supabase.storage.from("field-guide-photos").getPublicUrl(path);
        const imageUrl = urlData?.publicUrl;

        // Check for duplicate slot
        const { data:existing } = await supabase
          .from("FieldGuideEntries")
          .select("id")
          .eq("username", username)
          .eq("collection_id", collection.id)
          .eq("slot_number", slotNum)
          .maybeSingle();

        if (existing) {
          setStatus("error");
          setMessage("This slot is already filled.");
          return;
        }

        // Save entry
        const { error:insertErr } = await supabase
          .from("FieldGuideEntries")
          .insert([{
            username,
            collection_id: collection.id,
            slot_number: slotNum,
            image_url: imageUrl,
            label: result.label || "outdoor nature photo",
            verified: true,
            verification_method: "claude_vision",
            submitted_at: new Date().toISOString(),
          }]);

        if (insertErr) {
          setStatus("error");
          setMessage("Failed to save entry. Please try again.");
          return;
        }

        // Award Grass Draw bonus
        try {
          await fetch("/api/grass-draw/award-bonus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, bonus_type: "field_guide" }),
          });
        } catch(e) { console.warn("[field-guide] bonus non-fatal:", e?.message); }

        setStatus("done");
        setMessage(`Verified! "${result.label}" added to your ${collection.name} collection.`);
        setTimeout(() => { onSuccess(); onClose(); }, 1800);

      } else {
        setStatus("error");
        setMessage(result.reason || `This photo doesn't match the ${collection.name} collection. Try a photo where the subject is clearer.`);
      }
    } catch(e) {
      console.error("[field-guide] submit error:", e);
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300,
      background:"rgba(0,0,0,0.55)", backdropFilter:"blur(10px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div style={{ background:"white", borderRadius:24, overflow:"hidden",
        maxWidth:480, width:"100%", boxShadow:"0 20px 60px rgba(26,74,10,0.2)" }}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${V2.borderSoft}`,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:V2.forestGreen }}>
              {collection.icon} {collection.name}
            </div>
            <div style={{ fontSize:12, color:V2.midGray }}>Slot #{slotNum}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            cursor:"pointer", fontSize:22, color:V2.midGray }}>×</button>
        </div>

        <div style={{ padding:"20px 24px" }}>
          {/* Photo requirements */}
          <div style={{ fontSize:12, color:V2.midGray, marginBottom:16, lineHeight:1.5 }}>
            📋 Real outdoor photo · No AI-generated images · Must match this collection · Unique submission
          </div>

          {/* Upload area */}
          <div onClick={()=>inputRef.current?.click()}
            style={{ borderRadius:16, overflow:"hidden", marginBottom:16, cursor:"pointer",
              border:`2px dashed ${preview?V2.borderGreen:V2.borderSoft}`,
              background:"rgba(125,200,50,0.04)",
              minHeight:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {preview ? (
              <img src={preview} alt="" style={{ width:"100%", maxHeight:260, objectFit:"cover" }} />
            ) : (
              <div style={{ textAlign:"center", padding:32 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>📸</div>
                <div style={{ fontSize:14, fontWeight:600, color:V2.forestGreen, marginBottom:4 }}>
                  Tap to choose a photo
                </div>
                <div style={{ fontSize:12, color:V2.midGray }}>or drag and drop</div>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" capture="environment"
            onChange={e=>handleFile(e.target.files?.[0])}
            style={{ display:"none" }} />

          {/* Status message */}
          {message && (
            <div style={{ marginBottom:14, padding:"10px 14px", borderRadius:10, fontSize:13,
              background:status==="done"?"rgba(125,200,50,0.08)":"rgba(230,80,80,0.08)",
              border:`1px solid ${status==="done"?V2.borderGreen:"rgba(230,80,80,0.3)"}`,
              color:status==="done"?V2.grassGreen:"#e05050" }}>
              {status==="verifying" && "⏳ "}{message}
            </div>
          )}

          {/* CTA */}
          {status !== "done" && (
            <button onClick={handleSubmit}
              disabled={!file||status==="uploading"||status==="verifying"}
              style={{ ...V2Styles.btnPrimary, width:"100%", justifyContent:"center",
                fontSize:15, opacity:(!file||status==="uploading"||status==="verifying")?0.6:1,
                cursor:(!file||status==="uploading"||status==="verifying")?"default":"pointer" }}>
              {status==="uploading"?"Uploading…":status==="verifying"?"Verifying…":"Submit Find 🌿"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Slot detail modal ─────────────────────────────────────────────────────────
function SlotDetailModal({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300,
      background:"rgba(0,0,0,0.6)", backdropFilter:"blur(10px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div style={{ background:"white", borderRadius:24, overflow:"hidden",
        maxWidth:480, width:"100%", boxShadow:"0 20px 60px rgba(26,74,10,0.2)" }}
        onClick={e=>e.stopPropagation()}>
        <img src={entry.image_url} alt="" style={{ width:"100%", maxHeight:320, objectFit:"cover" }} />
        <div style={{ padding:"20px 24px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:V2.forestGreen, marginBottom:3 }}>
                Slot #{entry.slot_number}
              </div>
              <div style={{ fontSize:12, color:V2.midGray }}>
                {entry.submitted_at
                  ? new Date(entry.submitted_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})
                  : ""}
              </div>
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:V2.grassGreen,
              background:"rgba(125,200,50,0.1)", borderRadius:20, padding:"4px 12px" }}>
              {entry.verified ? "✓ Verified" : "⏳ Pending"}
            </div>
          </div>
          <button onClick={onClose} style={{ ...V2Styles.btnSecondary, width:"100%",
            justifyContent:"center", fontSize:13 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Recent find card ──────────────────────────────────────────────────────────
function RecentFindCard({ find }) {
  const col = COLLECTIONS.find(c => c.id === find.collection_id);
  return (
    <div style={{ borderRadius:16, overflow:"hidden", position:"relative",
      aspectRatio:"1/1", background:"rgba(200,220,190,0.2)",
      boxShadow:"0 2px 12px rgba(26,74,10,0.1)", cursor:"pointer" }}>
      <img src={find.image_url} alt="" loading="lazy"
        style={{ width:"100%", height:"100%", objectFit:"cover" }}
        onError={e=>{e.currentTarget.style.display="none";}} />
      <div style={{ position:"absolute", inset:0,
        background:"linear-gradient(180deg,transparent 50%,rgba(0,0,0,0.7) 100%)" }} />
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"10px 12px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:V2.grassLime, marginBottom:2 }}>
          {col?.icon} {col?.name || find.collection_id}
        </div>
        <div style={{ fontSize:12, fontWeight:600, color:"white" }}>@{find.username}</div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.65)" }}>outdoor nature photo</div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FieldGuide() {
  const [username,     setUsername]     = useState("");
  const [allEntries,   setAllEntries]   = useState({});
  const [recentFinds,  setRecentFinds]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [uploadModal,  setUploadModal]  = useState(null); // {collection, slotNum}
  const [detailModal,  setDetailModal]  = useState(null); // entry
  const [error,        setError]        = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("pog_username") : null;
    if (saved) setUsername(norm(saved));
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true); setError("");
    try {
      // Load user entries for all collections
      if (username) {
        const { data } = await supabase
          .from("FieldGuideEntries")
          .select("*")
          .eq("username", username)
          .eq("verified", true);

        const grouped = {};
        COLLECTIONS.forEach(c => { grouped[c.id] = []; });
        (data || []).forEach(e => {
          if (grouped[e.collection_id]) grouped[e.collection_id].push(e);
        });
        setAllEntries(grouped);
      }

      // Load recent finds (community)
      const { data:recent } = await supabase
        .from("FieldGuideEntries")
        .select("*")
        .eq("verified", true)
        .order("submitted_at", { ascending:false })
        .limit(8);
      setRecentFinds(recent || []);

    } catch(e) { setError("Couldn't load the Field Guide right now."); }
    setLoading(false);
  }, [username]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Progress calculations
  const totalSlots   = COLLECTIONS.reduce((s,c) => s + c.slots, 0);
  const filledSlots  = Object.values(allEntries).reduce((s,arr) => s + arr.length, 0);
  const pctOverall   = totalSlots > 0 ? Math.round((filledSlots/totalSlots)*100) : 0;
  const colsStarted  = Object.values(allEntries).filter(a=>a.length>0).length;

  const css = V2GlobalCSS + `
    .fg-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    .fg-recent-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
    @media(max-width:768px) {
      .fg-grid { grid-template-columns:1fr !important; }
      .fg-recent-grid { grid-template-columns:repeat(2,1fr) !important; }
    }
    @media(max-width:480px) {
      .fg-recent-grid { grid-template-columns:repeat(2,1fr) !important; }
    }
  `;

  return (
    <>
      <Head>
        <title>Field Guide | Proof of Grass</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html:css }} />

      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 30%,#f0f8ee 100%)" }}>

        {/* ── NAV ────────────────────────────────────────────────────────── */}
        <nav style={{ position:"sticky", top:0, zIndex:200, height:64,
          display:"flex", alignItems:"center", padding:"0 clamp(14px,4vw,40px)", gap:20,
          background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${V2.borderSoft}`,
          boxShadow:"0 2px 16px rgba(26,74,10,0.07)" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:10,
            textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt=""
              style={{ width:36, height:36, objectFit:"contain" }} />
            <span style={{ fontFamily:V2.fontSans, fontSize:16, fontWeight:800, color:V2.forestGreen }}>
              Touch Grass <span style={{ fontWeight:400, opacity:0.5 }}>| Proof of Grass</span>
            </span>
          </Link>
          <div style={{ display:"flex", gap:4, flex:1, overflowX:"auto", scrollbarWidth:"none" }}>
            {[["Dashboard","/"],["Leaderboard","/leaderboard"],["Grass Draw","/grass-draw"],
              ["Marketplace","/marketplace"],["Field Guide","/field-guide"]].map(([l,h])=>(
              <Link key={l} href={h} style={{ fontSize:13,
                fontWeight:l==="Field Guide"?700:500,
                color:l==="Field Guide"?V2.grassGreen:V2.forestGreen,
                textDecoration:"none", padding:"6px 12px", borderRadius:20, whiteSpace:"nowrap" }}>{l}</Link>
            ))}
          </div>
          {username && (
            <Link href={`/u/${username}`} style={{ display:"flex", alignItems:"center", gap:8,
              background:"white", border:`1px solid ${V2.borderSoft}`, borderRadius:20,
              padding:"6px 14px", textDecoration:"none", flexShrink:0 }}>
              <span style={{ fontSize:16 }}>🌿</span>
              <span style={{ fontSize:13, fontWeight:600, color:V2.forestGreen }}>@{username}</span>
            </Link>
          )}
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div style={{ position:"relative", overflow:"hidden", minHeight:360,
          background:"linear-gradient(160deg,#c5e3f7 0%,#d8f0e8 60%,#e8f4fd 100%)",
          padding:"40px clamp(14px,4vw,48px) 48px",
          display:"flex", alignItems:"center", gap:32, flexWrap:"wrap" }}>

          {/* Background illustration */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none", opacity:0.15 }}>
            <div style={{ position:"absolute", fontSize:200, bottom:-20, right:80, lineHeight:1 }}>🌲</div>
            <div style={{ position:"absolute", fontSize:120, bottom:10, right:260, lineHeight:1 }}>🦋</div>
            <div style={{ position:"absolute", fontSize:80, top:20, right:180, lineHeight:1 }}>🌸</div>
          </div>

          {/* Left — headline */}
          <div style={{ flex:1, minWidth:280, position:"relative" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:16,
              background:"rgba(255,255,255,0.85)", border:`1px solid ${V2.borderGreen}`,
              borderRadius:20, padding:"6px 16px" }}>
              <span style={{ fontSize:14 }}>🌿</span>
              <span style={{ fontSize:12, fontWeight:700, letterSpacing:"0.1em",
                textTransform:"uppercase", color:V2.grassGreen }}>Proof of Grass</span>
            </div>

            <h1 style={{ fontFamily:V2.fontSans, fontWeight:900,
              fontSize:"clamp(36px,6vw,64px)", color:V2.forestGreen,
              lineHeight:1, marginBottom:14 }}>
              Field Guide 📖
            </h1>
            <p style={{ fontSize:15, color:V2.textBody, lineHeight:1.6, marginBottom:28, maxWidth:440 }}>
              Explore, photograph, and collect the natural world.<br/>
              Fill every slot in every collection to earn the Field Guide Master badge.
            </p>

            {username ? (
              <button onClick={()=>window.scrollTo({top:500,behavior:"smooth"})}
                style={{ ...V2Styles.btnPrimary, fontSize:15, padding:"14px 28px" }}>
                Continue Collecting →
              </button>
            ) : (
              <Link href="/" style={{ ...V2Styles.btnPrimary, fontSize:15,
                padding:"14px 28px", textDecoration:"none",
                display:"inline-flex", alignItems:"center", gap:8 }}>
                Sign in to start collecting →
              </Link>
            )}
          </div>

          {/* Right — progress glass card */}
          {username && (
            <div style={{ flexShrink:0, width:"clamp(240px,35%,320px)",
              background:"rgba(255,255,255,0.88)", backdropFilter:"blur(20px)",
              borderRadius:20, padding:"24px",
              border:"1px solid rgba(255,255,255,0.7)",
              boxShadow:"0 8px 32px rgba(26,74,10,0.12)" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", color:V2.grassGreen, marginBottom:12 }}>
                Collection Progress
              </div>
              {loading ? <Skel h={40} r={6} /> : (
                <>
                  <div style={{ fontFamily:V2.fontSerif, fontSize:36, fontWeight:700,
                    color:V2.forestGreen, lineHeight:1, marginBottom:4 }}>
                    {colsStarted} <span style={{ fontSize:20, color:V2.midGray }}>/ {COLLECTIONS.length}</span>
                  </div>
                  <div style={{ fontSize:12, color:V2.midGray, marginBottom:16 }}>Collections Started</div>
                  <div style={{ height:6, background:"rgba(200,220,190,0.3)", borderRadius:3,
                    overflow:"hidden", marginBottom:16 }}>
                    <div style={{ height:"100%", borderRadius:3,
                      width:`${(colsStarted/COLLECTIONS.length)*100}%`,
                      background:V2.gradientGrassBtn, transition:"width 1s" }} />
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                    textTransform:"uppercase", color:V2.grassGreen, marginBottom:8 }}>
                    Overall Progress
                  </div>
                  <div style={{ fontFamily:V2.fontSerif, fontSize:32, fontWeight:700,
                    color:V2.forestGreen, lineHeight:1, marginBottom:4 }}>
                    {pctOverall}%
                  </div>
                  <div style={{ fontSize:12, color:V2.midGray, marginBottom:12 }}>
                    {filledSlots} / {totalSlots} slots filled
                  </div>
                  <button onClick={()=>window.scrollTo({top:500,behavior:"smooth"})}
                    style={{ width:"100%", padding:"9px", borderRadius:10,
                      background:"transparent", border:`1.5px solid ${V2.borderGreen}`,
                      color:V2.grassGreen, fontSize:12, fontWeight:700,
                      cursor:"pointer", fontFamily:V2.fontSans }}>
                    View My Progress
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <div style={{ maxWidth:960, margin:"0 auto", padding:"32px clamp(14px,4vw,24px) 80px" }}>

          {/* Error */}
          {error && (
            <div style={{ background:"white", borderRadius:16, padding:"32px",
              textAlign:"center", marginBottom:24,
              border:"1px solid rgba(230,80,80,0.3)" }}>
              <div style={{ fontSize:14, color:"#e05050", marginBottom:12 }}>{error}</div>
              <button onClick={loadEntries} style={{ ...V2Styles.btnPrimary, fontSize:13 }}>
                Try Again
              </button>
            </div>
          )}

          {/* ── COLLECTION CARDS ──────────────────────────────────────────── */}
          <div className="fg-grid" style={{ marginBottom:32 }}>
            {COLLECTIONS.map(col => (
              <CollectionCard
                key={col.id}
                col={col}
                entries={allEntries[col.id] || []}
                isOwner={!!username}
                onTapEmpty={(slotNum) => setUploadModal({ collection:col, slotNum })}
                onTapFilled={(entry) => setDetailModal(entry)}
              />
            ))}
          </div>

          {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:20, padding:"28px 24px",
            boxShadow:"0 2px 16px rgba(26,74,10,0.07)", border:`1px solid ${V2.borderSoft}`,
            marginBottom:32 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em",
              textTransform:"uppercase", color:V2.grassGreen, marginBottom:20 }}>
              How It Works
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:20 }}>
              {[
                { icon:"📷", title:"Go outside",
                  desc:"Find something that fits a collection — a sky, plant, wildlife, or other nature category." },
                { icon:"📤", title:"Upload your photo",
                  desc:"Submit it to the collection slot you want to fill." },
                { icon:"🔍", title:"Claude verifies it",
                  desc:"AI checks the photo to ensure it's real and visually unique." },
              ].map((s,i) => (
                <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                  <div style={{ width:52, height:52, borderRadius:14, flexShrink:0,
                    background:"rgba(125,200,50,0.08)", border:`1px solid ${V2.borderGreen}`,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                    {s.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:V2.forestGreen, marginBottom:6 }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize:13, color:V2.textMuted, lineHeight:1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RECENT FINDS ──────────────────────────────────────────────── */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:18 }}>🌿</span>
                <span style={{ fontSize:16, fontWeight:800, color:V2.forestGreen,
                  textTransform:"uppercase", letterSpacing:"0.08em", fontSize:13 }}>
                  Recent Finds
                </span>
              </div>
              <button style={{ ...V2Styles.btnSecondary, fontSize:12, padding:"6px 16px" }}>
                View all finds →
              </button>
            </div>

            {recentFinds.length > 0 ? (
              <div className="fg-recent-grid">
                {recentFinds.map((f,i) => <RecentFindCard key={i} find={f} />)}
              </div>
            ) : (
              <div style={{ background:"white", borderRadius:16, padding:"48px 24px",
                textAlign:"center", border:`1px solid ${V2.borderSoft}` }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🌿</div>
                <div style={{ fontSize:14, fontWeight:700, color:V2.forestGreen, marginBottom:6 }}>
                  No finds yet
                </div>
                <div style={{ fontSize:13, color:V2.midGray }}>
                  Be the first to submit a nature discovery!
                </div>
              </div>
            )}
          </div>

          {/* ── MASTER BADGE PROGRESS ─────────────────────────────────────── */}
          {username && !loading && (
            <div style={{ marginTop:32, background:filledSlots>=totalSlots
                ?"rgba(125,200,50,0.1)":"white",
              borderRadius:20, padding:"24px",
              boxShadow:"0 2px 16px rgba(26,74,10,0.07)",
              border:`1.5px solid ${filledSlots>=totalSlots?V2.borderGreen:V2.borderSoft}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                <div style={{ width:64, height:64, borderRadius:16, flexShrink:0,
                  background:"rgba(125,200,50,0.1)", border:`2px solid ${V2.borderGreen}`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>
                  📖
                </div>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:V2.forestGreen, marginBottom:4 }}>
                    Field Guide Master
                  </div>
                  <div style={{ fontSize:13, color:V2.textMuted, marginBottom:8 }}>
                    {filledSlots >= totalSlots
                      ? "🎉 You completed the natural world collection!"
                      : `${filledSlots} / ${totalSlots} discoveries — ${totalSlots-filledSlots} remaining`}
                  </div>
                  <div style={{ height:6, background:"rgba(200,220,190,0.3)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pctOverall}%`, borderRadius:3,
                      background:V2.gradientGrassBtn, transition:"width 1s" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      {uploadModal && (
        <UploadModal
          collection={uploadModal.collection}
          slotNum={uploadModal.slotNum}
          username={username}
          onClose={()=>setUploadModal(null)}
          onSuccess={loadEntries}
        />
      )}
      {detailModal && (
        <SlotDetailModal entry={detailModal} onClose={()=>setDetailModal(null)} />
      )}

      {/* ── BOTTOM NAV ───────────────────────────────────────────────────────── */}
      <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:150,
        height:64, display:"flex", alignItems:"stretch",
        background:"rgba(255,255,255,0.96)", backdropFilter:"blur(20px)",
        borderTop:`1px solid ${V2.borderSoft}`,
        boxShadow:"0 -2px 20px rgba(26,74,10,0.08)" }}>
        <style>{`@media(min-width:768px){.fg-bottom-nav{display:none!important;}}`}</style>
        {[
          { href:"/",              label:"Home",       icon:"🏠" },
          { href:"/#upload",       label:"Log Proof",  icon:"🌿" },
          { href:`/u/${username||""}`, label:"Profile",icon:"👤" },
          { href:"/leaderboard",   label:"Leaderboard",icon:"🏆" },
          { href:"/field-guide",   label:"Field Guide",icon:"📖", active:true },
        ].map((tab,i)=>(
          <Link key={i} href={tab.href} style={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:3, textDecoration:"none",
            color:tab.active?V2.grassGreen:V2.midGray, fontSize:10,
            fontWeight:tab.active?700:500, fontFamily:V2.fontSans }}>
            <span style={{ fontSize:20 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}