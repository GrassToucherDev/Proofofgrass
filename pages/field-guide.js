import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  borderGold:"rgba(200,168,75,0.4)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const COLLECTIONS = [
  {
    slug:"skies", name:"Skies", icon:"🌤",
    description:"Capture 10 unique sky moments — golden hour, storm clouds, clear blue, star trails, and more.",
    badge:"Sky Collector", badgeSlug:"field-guide-skies",
    color:"#67e8f9", glow:"rgba(103,232,249,0.15)",
    hint:"Try: sunrise, storm clouds, blue sky, stars, fog, rainbow, sunset, overcast, golden hour, moonlit",
  },
  {
    slug:"plants", name:"Plants & Foliage", icon:"🌿",
    description:"Document 10 unique plants and foliage — leaves, bark, roots, canopy, and everything in between.",
    badge:"Plant Collector", badgeSlug:"field-guide-plants",
    color:T.olive, glow:"rgba(147,168,90,0.15)",
    hint:"Try: leaf close-up, tree bark, roots, canopy, moss, fern, grass, vine, flower, fallen leaves",
  },
];

const TOTAL_SLOTS = 10;
const POINTS_PER_ENTRY = 25;
const POINTS_PER_COLLECTION = 500;

function getUsername() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("pog_username")?.replace(/@/g,"").toLowerCase().trim() || "";
}

