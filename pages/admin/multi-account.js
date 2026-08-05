// pages/admin/multi-account.js
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)",
  olive:"#93a85a", gold:"#c8a84b", red:"#ef4444", orange:"#f97316",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const SUSPICION_COLORS = {
  high:   { bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.3)",   label:"High",   color:"#ef4444" },
  medium: { bg:"rgba(249,115,22,0.08)",  border:"rgba(249,115,22,0.3)",  label:"Medium", color:"#f97316" },
  low:    { bg:"rgba(200,168,75,0.08)",  border:"rgba(200,168,75,0.3)",  label:"Low",    color:"#c8a84b" },
};

function getSuspicion(cluster) {
  const count = cluster.usernames.length;
  const sharedFingerprints = cluster.sharedFingerprints;
  if (count >= 4 || sharedFingerprints >= 3) return "high";
  if (count === 3 || sharedFingerprints === 2) return "medium";
  return "low";
}

export default function MultiAccount() {
  const [authed,   setAuthed]   = useState(false);
  const [pw,       setPw]       = useState("");
  const [clusters, setClusters] = useState([]);
  const [ipGroups, setIpGroups] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState("fingerprint");

  const load = async () => {
    setLoading(true);
    try {
      // ── Fingerprint clusters ───────────────────────────────────────────────
      const { data: fps } = await supabase
        .from("DeviceFingerprints")
        .select("username,fingerprint_hash,ip_address,screen_resolution,timezone,created_at")
        .order("created_at", { ascending: false });

      // Group by fingerprint hash
      const hashMap = {};
      (fps || []).forEach(row => {
        if (!hashMap[row.fingerprint_hash]) {
          hashMap[row.fingerprint_hash] = {
            hash:               row.fingerprint_hash,
            usernames:          new Set(),
            ips:                new Set(),
            screenResolutions:  new Set(),
            timezones:          new Set(),
            lastSeen:           row.created_at,
            rows:               [],
          };
        }
        hashMap[row.fingerprint_hash].usernames.add(row.username);
        if (row.ip_address) hashMap[row.fingerprint_hash].ips.add(row.ip_address);
        if (row.screen_resolution) hashMap[row.fingerprint_hash].screenResolutions.add(row.screen_resolution);
        if (row.timezone) hashMap[row.fingerprint_hash].timezones.add(row.timezone);
        hashMap[row.fingerprint_hash].rows.push(row);
      });

      // Only keep clusters with 2+ usernames
      const suspectClusters = Object.values(hashMap)
        .filter(c => c.usernames.size >= 2)
        .map(c => ({
          hash:               c.hash,
          usernames:          [...c.usernames],
          ips:                [...c.ips],
          screenResolutions:  [...c.screenResolutions],
          timezones:          [...c.timezones],
          sharedFingerprints: c.usernames.size,
          lastSeen:           c.lastSeen,
          occurrences:        c.rows.length,
        }))
        .sort((a,b) => b.sharedFingerprints - a.sharedFingerprints);

      setClusters(suspectClusters);

      // ── IP clusters ────────────────────────────────────────────────────────
      const ipMap = {};
      (fps || []).forEach(row => {
        if (!row.ip_address) return;
        if (!ipMap[row.ip_address]) {
          ipMap[row.ip_address] = { ip: row.ip_address, usernames: new Set(), lastSeen: row.created_at };
        }
        ipMap[row.ip_address].usernames.add(row.username);
      });

      const suspectIps = Object.values(ipMap)
        .filter(g => g.usernames.size >= 2)
        .map(g => ({ ip: g.ip, usernames: [...g.usernames], lastSeen: g.lastSeen }))
        .sort((a,b) => b.usernames.length - a.usernames.length);

      setIpGroups(suspectIps);

    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (authed) load(); }, [authed]);

  const fmtDate = iso => iso
    ? new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})
    : "—";

  const css = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}`;

  if (!authed) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style dangerouslySetInnerHTML={{__html:css}}/>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"32px 28px",width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:12}}>🔍</div>
        <div style={{fontSize:14,color:T.muted,marginBottom:20}}>Multi-Account Admin</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&pw===ADMIN_PASSWORD)setAuthed(true);}}
          placeholder="Password"
          style={{width:"100%",background:"rgba(0,0,0,0.3)",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",color:T.white,fontSize:13,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
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
        <div style={{maxWidth:960,margin:"0 auto",padding:"32px 16px 80px"}}>

          {/* Header */}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:T.gold,marginBottom:8}}>Admin</div>
              <h1 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:32,fontWeight:700,color:T.white}}>
                Multi-Account Detection
              </h1>
              <div style={{fontSize:12,color:T.dim,marginTop:6}}>
                Clusters of usernames sharing the same device fingerprint or IP address.
                Flag only — no automated penalties.
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={load} style={{background:"transparent",border:`1px solid ${T.olive}`,color:T.olive,borderRadius:8,padding:"9px 18px",fontSize:12,cursor:"pointer"}}>
                {loading?"⟳ Loading…":"↻ Refresh"}
              </button>
              <Link href="/admin/marketplace" style={{fontSize:11,color:T.dim,textDecoration:"none"}}>← Admin</Link>
            </div>
          </div>

          {/* Summary strip */}
          <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
            {[
              {label:"Device Clusters",  value:clusters.length,  color:T.red},
              {label:"IP Clusters",      value:ipGroups.length,  color:T.orange},
              {label:"High Suspicion",   value:clusters.filter(c=>getSuspicion(c)==="high").length, color:T.red},
            ].map(s=>(
              <div key={s.label} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 20px",flex:"1 1 160px"}}>
                <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:28,fontWeight:700,color:s.color}}>{s.value}</div>
                <div style={{fontSize:11,color:T.dim,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            {[
              {id:"fingerprint",label:"🔍 Device Fingerprint"},
              {id:"ip",label:"🌐 IP Address"},
            ].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
                  background:tab===t.id?T.olive:"rgba(255,255,255,0.04)",
                  color:tab===t.id?"#0a0c08":T.muted}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Fingerprint clusters */}
          {tab==="fingerprint" && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {clusters.length===0 && !loading && (
                <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"32px",textAlign:"center",fontSize:13,color:T.dim}}>
                  No suspicious device clusters found.
                </div>
              )}
              {clusters.map((c,i)=>{
                const s=getSuspicion(c);
                const sc=SUSPICION_COLORS[s];
                return (
                  <div key={i} style={{background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:12,padding:"16px 18px"}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{fontSize:10,fontWeight:700,color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:20,padding:"2px 10px",letterSpacing:"0.1em"}}>
                          {sc.label.toUpperCase()} RISK
                        </div>
                        <div style={{fontSize:11,color:T.dim}}>{c.occurrences} submissions · last {fmtDate(c.lastSeen)}</div>
                      </div>
                      <div style={{fontFamily:"monospace",fontSize:10,color:T.dim}}>
                        hash: {c.hash}
                      </div>
                    </div>

                    {/* Usernames */}
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:10,color:T.dim,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>
                        {c.usernames.length} Accounts on Same Device
                      </div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {c.usernames.map(u=>(
                          <a key={u} href={`/u/${u}`} target="_blank" rel="noopener noreferrer"
                            style={{fontSize:12,fontWeight:700,color:T.white,background:"rgba(0,0,0,0.3)",
                              border:`1px solid ${T.border}`,borderRadius:20,padding:"3px 12px",textDecoration:"none"}}>
                            @{u}
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Device details */}
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      {c.ips.length>0 && (
                        <div style={{fontSize:10,color:T.dim}}>
                          <span style={{color:T.muted}}>IP: </span>
                          {c.ips.join(", ")}
                        </div>
                      )}
                      {c.screenResolutions.length>0 && (
                        <div style={{fontSize:10,color:T.dim}}>
                          <span style={{color:T.muted}}>Screen: </span>
                          {c.screenResolutions.join(", ")}
                        </div>
                      )}
                      {c.timezones.length>0 && (
                        <div style={{fontSize:10,color:T.dim}}>
                          <span style={{color:T.muted}}>Timezone: </span>
                          {c.timezones.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* IP clusters */}
          {tab==="ip" && (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {ipGroups.length===0 && !loading && (
                <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"32px",textAlign:"center",fontSize:13,color:T.dim}}>
                  No suspicious IP clusters found.
                </div>
              )}
              <div style={{fontSize:11,color:T.dim,marginBottom:4}}>
                Note: shared IPs can be legitimate (household, office, VPN). Use alongside fingerprint data.
              </div>
              {ipGroups.map((g,i)=>(
                <div key={i} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:8}}>
                    <div style={{fontFamily:"monospace",fontSize:12,color:T.white}}>{g.ip}</div>
                    <div style={{fontSize:10,color:T.dim}}>{g.usernames.length} accounts · last {fmtDate(g.lastSeen)}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {g.usernames.map(u=>(
                      <a key={u} href={`/u/${u}`} target="_blank" rel="noopener noreferrer"
                        style={{fontSize:12,fontWeight:700,color:T.white,background:"rgba(0,0,0,0.3)",
                          border:`1px solid ${T.border}`,borderRadius:20,padding:"3px 12px",textDecoration:"none"}}>
                        @{u}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}