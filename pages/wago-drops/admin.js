// pages/wago-drops/admin.js
import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";

const T = {
  bg:"#080a06",surface:"#0f1209",card:"#141a0c",border:"rgba(255,255,255,0.07)",
  olive:"#93a85a",oliveD:"#7a8f48",white:"#f0efea",muted:"rgba(240,239,234,0.45)",
  dim:"rgba(240,239,234,0.22)",green:"#4ade80",red:"#f87171",yellow:"#fbbf24",
};

function Input({label,...props}){
  return(
    <label style={{display:"block",marginBottom:14}}>
      <span style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5}}>{label}</span>
      <input style={{width:"100%",boxSizing:"border-box",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:T.white,outline:"none"}} {...props}/>
    </label>
  );
}

function CreateCampaignForm({onCreated,adminSecret}){
  const MINT="5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
  const [form,setForm]=useState({name:"",description:"",image_url:"",reward_type:"spl_token",reward_amount:"",reward_token_mint:MINT,reveal_radius_m:100,claim_radius_m:25,proof_bonus_enabled:false,proof_bonus_amount:"",starts_at:"",ends_at:""});
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState(null);
  const set=(k,v)=>setForm(prev=>({...prev,[k]:v}));

  async function submit(e){
    e.preventDefault();setLoading(true);setMsg(null);
    try{
      const res=await fetch("/api/wago-drops/admin/create-campaign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,_adminSecret:adminSecret})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Failed");
      setMsg({ok:true,text:`Campaign "${data.campaign.name}" created (ID: ${data.campaign.id})`});
      onCreated&&onCreated(data.campaign);
    }catch(err){setMsg({ok:false,text:err.message});}finally{setLoading(false);}
  }

  return(
    <form onSubmit={submit} style={{display:"flex",flexDirection:"column"}}>
      <Input label="Campaign Name *" required value={form.name} onChange={e=>set("name",e.target.value)}/>
      <Input label="Description" value={form.description} onChange={e=>set("description",e.target.value)}/>
      <Input label="Image URL" value={form.image_url} onChange={e=>set("image_url",e.target.value)}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Reward Amount *" type="number" required value={form.reward_amount} onChange={e=>set("reward_amount",e.target.value)}/>
        <Input label="Token Mint" value={form.reward_token_mint} onChange={e=>set("reward_token_mint",e.target.value)}/>
        <Input label="Reveal Radius (m)" type="number" value={form.reveal_radius_m} onChange={e=>set("reveal_radius_m",Number(e.target.value))}/>
        <Input label="Claim Radius (m)" type="number" value={form.claim_radius_m} onChange={e=>set("claim_radius_m",Number(e.target.value))}/>
        <Input label="Starts At (UTC)" type="datetime-local" value={form.starts_at} onChange={e=>set("starts_at",e.target.value)}/>
        <Input label="Ends At (UTC)" type="datetime-local" value={form.ends_at} onChange={e=>set("ends_at",e.target.value)}/>
      </div>
      <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,cursor:"pointer"}}>
        <input type="checkbox" checked={form.proof_bonus_enabled} onChange={e=>set("proof_bonus_enabled",e.target.checked)}/>
        <span style={{fontSize:13,color:T.muted}}>Enable Proof of Grass bonus</span>
      </label>
      {form.proof_bonus_enabled&&<Input label="Proof Bonus Amount" type="number" value={form.proof_bonus_amount} onChange={e=>set("proof_bonus_amount",e.target.value)}/>}
      {msg&&<div style={{fontSize:13,color:msg.ok?T.green:T.red,marginBottom:12,padding:"8px 12px",background:msg.ok?"rgba(74,222,128,0.07)":"rgba(248,113,113,0.07)",borderRadius:8}}>{msg.text}</div>}
      <button type="submit" disabled={loading} style={{background:T.olive,color:T.bg,border:"none",borderRadius:9,padding:"11px",fontSize:14,fontWeight:700,cursor:loading?"default":"pointer"}}>{loading?"Creating…":"Create Campaign"}</button>
    </form>
  );
}