function fmtDate(s) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-US",{ month:"short", day:"numeric" });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Collection Card ───────────────────────────────────────────────────────────
function CollectionCard({ collection, entries, progress, onAddEntry, isOwner }) {
  const filled   = entries.length;
  const complete = filled >= TOTAL_SLOTS;
  const pct      = Math.round((filled / TOTAL_SLOTS) * 100);

  return (
    <div style={{
      background:`linear-gradient(145deg,${T.bg2},${T.bg3})`,
      border:`1px solid ${complete ? collection.color+"60" : T.border}`,
      borderRadius:18, overflow:"hidden",
      boxShadow: complete ? `0 0 40px ${collection.glow}` : "none",
    }}>
      {/* Header */}
      <div style={{ padding:"22px 22px 16px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:12, marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ fontSize:36 }}>{collection.icon}</div>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:22, fontWeight:700, color:T.white,
                marginBottom:3 }}>{collection.name}</div>
              <div style={{ fontSize:11, color:T.dim, lineHeight:1.5 }}>
                {collection.description}
              </div>
            </div>
          </div>
          {/* Complete stamp */}
          {complete && (
            <div style={{ flexShrink:0, display:"flex", flexDirection:"column",
              alignItems:"center", gap:4,
              background:`${collection.color}12`,
              border:`1.5px solid ${collection.color}60`,
              borderRadius:12, padding:"10px 14px" }}>
              <span style={{ fontSize:20 }}>✦</span>
              <span style={{ fontSize:9, fontWeight:700, color:collection.color,
                letterSpacing:"0.12em", textTransform:"uppercase" }}>Complete</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:11, color:T.dim }}>
            {filled} / {TOTAL_SLOTS} entries
          </span>
          <span style={{ fontSize:11, fontWeight:700,
            color: complete ? collection.color : T.muted }}>{pct}%</span>
        </div>
        <div style={{ height:5, background:T.bg, borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`,
            background:`linear-gradient(90deg,${collection.color}99,${collection.color})`,
            borderRadius:3, transition:"width 1s ease" }} />
        </div>
      </div>

      {/* Photo grid — 10 slots */}
      <div style={{ padding:"16px 22px 20px" }}>
        <div style={{ display:"grid",
          gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:16 }}>
          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
            const entry = entries[i];
            return (
              <div key={i} style={{
                aspectRatio:"1",
                borderRadius:10,
                overflow:"hidden",
                border:`1px solid ${entry ? collection.color+"40" : T.border}`,
                background: entry ? "#000" : T.bg,
                position:"relative",
                cursor: !entry && isOwner && !complete ? "pointer" : "default",
              }}
                onClick={() => !entry && isOwner && !complete && onAddEntry(collection, i + 1)}>
                {entry ? (
                  <>
                    <img src={entry.photo_url} alt={entry.ai_label || ""}
                      loading="lazy"
                      style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    {/* Slot number overlay */}
                    <div style={{ position:"absolute", top:4, left:5,
                      fontSize:9, fontWeight:700,
                      color:"rgba(255,255,255,0.6)" }}>
                      {i + 1}
                    </div>
                  </>
                ) : (
                  <div style={{ width:"100%", height:"100%",
                    display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center", gap:3 }}>
                    <span style={{ fontSize:14, opacity:0.2 }}>+</span>
                    <span style={{ fontSize:8, color:T.dim }}>#{i + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hint */}
        {!complete && isOwner && (
          <div style={{ fontSize:10, color:T.dim, lineHeight:1.6,
            padding:"8px 12px", background:T.bg, borderRadius:8,
            border:`1px solid ${T.border}`, marginBottom:12 }}>
            💡 {collection.hint}
          </div>
        )}

        {/* Add entry button */}
        {isOwner && !complete && (
          <button onClick={() => onAddEntry(collection, filled + 1)}
            style={{ width:"100%", background:`${collection.color}15`,
              color:collection.color,
              border:`1px solid ${collection.color}40`,
              borderRadius:10, padding:"11px",
              fontSize:13, fontWeight:700, cursor:"pointer",
              transition:"all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background=`${collection.color}25`}
            onMouseLeave={e => e.currentTarget.style.background=`${collection.color}15`}>
            + Add Entry to {collection.name}
          </button>
        )}

        {/* Entry labels */}
        {entries.length > 0 && (
          <div style={{ marginTop:12, display:"flex", flexWrap:"wrap", gap:6 }}>
            {entries.map((e, i) => (
              <span key={i} style={{ fontSize:10, color:T.muted,
                background:T.bg, border:`1px solid ${T.border}`,
                borderRadius:20, padding:"3px 9px" }}>
                {e.ai_label || `Entry ${i + 1}`}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ collection, slotNumber, existingLabels, username, onClose, onSuccess }) {
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [status,     setStatus]     = useState(null); // null|classifying|uploading|success|error|rejected
  const [result,     setResult]     = useState(null);
  const [errMsg,     setErrMsg]     = useState("");
  const [dragging,   setDragging]   = useState(false);
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus(null); setResult(null); setErrMsg("");
  };

  const handleSubmit = async () => {
    if (!file || !username) return;
    setStatus("classifying");
    setErrMsg("");

    try {
      // Convert to base64 for Claude Vision
      const base64 = await fileToBase64(file);

      // Call classification API
      const classRes = await fetch("/api/field-guide/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64:    base64,
          mimeType:       file.type,
          collectionSlug: collection.slug,
          existingLabels,
        }),
      });

      const classification = await classRes.json();

      if (!classRes.ok) throw new Error(classification.error || "Classification failed");

      if (!classification.approved) {
        setStatus("rejected");
        setResult(classification);
        return;
      }

      // ── Upload photo ────────────────────────────────────────────────
      setStatus("uploading");
      const ext  = file.name.split(".").pop() || "jpg";
      const storagePath = `${username}/${collection.slug}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("field-guide-photos")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      const { data: urlData } = supabase.storage
        .from("field-guide-photos").getPublicUrl(storagePath);

      // ── Insert entry ─────────────────────────────────────────────────
      const { error: entryErr } = await supabase
        .from("FieldGuideEntries")
        .insert({
          username,
          collection_slug: collection.slug,
          slot_number:     slotNumber,
          photo_url:       urlData.publicUrl,
          storage_path:    storagePath,
          ai_label:        classification.label || "entry",
          ai_confidence:   classification.confidence || "medium",
          status:          "approved",
        });
      if (entryErr) throw new Error(`Entry save failed: ${entryErr.message}`);

      // ── Upsert progress ──────────────────────────────────────────────
      const newFilled  = existingLabels.length + 1;
      const isComplete = newFilled >= TOTAL_SLOTS;
      const { error: progErr } = await supabase
        .from("FieldGuideProgress")
        .upsert({
          username,
          collection_slug: collection.slug,
          slots_filled:    newFilled,
          completed_at:    isComplete ? new Date().toISOString() : null,
          badge_awarded:   isComplete,
        }, { onConflict: "username,collection_slug" });
      if (progErr) console.warn("progress upsert:", progErr.message);

      // ── Grass Score ──────────────────────────────────────────────────
      const pts = isComplete
        ? POINTS_PER_ENTRY + POINTS_PER_COLLECTION
        : POINTS_PER_ENTRY;

      const { data: prof } = await supabase
        .from("Profiles")
        .select("grass_score")
        .eq("username", username)
        .maybeSingle();

      const { error: scoreErr } = await supabase
        .from("Profiles")
        .update({ grass_score: (prof?.grass_score || 0) + pts })
        .eq("username", username);
      if (scoreErr) console.warn("grass_score update:", scoreErr.message);

      // ── ScoreEvents (non-fatal) ──────────────────────────────────────
      try {
        await supabase.from("ScoreEvents").insert({
          username,
          event_type: "field_guide_entry",
          points:     pts,
          source_id:  null,
          metadata: {
            collection: collection.slug,
            slot:       slotNumber,
            label:      classification.label,
            complete:   isComplete,
          },
        });
      } catch(e) { console.warn("ScoreEvents:", e.message); }

      // ── Mastery check (non-fatal) ────────────────────────────────────
      if (isComplete) {
        try {
          const { data: allCols }  = await supabase
            .from("FieldGuideCollections").select("slug").eq("active", true);
          const { data: allProg }  = await supabase
            .from("FieldGuideProgress").select("collection_slug,slots_filled")
            .eq("username", username);
          const completeSet = new Set(
            (allProg || []).filter(p => p.slots_filled >= TOTAL_SLOTS).map(p => p.collection_slug)
          );
          completeSet.add(collection.slug);
          const hasMastery     = (allCols || []).every(c => completeSet.has(c.slug));
          const completedCount = completeSet.size;
          await supabase.from("Profiles").update({
            field_guide_mastery:              hasMastery,
            field_guide_mastery_at:           hasMastery ? new Date().toISOString() : null,
            field_guide_collections_complete: completedCount,
          }).eq("username", username);
        } catch(e) { console.warn("mastery check:", e.message); }
      }

      setStatus("success");
      setResult({ ...classification, points: pts, complete: isComplete });
      onSuccess?.();
    } catch(e) {
      setErrMsg(e.message || "Something went wrong.");
      setStatus("error");
    }
  };

  return (
    <>
      <div onClick={status === "classifying" || status === "uploading" ? undefined : onClose}
        style={{ position:"fixed", inset:0, zIndex:998,
          background:"rgba(0,0,0,0.75)", backdropFilter:"blur(5px)" }} />
      <div style={{ position:"fixed", left:"50%", top:"50%",
        transform:"translate(-50%,-50%)", zIndex:999,
        width:"min(500px,95vw)", maxHeight:"90vh", overflowY:"auto",
        background:T.bg2, border:`1px solid ${collection.color}40`,
        borderRadius:20, padding:"26px 22px",
        boxShadow:`0 0 60px ${collection.glow}, 0 20px 60px rgba(0,0,0,0.7)` }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <span style={{ fontSize:28 }}>{collection.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:T.dim, marginBottom:2 }}>
              {collection.name} — Slot #{slotNumber}
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:18, fontWeight:700, color:T.white }}>
              Add New Entry
            </div>
          </div>
          {status !== "classifying" && status !== "uploading" && (
            <button onClick={onClose}
              style={{ background:"none", border:"none", color:T.dim,
                cursor:"pointer", fontSize:20, lineHeight:1 }}>×</button>
          )}
        </div>

        {status === "success" ? (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>
              {result?.complete ? "🏅" : "✅"}
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:22, fontWeight:700, color:collection.color,
              marginBottom:8 }}>
              {result?.complete ? `${collection.name} Complete!` : "Entry Added!"}
            </div>
            <div style={{ fontSize:13, color:T.muted, marginBottom:6 }}>
              "{result?.label}"
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:T.olive, marginBottom:20 }}>
              +{result?.points} Grass Score
              {result?.complete && ` (includes ${POINTS_PER_COLLECTION} completion bonus!)`}
            </div>
            <button onClick={onClose}
              style={{ background:collection.color, color:"#0a0c08",
                border:"none", borderRadius:10, padding:"11px 28px",
                fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {result?.complete ? "🎉 Awesome!" : "Nice! Keep going"}
            </button>
          </div>
        ) : status === "rejected" ? (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#ef4444", marginBottom:8 }}>
              Not Accepted
            </div>
            <div style={{ fontSize:13, color:T.muted, marginBottom:6, lineHeight:1.6 }}>
              {result?.reason}
            </div>
            {result?.confidence === "low" && (
              <div style={{ fontSize:11, color:T.dim, marginBottom:16 }}>
                Try a clearer photo where the subject is more prominent.
              </div>
            )}
            <button onClick={() => { setStatus(null); setFile(null); setPreview(null); }}
              style={{ background:T.bg3, border:`1px solid ${T.border}`,
                color:T.dim, borderRadius:10, padding:"10px 22px",
                fontSize:13, cursor:"pointer" }}>
              Try a Different Photo
            </button>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => !preview && fileRef.current?.click()}
              style={{ border:`1.5px dashed ${dragging ? collection.color : T.border}`,
                borderRadius:12, padding: preview ? 0 : "36px 20px",
                textAlign:"center", cursor: preview ? "default" : "pointer",
                background: dragging ? `${collection.color}08` : T.bg3,
                overflow:"hidden", marginBottom:14,
                transition:"all 0.2s" }}>
              {preview ? (
                <div style={{ position:"relative" }}>
                  <img src={preview} alt="Preview"
                    style={{ width:"100%", maxHeight:260,
                      objectFit:"cover", display:"block", borderRadius:10 }} />
                  <button onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setStatus(null); }}
                    style={{ position:"absolute", top:8, right:8,
                      background:"rgba(0,0,0,0.6)", border:"none",
                      borderRadius:6, color:"#fff", padding:"4px 8px",
                      fontSize:11, cursor:"pointer" }}>
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:36, marginBottom:8, opacity:0.3 }}>
                    {collection.icon}
                  </div>
                  <div style={{ fontSize:13, color:T.muted, marginBottom:4 }}>
                    Drag & drop or tap to upload
                  </div>
                  <div style={{ fontSize:10, color:T.dim }}>
                    JPG, PNG, WEBP · Max 10MB
                  </div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*"
              style={{ display:"none" }}
              onChange={e => handleFile(e.target.files[0])} />

            {/* Hint */}
            <div style={{ fontSize:10, color:T.dim, lineHeight:1.6,
              marginBottom:14, padding:"8px 12px",
              background:T.bg, borderRadius:8, border:`1px solid ${T.border}` }}>
              💡 {collection.hint}
            </div>

            {/* Existing labels shown to user */}
            {existingLabels.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, color:T.dim, marginBottom:6,
                  textTransform:"uppercase", letterSpacing:"0.1em" }}>
                  Your existing entries (new photo must be different):
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {existingLabels.map((l, i) => (
                    <span key={i} style={{ fontSize:10, color:T.muted,
                      background:T.bg3, border:`1px solid ${T.border}`,
                      borderRadius:20, padding:"2px 8px" }}>{l}</span>
                  ))}
                </div>
              </div>
            )}

            {errMsg && (
              <div style={{ fontSize:11, color:"#ef4444", marginBottom:10 }}>{errMsg}</div>
            )}

            <button onClick={handleSubmit}
              disabled={!file || status === "classifying" || status === "uploading"}
              style={{ width:"100%",
                background: file ? collection.color : T.bg3,
                color: file ? "#0a0c08" : T.dim,
                border:"none", borderRadius:10, padding:"13px",
                fontSize:13, fontWeight:700, cursor: file ? "pointer" : "default",
                opacity: status === "classifying" || status === "uploading" ? 0.7 : 1,
                transition:"all 0.2s" }}>
              {status === "classifying" ? "🔍 Claude is reviewing your photo…"
                : status === "uploading"  ? "Saving entry…"
                : "Submit for Review"}
            </button>

            {(status === "classifying" || status === "uploading") && (
              <div style={{ fontSize:11, color:T.dim, textAlign:"center",
                marginTop:8, lineHeight:1.5 }}>
                {status === "classifying"
                  ? "Claude Vision is checking your photo qualifies and is unique."
                  : "Uploading your photo…"}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FieldGuidePage() {
  const [username,    setUsername]    = useState("");
  const [entries,     setEntries]     = useState({}); // { slug: [...] }
  const [progress,    setProgress]    = useState({}); // { slug: {...} }
  const [communityFeed, setCommunityFeed] = useState([]);
  const [masteryUsers,  setMasteryUsers]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null); // { collection, slotNumber }
  const [profileData, setProfileData] = useState(null);

  const isOwner = !!username;

  const load = useCallback(async (u) => {
    setLoading(true);
    const slugs = COLLECTIONS.map(c => c.slug);

    const promises = [
      // Community feed — recent approved entries
      supabase.from("FieldGuideEntries")
        .select("username,collection_slug,photo_url,ai_label,submitted_at")
        .eq("status","approved")
        .order("submitted_at", { ascending:false })
        .limit(20),
      // Mastery holders
      supabase.from("Profiles")
        .select("username,field_guide_mastery_at")
        .eq("field_guide_mastery", true)
        .order("field_guide_mastery_at", { ascending:false })
        .limit(10),
    ];

    if (u) {
      promises.push(
        supabase.from("FieldGuideEntries")
          .select("*")
          .eq("username", u)
          .in("collection_slug", slugs)
          .order("slot_number", { ascending:true }),
        supabase.from("FieldGuideProgress")
          .select("*")
          .eq("username", u),
        supabase.from("Profiles")
          .select("field_guide_mastery,field_guide_collections_complete")
          .eq("username", u)
          .maybeSingle(),
      );
    }

    const results = await Promise.all(promises);
    const [feedRes, masteryRes, entriesRes, progressRes, profileRes] = results;

    setCommunityFeed(feedRes.data || []);
    setMasteryUsers(masteryRes.data || []);

    if (u && entriesRes) {
      const bySlug = {};
      slugs.forEach(s => { bySlug[s] = []; });
      (entriesRes.data || []).forEach(e => {
        if (!bySlug[e.collection_slug]) bySlug[e.collection_slug] = [];
        bySlug[e.collection_slug].push(e);
      });
      setEntries(bySlug);

      const bySlugP = {};
      (progressRes?.data || []).forEach(p => { bySlugP[p.collection_slug] = p; });
      setProgress(bySlugP);

      setProfileData(profileRes?.data || null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const u = getUsername();
    setUsername(u);
    load(u);
  }, [load]);

  const handleAddEntry = (collection, slotNumber) => {
    setModal({ collection, slotNumber });
  };

  const handleModalSuccess = () => {
    // Reload data after successful entry
    setTimeout(() => {
      load(username);
      setModal(null);
    }, 2000);
  };

  const totalEntriesUser = Object.values(entries).flat().length;
  const completedCollections = COLLECTIONS.filter(c =>
    (entries[c.slug]?.length || 0) >= TOTAL_SLOTS
  ).length;
  const hasMastery = profileData?.field_guide_mastery || false;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
    .fade{animation:fadeUp 0.5s ease both;}
    .feed-card{transition:transform 0.15s,box-shadow 0.15s;}
    .feed-card:hover{transform:translateY(-2px);}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:100,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center",
            gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt=""
              style={{ width:24, height:24, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:16, fontWeight:700, color:T.white }}>Touch Grass</span>
          </Link>
          <Link href="/" style={{ fontSize:11, color:T.olive, textDecoration:"none" }}>
            ← Dashboard
          </Link>
        </nav>

        {/* HERO */}
        <section style={{ position:"relative",
          padding:"56px clamp(14px,5vw,64px) 48px",
          background:"linear-gradient(160deg,#080e06,#0e1a0a 40%,#080a06)",
          borderBottom:`1px solid ${T.border}`, overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none",
            backgroundImage:"radial-gradient(ellipse at 70% 40%,rgba(147,168,90,0.07),transparent 55%),radial-gradient(ellipse at 20% 70%,rgba(103,232,249,0.05),transparent 50%)" }} />
          <div style={{ position:"relative", maxWidth:660, margin:"0 auto",
            textAlign:"center" }} className="fade">
            <div style={{ fontSize:10, letterSpacing:"0.22em",
              textTransform:"uppercase", color:T.olive, fontWeight:600, marginBottom:14 }}>
              Proof of Grass
            </div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:"clamp(38px,6vw,68px)", fontWeight:700, color:T.white,
              lineHeight:1, letterSpacing:"-0.02em", marginBottom:16 }}>
              📖 Field Guide
            </h1>
            <p style={{ fontSize:"clamp(13px,1.8vw,15px)", color:T.muted,
              lineHeight:1.7, maxWidth:500, margin:"0 auto 28px", fontWeight:300 }}>
              Explore, photograph, and collect the natural world.
              Fill every slot in every collection to earn the Field Guide Master badge.
            </p>

            {/* User stats if signed in */}
            {username && !loading && (
              <div style={{ display:"inline-flex", gap:24,
                background:"rgba(255,255,255,0.04)",
                border:`1px solid ${T.border}`, borderRadius:12,
                padding:"14px 24px" }}>
                {[
                  ["Entries",      totalEntriesUser],
                  ["Collections",  `${completedCollections}/${COLLECTIONS.length}`],
                  ["Mastery",      hasMastery ? "✦ Earned" : "Locked"],
                ].map(([label, val]) => (
                  <div key={label} style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                      fontSize:22, fontWeight:700,
                      color: label === "Mastery" && hasMastery ? T.gold : T.white }}>
                      {val}
                    </div>
                    <div style={{ fontSize:9, color:T.dim, textTransform:"uppercase",
                      letterSpacing:"0.1em", marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {!username && (
              <Link href="/" style={{ display:"inline-flex", alignItems:"center",
                gap:8, background:T.olive, color:"#0a0c08",
                borderRadius:10, padding:"12px 24px", fontSize:13, fontWeight:700,
                textDecoration:"none" }}>
                Sign in to start collecting →
              </Link>
            )}
          </div>
        </section>

        <div style={{ maxWidth:800, margin:"0 auto",
          padding:"40px clamp(14px,5vw,32px) 80px" }}>

          {/* Mastery badge — shown if earned */}
          {hasMastery && (
            <div className="fade" style={{ marginBottom:32, padding:"20px 24px",
              background:"linear-gradient(135deg,rgba(200,168,75,0.1),rgba(200,168,75,0.04))",
              border:`1px solid ${T.borderGold}`, borderRadius:16,
              display:"flex", alignItems:"center", gap:16,
              boxShadow:`0 0 40px rgba(200,168,75,0.15)` }}>
              <div style={{ fontSize:44 }}>🏅</div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em",
                  textTransform:"uppercase", color:T.gold, marginBottom:4 }}>
                  Field Guide Master
                </div>
                <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:20, fontWeight:700, color:T.white, marginBottom:4 }}>
                  All collections complete
                </div>
                <div style={{ fontSize:12, color:T.dim }}>
                  You have documented every collection in the Field Guide.
                </div>
              </div>
            </div>
          )}

          {/* COLLECTIONS */}
          <div style={{ display:"flex", flexDirection:"column", gap:24, marginBottom:48 }}>
            {COLLECTIONS.map(collection => (
              <CollectionCard
                key={collection.slug}
                collection={collection}
                entries={entries[collection.slug] || []}
                progress={progress[collection.slug] || null}
                onAddEntry={handleAddEntry}
                isOwner={isOwner}
              />
            ))}
          </div>

          {/* HOW IT WORKS */}
          <div style={{ marginBottom:48 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
              textTransform:"uppercase", color:T.dim, marginBottom:16 }}>
              How It Works
            </div>
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 }}>
              {[
                { n:"01", icon:"📸", label:"Go outside", desc:"Find something that fits a collection — a sky, a plant, wildlife." },
                { n:"02", icon:"📤", label:"Upload your photo", desc:"Submit it to the collection slot you want to fill." },
                { n:"03", icon:"🔍", label:"Claude verifies it", desc:"AI checks the photo matches the collection and is visually unique." },
                { n:"04", icon:"🏅", label:"Earn your badge", desc:"Fill all 10 slots to complete a collection and earn its badge." },
                { n:"05", icon:"🌿", label:"Earn Grass Score", desc:"25 pts per entry, 500 bonus pts when you complete a collection." },
              ].map(step => (
                <div key={step.n} style={{ background:T.bg2,
                  border:`1px solid ${T.border}`, borderRadius:12,
                  padding:"16px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center",
                    gap:8, marginBottom:8 }}>
                    <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                      fontSize:20, fontWeight:700, color:`${T.olive}40` }}>{step.n}</span>
                    <span style={{ fontSize:18 }}>{step.icon}</span>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.white,
                    marginBottom:4 }}>{step.label}</div>
                  <div style={{ fontSize:11, color:T.dim, lineHeight:1.5 }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* MASTERY HOLDERS */}
          {masteryUsers.length > 0 && (
            <div style={{ marginBottom:48 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.dim, marginBottom:16 }}>
                🏅 Field Guide Masters
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {masteryUsers.map((u, i) => (
                  <Link key={u.username} href={`/u/${u.username}`}
                    style={{ display:"flex", alignItems:"center", gap:12,
                      padding:"11px 16px", background:T.bg2,
                      border:`1px solid ${T.borderGold}`, borderRadius:10,
                      textDecoration:"none",
                      boxShadow:"0 0 16px rgba(200,168,75,0.06)" }}>
                    <span style={{ fontSize:16 }}>🏅</span>
                    <span style={{ fontSize:13, fontWeight:700, color:T.gold,
                      flex:1 }}>@{u.username}</span>
                    <span style={{ fontSize:10, color:T.dim }}>
                      {fmtDate(u.field_guide_mastery_at)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* COMMUNITY FEED */}
          {communityFeed.length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.dim, marginBottom:16 }}>
                🌿 Recent Finds
              </div>
              <div style={{ display:"grid",
                gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
                {communityFeed.map((entry, i) => {
                  const col = COLLECTIONS.find(c => c.slug === entry.collection_slug);
                  return (
                    <Link key={i} href={`/u/${entry.username}`}
                      className="feed-card"
                      style={{ display:"block", textDecoration:"none",
                        borderRadius:12, overflow:"hidden",
                        border:`1px solid ${T.border}`,
                        background:"#000",
                        boxShadow:"0 4px 16px rgba(0,0,0,0.4)" }}>
                      <div style={{ position:"relative", aspectRatio:"1" }}>
                        <img src={entry.photo_url} alt={entry.ai_label || ""}
                          loading="lazy"
                          style={{ width:"100%", height:"100%",
                            objectFit:"cover", display:"block" }} />
                        <div style={{ position:"absolute", inset:0,
                          background:"linear-gradient(180deg,transparent 50%,rgba(0,0,0,0.8))",
                          display:"flex", flexDirection:"column",
                          justifyContent:"flex-end", padding:"8px 8px 7px" }}>
                          <div style={{ fontSize:9, fontWeight:700,
                            color: col?.color || T.olive,
                            letterSpacing:"0.06em" }}>
                            {col?.icon} {col?.name}
                          </div>
                          <div style={{ fontSize:10, fontWeight:600,
                            color:T.white }}>@{entry.username}</div>
                          {entry.ai_label && (
                            <div style={{ fontSize:8, color:"rgba(255,255,255,0.5)",
                              marginTop:1, overflow:"hidden",
                              textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {entry.ai_label}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* UPLOAD MODAL */}
      {modal && (
        <UploadModal
          collection={modal.collection}
          slotNumber={modal.slotNumber}
          existingLabels={(entries[modal.collection.slug] || []).map(e => e.ai_label).filter(Boolean)}
          username={username}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}