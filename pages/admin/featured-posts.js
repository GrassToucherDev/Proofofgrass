// pages/admin/featured-posts.js
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)",
  olive:"#93a85a", gold:"#c8a84b", red:"#ef4444",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const EMPTY_FORM = { tweet_url:"", tweet_text:"", sort_order:0, active:true };

export default function FeaturedPostsAdmin() {
  const [authed,   setAuthed]   = useState(false);
  const [pw,       setPw]       = useState("");
  const [posts,    setPosts]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [editing,  setEditing]  = useState(null); // id of post being edited
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("FeaturedPosts")
      .select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:false});
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { if(authed) load(); }, [authed]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const handleSave = async () => {
    if(!form.tweet_url || !form.tweet_text) return flash("URL and tweet text are required.");
    setSaving(true);
    if(editing) {
      const { error } = await supabase.from("FeaturedPosts").update({
        tweet_url: form.tweet_url.trim(),
        tweet_text: form.tweet_text.trim(),
        sort_order: parseInt(form.sort_order)||0,
        active: form.active,
      }).eq("id", editing);
      if(error) flash("Error: "+error.message);
      else { flash("✓ Updated"); setEditing(null); setForm(EMPTY_FORM); }
    } else {
      const { error } = await supabase.from("FeaturedPosts").insert([{
        tweet_url: form.tweet_url.trim(),
        tweet_text: form.tweet_text.trim(),
        sort_order: parseInt(form.sort_order)||0,
        active: form.active,
      }]);
      if(error) flash("Error: "+error.message);
      else { flash("✓ Post added"); setForm(EMPTY_FORM); }
    }
    setSaving(false);
    load();
  };

  const handleEdit = (post) => {
    setEditing(post.id);
    setForm({ tweet_url:post.tweet_url, tweet_text:post.tweet_text||"", sort_order:post.sort_order||0, active:post.active });
    window.scrollTo(0,0);
  };

  const handleDelete = async (id) => {
    if(!confirm("Delete this post?")) return;
    await supabase.from("FeaturedPosts").delete().eq("id", id);
    flash("Deleted"); load();
  };

  const toggleActive = async (id, current) => {
    await supabase.from("FeaturedPosts").update({ active: !current }).eq("id", id);
    load();
  };

  const inputStyle = {
    width:"100%", background:"rgba(0,0,0,0.3)", border:`1px solid ${T.border}`,
    borderRadius:8, padding:"10px 12px", color:T.white, fontSize:13,
    outline:"none", boxSizing:"border-box", marginBottom:10,
  };

  const css = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}`;

  if(!authed) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style dangerouslySetInnerHTML={{__html:css}}/>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"32px 28px",width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:12}}>📌</div>
        <div style={{fontSize:14,color:T.muted,marginBottom:20}}>Featured Posts Admin</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&pw===ADMIN_PASSWORD)setAuthed(true);}}
          placeholder="Password" style={{...inputStyle,marginBottom:12}}/>
        <button onClick={()=>{if(pw===ADMIN_PASSWORD)setAuthed(true);}}
          style={{width:"100%",background:T.olive,color:"#0a0c08",border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          Enter
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:css}}/>
      <div style={{minHeight:"100vh",background:T.bg}}>
        <div style={{maxWidth:860,margin:"0 auto",padding:"32px 16px 80px"}}>

          {/* Header */}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:T.gold,marginBottom:8}}>Admin</div>
              <h1 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:32,fontWeight:700,color:T.white}}>
                Featured Posts
              </h1>
              <div style={{fontSize:12,color:T.dim,marginTop:6}}>
                Manage X posts shown on the dashboard carousel.
              </div>
            </div>
            <Link href="/admin/marketplace" style={{fontSize:11,color:T.dim,textDecoration:"none"}}>← Admin</Link>
          </div>

          {msg && (
            <div style={{background:"rgba(147,168,90,0.1)",border:"1px solid rgba(147,168,90,0.3)",
              borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:13,color:T.olive}}>
              {msg}
            </div>
          )}

          {/* Form */}
          <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"24px",marginBottom:28}}>
            <div style={{fontSize:14,fontWeight:700,color:T.white,marginBottom:16}}>
              {editing ? "✏️ Edit Post" : "➕ Add New Post"}
            </div>

            <label style={{fontSize:11,color:T.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>Tweet URL *</label>
            <input style={inputStyle} placeholder="https://twitter.com/XTouchGrass/status/..."
              value={form.tweet_url} onChange={e=>setForm(f=>({...f,tweet_url:e.target.value}))} />

            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:T.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>Tweet Text *</label>
            <textarea style={{...inputStyle,height:110,resize:"vertical"}}
              placeholder="Paste the tweet text here..."
              value={form.tweet_text} onChange={e=>setForm(f=>({...f,tweet_text:e.target.value}))} />

            <label style={{fontSize:11,color:T.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>Display Order (0 = first)</label>
              <input style={inputStyle} type="number" placeholder="0"
                value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:e.target.value}))} />
            </div>

            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <input type="checkbox" id="active" checked={form.active}
                onChange={e=>setForm(f=>({...f,active:e.target.checked}))} />
              <label htmlFor="active" style={{fontSize:13,color:T.muted,cursor:"pointer"}}>Active (show on dashboard)</label>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={handleSave} disabled={saving}
                style={{background:T.olive,color:"#0a0c08",border:"none",borderRadius:8,
                  padding:"11px 24px",fontSize:13,fontWeight:700,cursor:"pointer",flex:1}}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Post"}
              </button>
              {editing && (
                <button onClick={()=>{setEditing(null);setForm(EMPTY_FORM);}}
                  style={{background:"transparent",border:`1px solid ${T.border}`,color:T.muted,
                    borderRadius:8,padding:"11px 16px",fontSize:13,cursor:"pointer"}}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Posts list */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {loading && <div style={{fontSize:13,color:T.dim,textAlign:"center",padding:20}}>Loading…</div>}
            {!loading && posts.length===0 && (
              <div style={{fontSize:13,color:T.dim,textAlign:"center",padding:40}}>No posts yet — add one above.</div>
            )}
            {posts.map(post => (
              <div key={post.id} style={{
                background:T.bg2, border:`1px solid ${post.active?T.border:"rgba(255,255,255,0.02)"}`,
                borderRadius:12, padding:"16px 18px",
                opacity: post.active?1:0.5,
              }}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,fontWeight:700,color:post.active?T.olive:T.dim,
                        background:post.active?"rgba(147,168,90,0.1)":"transparent",
                        border:`1px solid ${post.active?"rgba(147,168,90,0.3)":T.border}`,
                        borderRadius:20,padding:"2px 10px",letterSpacing:"0.1em"}}>
                        {post.active?"ACTIVE":"HIDDEN"}
                      </span>
                      <span style={{fontSize:10,color:T.dim}}>Order: {post.sort_order}</span>
                    </div>
                    {post.tweet_text && (
                      <div style={{fontSize:12,color:"rgba(240,239,234,0.75)",marginBottom:6,lineHeight:1.5}}>
                        {post.tweet_text.length>120?post.tweet_text.slice(0,117)+"...":post.tweet_text}
                      </div>
                    )}
                    <a href={post.tweet_url} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:11,color:T.dim,textDecoration:"none",wordBreak:"break-all"}}>
                      {post.tweet_url}
                    </a>
                  </div>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <button onClick={()=>toggleActive(post.id,post.active)}
                      style={{background:"transparent",border:`1px solid ${T.border}`,
                        color:T.muted,borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer"}}>
                      {post.active?"Hide":"Show"}
                    </button>
                    <button onClick={()=>handleEdit(post)}
                      style={{background:"transparent",border:`1px solid ${T.border}`,
                        color:T.olive,borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer"}}>
                      Edit
                    </button>
                    <button onClick={()=>handleDelete(post.id)}
                      style={{background:"transparent",border:"1px solid rgba(239,68,68,0.3)",
                        color:T.red,borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer"}}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}