function PinPlacer({campaigns,adminSecret}){
  const mapContainer=useRef(null);
  const mapRef=useRef(null);
  const [selectedCampaign,setSelectedCampaign]=useState("");
  const [pendingPins,setPendingPins]=useState([]);
  const [hint,setHint]=useState("");
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);

  useEffect(()=>{
    import("mapbox-gl").then(({default:mapboxgl})=>{
      import("mapbox-gl/dist/mapbox-gl.css").catch(()=>{});
      mapboxgl.accessToken=process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const map=new mapboxgl.Map({container:mapContainer.current,style:"mapbox://styles/mapbox/satellite-streets-v12",center:[-98.5795,39.8283],zoom:4});
      map.addControl(new mapboxgl.NavigationControl(),"top-right");
      map.addControl(new mapboxgl.GeolocateControl({positionOptions:{enableHighAccuracy:true}}),"top-right");
      map.on("click",(e)=>{
        const{lat,lng}=e.lngLat;
        setPendingPins(prev=>[...prev,{lat,lng,hint:""}]);
        const el=document.createElement("div");
        el.style.cssText=`width:26px;height:26px;border-radius:50%;background:#f97316;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;`;
        el.textContent="📍";
        new mapboxgl.Marker({element:el}).setLngLat([lng,lat]).addTo(map);
      });
      mapRef.current=map;
    });
    return()=>mapRef.current?.remove();
  },[]);

  async function savePins(){
    if(!selectedCampaign||pendingPins.length===0)return;
    setSaving(true);setMsg(null);
    try{
      const res=await fetch("/api/wago-drops/admin/add-locations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:selectedCampaign,locations:pendingPins.map(p=>({lat:p.lat,lng:p.lng,hint})),_adminSecret:adminSecret})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Failed");
      setMsg({ok:true,text:`${pendingPins.length} pin${pendingPins.length!==1?"s":""} added.`});
      setPendingPins([]);
    }catch(err){setMsg({ok:false,text:err.message});}finally{setSaving(false);}
  }

  return(
    <div>
      <p style={{fontSize:13,color:T.muted,marginBottom:14}}>Click anywhere on the map to place a drop pin. Select the campaign below, then save.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <label style={{display:"block"}}>
          <span style={{fontSize:11,color:T.dim,display:"block",marginBottom:5}}>CAMPAIGN *</span>
          <select value={selectedCampaign} onChange={e=>setSelectedCampaign(e.target.value)} style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:T.white}}>
            <option value="">— select —</option>
            {campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label style={{display:"block"}}>
          <span style={{fontSize:11,color:T.dim,display:"block",marginBottom:5}}>HINT (optional)</span>
          <input value={hint} onChange={e=>setHint(e.target.value)} placeholder="Revealed at 100m to the user" style={{width:"100%",boxSizing:"border-box",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:T.white}}/>
        </label>
      </div>
      <div ref={mapContainer} style={{width:"100%",height:360,borderRadius:10,marginBottom:12,overflow:"hidden"}}/>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <span style={{fontSize:13,color:T.muted}}>{pendingPins.length} pin{pendingPins.length!==1?"s":""} placed</span>
        <button onClick={()=>setPendingPins([])} disabled={!pendingPins.length} style={{fontSize:12,color:T.dim,background:"none",border:`1px solid ${T.border}`,borderRadius:7,padding:"5px 12px",cursor:"pointer"}}>Clear</button>
        <button onClick={savePins} disabled={saving||!pendingPins.length||!selectedCampaign} style={{fontSize:13,color:T.bg,background:T.olive,border:"none",borderRadius:8,padding:"7px 18px",fontWeight:700,cursor:"pointer"}}>{saving?"Saving…":"Save Pins"}</button>
      </div>
      {msg&&<div style={{marginTop:10,fontSize:13,color:msg.ok?T.green:T.red}}>{msg.text}</div>}
    </div>
  );
}

