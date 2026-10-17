// pages/wago-drops/admin.js
import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";

import { T } from "../../utils/wagoTheme";
import Wago from "../../components/wago-drops/Wago";

function Input({label,...props}){
  return(
    <label style={{display:"block",marginBottom:14}}>
      <span style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5}}>{label}</span>
      <input style={{width:"100%",boxSizing:"border-box",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:T.white,outline:"none"}} {...props}/>
    </label>
  );
}

function Select({label,children,...props}){
  return(
    <label style={{display:"block",marginBottom:14}}>
      <span style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5}}>{label}</span>
      <select style={{width:"100%",boxSizing:"border-box",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:T.white,outline:"none"}} {...props}>{children}</select>
    </label>
  );
}

const MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const BLANK_CAMPAIGN = {name:"",description:"",image_url:"",reward_type:"spl_token",reward_amount:"",reward_token_mint:MINT,reveal_radius_m:100,claim_radius_m:25,proof_bonus_enabled:false,proof_bonus_amount:"",rarity:"common",proof_bonus_tickets:"",starts_at:"",ends_at:"",status:"active"};

function CampaignForm({initial, onSave, adminSecret, submitLabel="Save"}){
  const [form, setForm] = useState(initial || BLANK_CAMPAIGN);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k,v) => setForm(prev=>({...prev,[k]:v}));

  useEffect(()=>{ setForm(initial || BLANK_CAMPAIGN); },[initial]);

  async function submit(e){
    e.preventDefault(); setLoading(true); setMsg(null);
    try{
      const isEdit = !!initial?.id;
      const url = isEdit ? "/api/wago-drops/admin/update-campaign" : "/api/wago-drops/admin/create-campaign";
      const res = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,_adminSecret:adminSecret})});
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||"Failed");
      setMsg({ok:true,text:isEdit?"Campaign updated.":"Campaign created."});
      onSave && onSave(data.campaign);
    }catch(err){ setMsg({ok:false,text:err.message}); }
    finally{ setLoading(false); }
  }

  return(
    <form onSubmit={submit}>
      <Input label="Campaign Name *" required value={form.name} onChange={e=>set("name",e.target.value)}/>
      <Input label="Description" value={form.description||""} onChange={e=>set("description",e.target.value)}/>
      <Input label="Image URL" value={form.image_url||""} onChange={e=>set("image_url",e.target.value)}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Reward Amount *" type="number" required value={form.reward_amount} onChange={e=>set("reward_amount",e.target.value)}/>
        <Input label="Token Mint" value={form.reward_token_mint||""} onChange={e=>set("reward_token_mint",e.target.value)}/>
        <Input label="Reveal Radius (m)" type="number" value={form.reveal_radius_m} onChange={e=>set("reveal_radius_m",Number(e.target.value))}/>
        <Input label="Claim Radius (m)" type="number" value={form.claim_radius_m} onChange={e=>set("claim_radius_m",Number(e.target.value))}/>
        <Input label="Starts At (UTC)" type="datetime-local" value={form.starts_at||""} onChange={e=>set("starts_at",e.target.value)}/>
        <Input label="Ends At (UTC)" type="datetime-local" value={form.ends_at||""} onChange={e=>set("ends_at",e.target.value)}/>
      </div>
      <Select label="Status" value={form.status||"active"} onChange={e=>set("status",e.target.value)}>
        <option value="active">Active</option>
        <option value="draft">Draft</option>
        <option value="paused">Paused</option>
        <option value="ended">Ended</option>
      </Select>
      <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,cursor:"pointer"}}>
        <input type="checkbox" checked={!!form.proof_bonus_enabled} onChange={e=>set("proof_bonus_enabled",e.target.checked)}/>
        <span style={{fontSize:13,color:T.muted}}>Enable Proof bonus (photo + X post → Grass Tickets)</span>
      </label>
      <Select label="Rarity (sets default Grass Tickets: 2 / 5 / 10 / 25)" value={form.rarity||"common"} onChange={e=>set("rarity",e.target.value)}>
        <option value="common">Common · 2 tickets</option>
        <option value="rare">Rare · 5 tickets</option>
        <option value="epic">Epic · 10 tickets</option>
        <option value="legendary">Legendary · 25 tickets</option>
      </Select>
      {form.proof_bonus_enabled && <Input label="Grass Tickets override (optional)" type="number" value={form.proof_bonus_tickets||""} onChange={e=>set("proof_bonus_tickets",e.target.value)}/>}
      {msg && <div style={{fontSize:13,color:msg.ok?T.green:T.red,marginBottom:12,padding:"8px 12px",background:msg.ok?"rgba(74,222,128,0.07)":"rgba(248,113,113,0.07)",borderRadius:8}}>{msg.text}</div>}
      <button type="submit" disabled={loading} style={{width:"100%",background:T.olive,color:T.bg,border:"none",borderRadius:9,padding:"11px",fontSize:14,fontWeight:700,cursor:loading?"default":"pointer"}}>{loading?"Saving…":submitLabel}</button>
    </form>
  );
}