function ClaimsTable({claims}){
  const SC={completed:T.green,pending:T.yellow,processing:T.yellow,failed:T.red};
  if(!claims.length)return<p style={{color:T.dim,fontSize:13}}>No claims yet.</p>;
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
          {["Campaign","Wallet","Amount","Status","TX","Claimed At"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",color:T.dim,fontWeight:600}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {claims.map(c=>(
            <tr key={c.id} style={{borderBottom:`1px solid ${T.border}`}}>
              <td style={{padding:"8px 12px",color:T.white}}>{c.campaign_name}</td>
              <td style={{padding:"8px 12px",color:T.muted,fontFamily:"monospace"}}>{c.wallet_address?.slice(0,6)}…{c.wallet_address?.slice(-4)}</td>
              <td style={{padding:"8px 12px",color:T.olive}}>{c.reward_type==="spl_token"?`${Number(c.reward_amount||0).toLocaleString()} TG`:c.reward_type}</td>
              <td style={{padding:"8px 12px",color:SC[c.status]||T.muted}}>{c.status}</td>
              <td style={{padding:"8px 12px"}}>{c.tx_signature?<a href={`https://solscan.io/tx/${c.tx_signature}`} target="_blank" rel="noopener noreferrer" style={{color:T.olive,fontFamily:"monospace"}}>{c.tx_signature.slice(0,8)}…</a>:<span style={{color:T.dim}}>—</span>}</td>
              <td style={{padding:"8px 12px",color:T.dim}}>{new Date(c.claimed_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS=["Campaigns","Place Pins","Claims"];

export default function WagoAdminPage(){
  const [authed,setAuthed]=useState(false);
  const [secret,setSecret]=useState("");
  const [authErr,setAuthErr]=useState(null);
  const [tab,setTab]=useState("Campaigns");
  const [campaigns,setCampaigns]=useState([]);
  const [claims,setClaims]=useState([]);
  const [dataLoading,setDataLoading]=useState(false);

  async function checkAuth(e){
    e.preventDefault();
    const res=await fetch("/api/wago-drops/admin/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret})});
    if(res.ok){setAuthed(true);loadData(secret);}
    else setAuthErr("Invalid admin secret");
  }

  async function loadData(s){
    const _s=s||secret;
    setDataLoading(true);
    const [cRes,clRes]=await Promise.all([
      fetch(`/api/wago-drops/admin/campaigns-all?_s=${encodeURIComponent(_s)}`),
      fetch(`/api/wago-drops/admin/claims-all?_s=${encodeURIComponent(_s)}`)
    ]);
    const [cData,clData]=await Promise.all([cRes.json(),clRes.json()]);
    setCampaigns(cData.campaigns||[]);setClaims(clData.claims||[]);
    setDataLoading(false);
  }

  if(!authed)return(
    <>
      <Head><title>WAGO Drops Admin</title></Head>
      <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <form onSubmit={checkAuth} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:320}}>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",color:T.white,margin:"0 0 20px",textAlign:"center"}}>🗺️ Admin Access</h2>
          <Input label="Admin Secret" type="password" value={secret} onChange={e=>setSecret(e.target.value)}/>
          {authErr&&<p style={{fontSize:13,color:T.red,margin:"0 0 12px"}}>{authErr}</p>}
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
      <div style={{minHeight:"100vh",background:T.bg,color:T.white,fontFamily:"system-ui,sans-serif"}}>
        <nav style={{position:"sticky",top:0,zIndex:100,background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"0 clamp(14px,4vw,48px)",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:20}}>🗺️</span>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700}}>WAGO Admin</span>
          </div>
          <Link href="/wago-drops" style={{fontSize:12,color:T.muted,textDecoration:"none"}}>← Back to Drops</Link>
        </nav>
        <div style={{maxWidth:1000,margin:"0 auto",padding:"28px clamp(14px,4vw,48px)"}}>
          <div style={{display:"flex",gap:4,marginBottom:28,borderBottom:`1px solid ${T.border}`,paddingBottom:1}}>
            {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{fontSize:13,color:tab===t?T.olive:T.muted,background:"none",border:"none",cursor:"pointer",padding:"8px 16px",borderBottom:tab===t?`2px solid ${T.olive}`:"2px solid transparent",marginBottom:-1}}>{t}</button>)}
          </div>
          {dataLoading?(
            <div style={{display:"flex",justifyContent:"center",padding:60}}>
              <div style={{width:32,height:32,border:`3px solid ${T.border}`,borderTopColor:T.olive,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ):(
            <>
              {tab==="Campaigns"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:32}}>
                  <div>
                    <h3 style={{margin:"0 0 16px",color:T.white}}>Create Campaign</h3>
                    <CreateCampaignForm adminSecret={secret} onCreated={c=>{setCampaigns(prev=>[c,...prev]);}}/>
                  </div>
                  <div>
                    <h3 style={{margin:"0 0 16px",color:T.white}}>All Campaigns</h3>
                    {campaigns.length===0?<p style={{color:T.dim,fontSize:13}}>No campaigns yet.</p>:(
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {campaigns.map(c=>(
                          <div key={c.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <div style={{fontSize:14,fontWeight:600,color:T.white}}>{c.name}</div>
                              <div style={{fontSize:11,color:T.dim,marginTop:2}}>{c.status} · {c.location_count??0} pins</div>
                            </div>
                            <div style={{fontSize:11,color:T.olive,background:"rgba(147,168,90,0.12)",borderRadius:5,padding:"3px 8px"}}>{c.status}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {tab==="Place Pins"&&<PinPlacer campaigns={campaigns.filter(c=>c.status==="active"||c.status==="draft")} adminSecret={secret}/>}
              {tab==="Claims"&&(
                <>
                  <h3 style={{margin:"0 0 16px",color:T.white}}>All Claims</h3>
                  <ClaimsTable claims={claims}/>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}