function CampaignsTab({campaigns, setCampaigns, adminSecret}){
  const [editing, setEditing] = useState(null); // null = create mode, campaign obj = edit mode

  function handleSave(updated){
    if(editing){
      setCampaigns(prev => prev.map(c => c.id === updated.id ? {...c,...updated} : c));
      setEditing(null);
    } else {
      setCampaigns(prev => [updated, ...prev]);
    }
  }

  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:32}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <h3 style={{margin:0,color:T.white}}>{editing ? `Edit: ${editing.name}` : "Create Campaign"}</h3>
          {editing && <button onClick={()=>setEditing(null)} style={{fontSize:12,color:T.dim,background:"none",border:`1px solid ${T.border}`,borderRadius:6,padding:"3px 10px",cursor:"pointer"}}>← New</button>}
        </div>
        <CampaignForm
          key={editing?.id || "new"}
          initial={editing}
          onSave={handleSave}
          adminSecret={adminSecret}
          submitLabel={editing ? "Update Campaign" : "Create Campaign"}
        />
      </div>
      <div>
        <h3 style={{margin:"0 0 16px",color:T.white}}>All Campaigns</h3>
        {campaigns.length === 0
          ? <p style={{color:T.dim,fontSize:13}}>No campaigns yet.</p>
          : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {campaigns.map(c=>(
                <div key={c.id} style={{background:T.card,border:`1px solid ${editing?.id===c.id?T.olive:T.border}`,borderRadius:10,padding:"12px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:T.white}}>{c.name}</div>
                      <div style={{fontSize:11,color:T.dim,marginTop:2}}>{c.status} · {c.location_count??0} pins{c.proof_bonus_enabled?` · ${(c.rarity||"common")} · 🎟️ ${c.proof_bonus_tickets||({common:2,rare:5,epic:10,legendary:25}[c.rarity||"common"])}`:""}</div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:11,color:T.olive,background:"rgba(91,166,34,0.12)",borderRadius:5,padding:"3px 8px"}}>{c.status}</span>
                      <button onClick={()=>setEditing(c)} style={{fontSize:12,color:T.white,background:"rgba(13,42,5,0.08)",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Edit</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

function PinManager({campaigns, adminSecret}){
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [mode, setMode] = useState("place"); // "place" | "manage"
  const [pendingPins, setPendingPins] = useState([]);
  const [hint, setHint] = useState("");
  const [maxClaims, setMaxClaims] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const [editingPin, setEditingPin] = useState(null);
  const [zoomLvl, setZoomLvl] = useState(4);
  const [locBusy, setLocBusy] = useState(false);
  const pendingMarkersRef = useRef([]);
  const mapboxRef = useRef(null);
  const modeRef = useRef("place");

  // Add a pending pin (shared by map clicks and "Use my current location").
  function placePin(lat,lng){
    const mapboxgl = mapboxRef.current, map = mapRef.current;
    if(!mapboxgl || !map) return;
    setPendingPins(prev=>[...prev,{lat,lng}]);
    const el=document.createElement("div");
    el.style.cssText=`width:26px;height:26px;border-radius:50%;background:#f97316;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;`;
    el.textContent="📍";
    pendingMarkersRef.current.push(new mapboxgl.Marker({element:el}).setLngLat([lng,lat]).addTo(map));
  }
  function clearPending(){
    pendingMarkersRef.current.forEach(m=>m.remove());
    pendingMarkersRef.current=[];
    setPendingPins([]);
  }

  // Drop a pin exactly where you are standing: sample GPS for a few seconds and keep the best fix.
  function useMyLocation(){
    if(!navigator.geolocation){ setMsg({ok:false,text:"Location isn't available in this browser."}); return; }
    setLocBusy(true); setMsg(null);
    let best=null;
    const finish=()=>{
      navigator.geolocation.clearWatch(id); clearTimeout(timer); setLocBusy(false);
      if(!best){ setMsg({ok:false,text:"Couldn't get a GPS fix. Allow location access and try again outdoors."}); return; }
      const {latitude:lat,longitude:lng,accuracy}=best.coords;
      mapRef.current?.flyTo({center:[lng,lat],zoom:19,duration:800});
      placePin(lat,lng);
      const acc=Math.round(accuracy);
      setMsg(acc<=15
        ? {ok:true,text:`Pin placed at your location (GPS accuracy ±${acc}m).`}
        : {ok:false,text:`Pin placed, but GPS accuracy is only ±${acc}m. Step outside / away from buildings, hit Clear and try again for a tighter pin.`});
    };
    const id=navigator.geolocation.watchPosition(
      p=>{ if(!best||p.coords.accuracy<best.coords.accuracy) best=p; if(p.coords.accuracy<=5) finish(); },
      ()=>finish(),
      {enableHighAccuracy:true,maximumAge:0,timeout:15000}
    );
    const timer=setTimeout(finish,8000);
  }

  useEffect(()=>{
    import("mapbox-gl").then(({default:mapboxgl})=>{
      mapboxRef.current=mapboxgl;
      import("mapbox-gl/dist/mapbox-gl.css").catch(()=>{});
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const map = new mapboxgl.Map({container:mapContainer.current,style:"mapbox://styles/mapbox/satellite-streets-v12",center:[-98.5795,39.8283],zoom:4});
      map.addControl(new mapboxgl.NavigationControl(),"top-right");
      map.addControl(new mapboxgl.GeolocateControl({positionOptions:{enableHighAccuracy:true}}),"top-right");
      map.on("click",(e)=>{
        if(modeRef.current !== "place") return;
        const{lat,lng}=e.lngLat;
        placePin(lat,lng);
      });
      map.on("zoom",()=>setZoomLvl(map.getZoom()));
      mapRef.current = map;
    });
    return()=>mapRef.current?.remove();
  },[]);

  // Sync mode ref so map click handler sees current mode
  useEffect(()=>{ modeRef.current = mode; },[mode]);

  async function loadLocations(campId){
    if(!campId) return;
    setLoadingLocs(true);
    const res = await fetch(`/api/wago-drops/admin/locations-by-campaign?campaignId=${campId}&_s=${encodeURIComponent(adminSecret)}`);
    const data = await res.json();
    setLocations(data.locations || []);
    setLoadingLocs(false);

    // Draw existing pins on map
    markersRef.current.forEach(m=>m.remove());
    markersRef.current = [];
    if(mapRef.current){
      (data.locations||[]).forEach(loc=>{
        import("mapbox-gl").then(({default:mapboxgl})=>{
          const el=document.createElement("div");
          el.style.cssText=`width:22px;height:22px;border-radius:50%;background:${loc.is_active?"#5ba622":"#555"};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;`;
          el.textContent="📌";
          const marker = new mapboxgl.Marker({element:el}).setLngLat([loc.lng,loc.lat]).addTo(mapRef.current);
          markersRef.current.push(marker);
        });
      });
    }
  }

  function onCampaignChange(id){
    setSelectedCampaign(id);
    clearPending();
    setLocations([]);
    setEditingPin(null);
    if(id) loadLocations(id);
  }

  async function savePins(){
    if(!selectedCampaign || pendingPins.length===0) return;
    setSaving(true); setMsg(null);
    try{
      const res = await fetch("/api/wago-drops/admin/add-locations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:selectedCampaign,locations:pendingPins.map(p=>({lat:p.lat,lng:p.lng,hint:hint||null,max_claims:maxClaims||null})),_adminSecret:adminSecret})});
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||"Failed");
      setMsg({ok:true,text:`${pendingPins.length} pin${pendingPins.length!==1?"s":""} added.`});
      clearPending();
      loadLocations(selectedCampaign);
    }catch(err){ setMsg({ok:false,text:err.message}); }
    finally{ setSaving(false); }
  }

  async function updatePin(e){
    e.preventDefault();
    setSaving(true); setMsg(null);
    try{
      const res = await fetch("/api/wago-drops/admin/update-location",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...editingPin,_adminSecret:adminSecret})});
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||"Failed");
      setMsg({ok:true,text:"Pin updated."});
      setEditingPin(null);
      loadLocations(selectedCampaign);
    }catch(err){ setMsg({ok:false,text:err.message}); }
    finally{ setSaving(false); }
  }

  async function deletePin(id){
    if(!confirm("Delete this pin?")) return;
    const res = await fetch("/api/wago-drops/admin/update-location",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,_adminSecret:adminSecret})});
    if(res.ok){
      setLocations(prev=>prev.filter(l=>l.id!==id));
      setMsg({ok:true,text:"Pin deleted."});
    }
  }

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <label style={{display:"block"}}>
          <span style={{fontSize:11,color:T.dim,display:"block",marginBottom:5}}>CAMPAIGN *</span>
          <select value={selectedCampaign} onChange={e=>onCampaignChange(e.target.value)} style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:T.white}}>
            <option value="">— select —</option>
            {campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label style={{display:"block"}}>
          <span style={{fontSize:11,color:T.dim,display:"block",marginBottom:5}}>MODE</span>
          <select value={mode} onChange={e=>setMode(e.target.value)} style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:T.white}}>
            <option value="place">Place new pins</option>
            <option value="manage">Manage existing pins</option>
          </select>
        </label>
      </div>

      {mode==="place" && (
        <>
          <p style={{fontSize:13,color:T.muted,marginBottom:12}}>Click the map to place pins. All pins in this batch share the same hint and max claims.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <label style={{display:"block"}}>
              <span style={{fontSize:11,color:T.dim,display:"block",marginBottom:5}}>HINT (optional)</span>
              <input value={hint} onChange={e=>setHint(e.target.value)} placeholder="Revealed at reveal radius" style={{width:"100%",boxSizing:"border-box",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:T.white}}/>
            </label>
            <label style={{display:"block"}}>
              <span style={{fontSize:11,color:T.dim,display:"block",marginBottom:5}}>MAX CLAIMS (blank = unlimited)</span>
              <input type="number" value={maxClaims} onChange={e=>setMaxClaims(e.target.value)} placeholder="Unlimited" style={{width:"100%",boxSizing:"border-box",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:T.white}}/>
            </label>
          </div>
        </>
      )}

      <div ref={mapContainer} style={{width:"100%",height:340,borderRadius:10,marginBottom:12,overflow:"hidden"}}/>
      {mode==="place" && zoomLvl<17 && (
        <div style={{fontSize:12,color:T.yellow,marginBottom:10}}>⚠️ Zoom in to street level (17+) before clicking so pins land exactly where you mean — or stand at the spot and use "Use my current location".</div>
      )}

      {mode==="place" && (
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
          <span style={{fontSize:13,color:T.muted}}>{pendingPins.length} pin{pendingPins.length!==1?"s":""} placed</span>
          <button onClick={useMyLocation} disabled={locBusy} style={{fontSize:12,color:T.white,background:"rgba(125,200,50,0.14)",border:"1px solid rgba(91,166,34,0.35)",borderRadius:999,padding:"6px 14px",cursor:"pointer",fontWeight:600}}>{locBusy?"Getting GPS fix…":"📍 Use my current location"}</button>
          <button onClick={clearPending} disabled={!pendingPins.length} style={{fontSize:12,color:T.dim,background:"none",border:`1px solid ${T.border}`,borderRadius:7,padding:"5px 12px",cursor:"pointer"}}>Clear</button>
          <button onClick={savePins} disabled={saving||!pendingPins.length||!selectedCampaign} style={{fontSize:13,color:T.bg,background:T.olive,border:"none",borderRadius:8,padding:"7px 18px",fontWeight:700,cursor:"pointer"}}>{saving?"Saving…":"Save Pins"}</button>
        </div>
      )}

      {msg && <div style={{marginBottom:12,fontSize:13,color:msg.ok?T.green:T.red,padding:"8px 12px",background:msg.ok?"rgba(74,222,128,0.07)":"rgba(248,113,113,0.07)",borderRadius:8}}>{msg.text}</div>}

      {mode==="manage" && selectedCampaign && (
        <div>
          {loadingLocs
            ? <p style={{color:T.dim,fontSize:13}}>Loading pins…</p>
            : locations.length===0
              ? <p style={{color:T.dim,fontSize:13}}>No pins for this campaign.</p>
              : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {locations.map(loc=>(
                    <div key={loc.id} style={{background:T.card,border:`1px solid ${editingPin?.id===loc.id?T.olive:T.border}`,borderRadius:10,padding:"12px 16px"}}>
                      {editingPin?.id===loc.id ? (
                        <form onSubmit={updatePin}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                            <Input label="Lat" type="number" step="any" value={editingPin.lat} onChange={e=>setEditingPin(p=>({...p,lat:e.target.value}))}/>
                            <Input label="Lng" type="number" step="any" value={editingPin.lng} onChange={e=>setEditingPin(p=>({...p,lng:e.target.value}))}/>
                            <Input label="Hint" value={editingPin.hint||""} onChange={e=>setEditingPin(p=>({...p,hint:e.target.value}))}/>
                            <Input label="Max Claims (blank = unlimited)" type="number" value={editingPin.max_claims||""} onChange={e=>setEditingPin(p=>({...p,max_claims:e.target.value}))}/>
                          </div>
                          <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:"pointer"}}>
                            <input type="checkbox" checked={!!editingPin.is_active} onChange={e=>setEditingPin(p=>({...p,is_active:e.target.checked}))}/>
                            <span style={{fontSize:13,color:T.muted}}>Active</span>
                          </label>
                          <div style={{display:"flex",gap:8}}>
                            <button type="submit" disabled={saving} style={{fontSize:13,color:T.bg,background:T.olive,border:"none",borderRadius:8,padding:"7px 16px",fontWeight:700,cursor:"pointer"}}>{saving?"Saving…":"Save"}</button>
                            <button type="button" onClick={()=>setEditingPin(null)} style={{fontSize:13,color:T.muted,background:"none",border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 16px",cursor:"pointer"}}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:13,color:T.white,fontFamily:"monospace"}}>{loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</div>
                            <div style={{fontSize:11,color:T.dim,marginTop:2}}>
                              {loc.hint || <em>no hint</em>} · {loc.claim_count||0}/{loc.max_claims||"∞"} claims · <span style={{color:loc.is_active?T.green:T.red}}>{loc.is_active?"active":"inactive"}</span>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>setEditingPin({...loc})} style={{fontSize:12,color:T.white,background:"rgba(13,42,5,0.08)",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Edit</button>
                            <button onClick={()=>deletePin(loc.id)} style={{fontSize:12,color:T.red,background:"rgba(248,113,113,0.07)",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
          }
        </div>
      )}
    </div>
  );
}

function ClaimsTable({claims}){
  const SC={completed:T.green,pending:T.yellow,processing:T.yellow,failed:T.red};
  if(!claims.length) return <p style={{color:T.dim,fontSize:13}}>No claims yet.</p>;
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
          {["Campaign","Pin","Wallet","Amount","Status","Proof / Tickets","TX","Claimed At"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",color:T.dim,fontWeight:600}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {claims.map(c=>(
            <tr key={c.id} style={{borderBottom:`1px solid ${T.border}`}}>
              <td style={{padding:"8px 12px",color:T.white}}>{c.campaign_name}</td>
              <td style={{padding:"8px 12px",color:T.dim,fontFamily:"monospace"}}>{c.location_id?String(c.location_id).slice(0,4):"—"}</td>
              <td style={{padding:"8px 12px",color:T.muted,fontFamily:"monospace"}}>{c.wallet_address?.slice(0,6)}…{c.wallet_address?.slice(-4)}</td>
              <td style={{padding:"8px 12px",color:T.olive}}>{c.reward_type==="spl_token"?`${Number(c.reward_amount||0).toLocaleString()} TG`:c.reward_type}</td>
              <td style={{padding:"8px 12px",color:SC[c.status]||T.muted}}>{c.status}</td>
              <td style={{padding:"8px 12px"}}>{c.proof_status==="awarded"
                ?<span style={{color:T.green,fontWeight:600}}>🎟️ {c.tickets_awarded} {c.x_post_url&&<a href={c.x_post_url} target="_blank" rel="noopener noreferrer" style={{color:T.olive,fontWeight:400}}>post ↗</a>}</span>
                :c.proof_status==="photo_approved"?<span style={{color:T.yellow}}>photo OK · awaiting X link</span>
                :c.proof_status==="expired"?<span style={{color:T.dim}}>expired</span>
                :<span style={{color:T.dim}}>—</span>}</td>
              <td style={{padding:"8px 12px"}}>{c.tx_signature?<a href={`https://solscan.io/tx/${c.tx_signature}`} target="_blank" rel="noopener noreferrer" style={{color:T.olive,fontFamily:"monospace"}}>{c.tx_signature.slice(0,8)}…</a>:<span style={{color:T.dim}}>—</span>}</td>
              <td style={{padding:"8px 12px",color:T.dim}}>{new Date(c.claimed_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = ["Campaigns","Pins","Claims"];

export default function WagoAdminPage(){
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState("");
  const [authErr, setAuthErr] = useState(null);
  const [tab, setTab] = useState("Campaigns");
  const [campaigns, setCampaigns] = useState([]);
  const [claims, setClaims] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  async function checkAuth(e){
    e.preventDefault();
    const res = await fetch("/api/wago-drops/admin/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret})});
    if(res.ok){ setAuthed(true); loadData(secret); }
    else setAuthErr("Invalid admin secret");
  }

  async function loadData(s){
    const _s = s || secret;
    setDataLoading(true);
    const [cRes, clRes] = await Promise.all([
      fetch(`/api/wago-drops/admin/campaigns-all?_s=${encodeURIComponent(_s)}`),
      fetch(`/api/wago-drops/admin/claims-all?_s=${encodeURIComponent(_s)}`)
    ]);
    const [cData, clData] = await Promise.all([cRes.json(), clRes.json()]);
    setCampaigns(cData.campaigns||[]);
    setClaims(clData.claims||[]);
    setDataLoading(false);
  }

  if(!authed) return(
    <>
      <Head><title>WAGO Drops Admin</title></Head>
      <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <form onSubmit={checkAuth} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:320}}>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",color:T.white,margin:"0 0 20px",textAlign:"center"}}>🗺️ Admin Access</h2>
          <Input label="Admin Secret" type="password" value={secret} onChange={e=>setSecret(e.target.value)}/>
          {authErr && <p style={{fontSize:13,color:T.red,margin:"0 0 12px"}}>{authErr}</p>}
          <button type="submit" style={{width:"100%",background:T.olive,color:T.bg,border:"none",borderRadius:8,padding:12,fontSize:14,fontWeight:700,cursor:"pointer"}}>Enter</button>
        </form>
      </div>
    </>
  );

  return(
    <>
      <Head>
        <title>WAGO Drops Admin</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet"/>
      </Head>
      <div style={{minHeight:"100vh",background:T.bg,color:T.white,fontFamily:"'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif"}}>
        <nav style={{position:"sticky",top:0,zIndex:100,background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"0 clamp(14px,4vw,48px)",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Wago pose="salute" size={34} />
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700}}>WAGO Admin</span>
          </div>
          <Link href="/wago-drops" style={{fontSize:12,color:T.muted,textDecoration:"none"}}>← Back to Drops</Link>
        </nav>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"28px clamp(14px,4vw,48px)"}}>
          <div style={{display:"flex",gap:4,marginBottom:28,borderBottom:`1px solid ${T.border}`,paddingBottom:1}}>
            {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{fontSize:13,color:tab===t?T.olive:T.muted,background:"none",border:"none",cursor:"pointer",padding:"8px 16px",borderBottom:tab===t?`2px solid ${T.olive}`:"2px solid transparent",marginBottom:-1}}>{t}</button>)}
          </div>
          {dataLoading
            ? <div style={{display:"flex",justifyContent:"center",padding:60}}><div style={{width:32,height:32,border:`3px solid ${T.border}`,borderTopColor:T.olive,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
            : <>
                {tab==="Campaigns" && <CampaignsTab campaigns={campaigns} setCampaigns={setCampaigns} adminSecret={secret}/>}
                {tab==="Pins" && <PinManager campaigns={campaigns} adminSecret={secret}/>}
                {tab==="Claims" && <><h3 style={{margin:"0 0 16px",color:T.white}}>All Claims</h3><ClaimsTable claims={claims}/></>}
              </>
          }
        </div>
      </div>
    </>
  );
}