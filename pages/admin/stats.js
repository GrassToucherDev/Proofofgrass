import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../utils/supabase";

// --- Design tokens ------------------------------------------------------------
const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710", bg4:"#1a1e13",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  olive:"#93a85a", oliveDim:"rgba(147,168,90,0.45)",
  gold:"#c8a84b", goldDim:"rgba(200,168,75,0.4)",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
  red:"#f87171",
};

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

// --- Helpers -----------------------------------------------------------------
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayUTC() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function weekAgoUTC() {
  const d = new Date(); d.setDate(d.getDate() - 7);
  return d.toISOString();
}
function startOfDayUTC(dateStr) { return `${dateStr}T00:00:00.000Z`; }
function endOfDayUTC(dateStr)   { return `${dateStr}T23:59:59.999Z`; }

function fmt(n) { return n == null ? "--" : Number(n).toLocaleString(); }
function delta(today, yest) {
  if (today == null || yest == null) return null;
  const d = today - yest;
  if (d === 0) return null;
  return { val: d, up: d > 0 };
}

// --- Stat card ----------------------------------------------------------------
function StatCard({ label, value, yesterday, allTime, weekly, accent, note, available }) {
  const d = delta(value, yesterday);
  const col = accent === "gold" ? T.gold : accent === "red" ? T.red : T.olive;
  return (
    <div style={{ background:T.bg2, border:`1px solid ${available === false ? T.border : T.borderG}`,
      borderRadius:12, padding:"18px 20px", display:"flex", flexDirection:"column", gap:8,
      opacity: available === false ? 0.5 : 1 }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase",
        color: available === false ? T.dim : col }}>{label}</div>
      <div style={{ fontFamily:"'Georgia',serif", fontSize:32, fontWeight:700,
        color: available === false ? T.dim : T.white, lineHeight:1 }}>
        {available === false ? "--" : fmt(value)}
      </div>
      {d && available !== false && (
        <div style={{ fontSize:11, color: d.up ? T.olive : T.red }}>
          {d.up ? "^" : "v"} {fmt(Math.abs(d.val))} vs yesterday
        </div>
      )}
      {yesterday != null && !d && available !== false && (
        <div style={{ fontSize:11, color:T.dim }}>same as yesterday ({fmt(yesterday)})</div>
      )}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:2 }}>
        {weekly != null && available !== false && (
          <span style={{ fontSize:10, color:T.dim }}>7d: <b style={{color:T.muted}}>{fmt(weekly)}</b></span>
        )}
        {allTime != null && available !== false && (
          <span style={{ fontSize:10, color:T.dim }}>All-time: <b style={{color:T.muted}}>{fmt(allTime)}</b></span>
        )}
      </div>
      {note && (
        <div style={{ fontSize:9, color:T.dim, fontStyle:"italic", marginTop:2 }}>{note}</div>
      )}
    </div>
  );
}

// --- Main ---------------------------------------------------------------------
export default function AdminStats() {
  const [authed,   setAuthed]   = useState(false);
  const [pw,       setPw]       = useState("");
  const [pwError,  setPwError]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [stats,    setStats]    = useState(null);
  const [copied,   setCopied]   = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const checkPw = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(""); }
    else { setPwError("Incorrect password."); }
  };

  const loadStats = useCallback(async () => {
    setLoading(true);
    const today = todayUTC();
    const yest  = yesterdayUTC();
    const todayStart = startOfDayUTC(today);
    const todayEnd   = endOfDayUTC(today);
    const yestStart  = startOfDayUTC(yest);
    const yestEnd    = endOfDayUTC(yest);
    const weekAgo    = weekAgoUTC();

    try {
      const [
        // Today
        { count: proofsToday },
        { count: proofsYest },
        { count: proofsWeek },
        { count: proofsAllTime },
        { data:  todaySubs },
        { data:  yestSubs },
        { data:  weekSubs },
        // Streaks
        { data:  topStreaks },
        { count: totalUsers },
        // Challenges
        { count: chalStartedToday },
        { count: chalStartedYest },
        { count: chalStartedWeek },
        { count: chalStartedAll },
        { count: chalDoneToday },
        { count: chalDoneYest },
        { count: chalDoneWeek },
        { count: chalDoneAll },
        // Shields
        { count: shieldsToday },
        { count: shieldsYest },
        { count: shieldsWeek },
        { count: shieldsAll },
        // New users (first submission today)
        { data: newUserSubs },
        // Referrals
        { count: referralsPending },
        { count: referralsConverted },
        { count: referralsConvertedToday },
      ] = await Promise.all([
        // Proofs today / yesterday / week / all-time
        supabase.from("Submissions").select("id",{count:"exact",head:true})
          .in("status",["pending","approved"])
          .gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from("Submissions").select("id",{count:"exact",head:true})
          .in("status",["pending","approved"])
          .gte("created_at", yestStart).lte("created_at", yestEnd),
        supabase.from("Submissions").select("id",{count:"exact",head:true})
          .in("status",["pending","approved"])
          .gte("created_at", weekAgo),
        supabase.from("Submissions").select("id",{count:"exact",head:true})
          .in("status",["pending","approved"]),
        // Usernames active today / yesterday / week (for unique user counts)
        supabase.from("Submissions").select("username")
          .in("status",["pending","approved"])
          .gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from("Submissions").select("username")
          .in("status",["pending","approved"])
          .gte("created_at", yestStart).lte("created_at", yestEnd),
        supabase.from("Submissions").select("username")
          .in("status",["pending","approved"])
          .gte("created_at", weekAgo),
        // Top streaks
        supabase.from("Streaks").select("username,current_streak,best_streak")
          .order("current_streak",{ascending:false}).limit(5),
        // Total users
        supabase.from("Streaks").select("username",{count:"exact",head:true}),
        // Challenges started today / yesterday / week / all
        supabase.from("Challenges").select("id",{count:"exact",head:true})
          .gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from("Challenges").select("id",{count:"exact",head:true})
          .gte("created_at", yestStart).lte("created_at", yestEnd),
        supabase.from("Challenges").select("id",{count:"exact",head:true})
          .gte("created_at", weekAgo),
        supabase.from("Challenges").select("id",{count:"exact",head:true}),
        // Challenges completed today / yesterday / week / all
        supabase.from("Challenges").select("id",{count:"exact",head:true})
          .eq("status","completed")
          .gte("updated_at", todayStart).lte("updated_at", todayEnd),
        supabase.from("Challenges").select("id",{count:"exact",head:true})
          .eq("status","completed")
          .gte("updated_at", yestStart).lte("updated_at", yestEnd),
        supabase.from("Challenges").select("id",{count:"exact",head:true})
          .eq("status","completed")
          .gte("updated_at", weekAgo),
        supabase.from("Challenges").select("id",{count:"exact",head:true})
          .eq("status","completed"),
        // Shields purchased today / yesterday / week / all
        supabase.from("ShieldPurchases").select("id",{count:"exact",head:true})
          .eq("status","approved")
          .gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from("ShieldPurchases").select("id",{count:"exact",head:true})
          .eq("status","approved")
          .gte("created_at", yestStart).lte("created_at", yestEnd),
        supabase.from("ShieldPurchases").select("id",{count:"exact",head:true})
          .eq("status","approved")
          .gte("created_at", weekAgo),
        supabase.from("ShieldPurchases").select("id",{count:"exact",head:true})
          .eq("status","approved"),
        // New users -- usernames submitting for the first time today
        supabase.from("Submissions").select("username")
          .in("status",["pending","approved"])
          .gte("created_at", todayStart).lte("created_at", todayEnd),
        // Referrals
        supabase.from("Referrals").select("id",{count:"exact",head:true}).eq("status","pending"),
        supabase.from("Referrals").select("id",{count:"exact",head:true}).eq("status","converted"),
        supabase.from("Referrals").select("id",{count:"exact",head:true}).eq("status","converted")
          .gte("converted_at", todayStart).lte("converted_at", todayEnd),
      ]);

      // Unique active users
      const uniq = arr => new Set((arr??[]).map(r=>r.username)).size;
      const activeToday = uniq(todaySubs);
      const activeYest  = uniq(yestSubs);
      const activeWeek  = uniq(weekSubs);

      // New users today -- users whose earliest submission ever is today
      const todayUsernames = [...new Set((todaySubs??[]).map(r=>r.username))];
      let newUsersToday = 0;
      let newUsersList  = [];
      if (todayUsernames.length > 0) {
        const { data: allFirstSubs } = await supabase
          .from("Submissions")
          .select("username, created_at")
          .in("username", todayUsernames)
          .in("status",["pending","approved"])
          .order("created_at", { ascending: true });
        const firstSubDate = {};
        const firstSubTime = {};
        (allFirstSubs ?? []).forEach(s => {
          if (!firstSubDate[s.username]) {
            firstSubDate[s.username] = s.created_at.slice(0,10);
            firstSubTime[s.username] = s.created_at;
          }
        });
        newUsersList = Object.entries(firstSubDate)
          .filter(([, d]) => d === today)
          .map(([username]) => ({ username, joinedAt: firstSubTime[username] }))
          .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
        newUsersToday = newUsersList.length;
      }

      // Top streak
      const topUser = (topStreaks ?? [])[0];

      setStats({
        today,
        proofsToday, proofsYest, proofsWeek, proofsAllTime,
        activeToday, activeYest, activeWeek, totalUsers,
        newUsersToday, newUsersList,
        topUser: topUser?.username ?? "--",
        topStreak: topUser?.current_streak ?? 0,
        top5: topStreaks ?? [],
        chalStartedToday, chalStartedYest, chalStartedWeek, chalStartedAll,
        chalDoneToday, chalDoneYest, chalDoneWeek, chalDoneAll,
        shieldsToday, shieldsYest, shieldsWeek, shieldsAll,
        referralsPending, referralsConverted, referralsConvertedToday,
      });
      setLastRefresh(new Date().toLocaleTimeString());
    } catch(e) {
      console.error("admin stats error", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) loadStats(); }, [authed, loadStats]);

  const generatePost = () => {
    if (!stats) return "";
    const s = stats;
    const newLine = s.newUsersList?.length > 0
      ? `\n\n🆕 Welcome to the grass:\n${s.newUsersList.map(u => `@${u.username}`).join(" ")}`
      : "";
    return `🌿 Proof of Grass -- Daily Stats (${s.today})

📸 Proofs today: ${fmt(s.proofsToday)}
👥 Active users: ${fmt(s.activeToday)}
🆕 New users: ${fmt(s.newUsersToday)}
⚡ Challenges started: ${fmt(s.chalStartedToday)}
🏆 Challenges completed: ${fmt(s.chalDoneToday)}
🛡 Shields used: ${fmt(s.shieldsToday)}
🤝 Referrals converted: ${fmt(s.referralsConvertedToday)}

🔥 Top streak: @${s.topUser} -- Day ${fmt(s.topStreak)}${newLine}

📊 All-time:
* ${fmt(s.proofsAllTime)} total proofs
* ${fmt(s.totalUsers)} total users
* ${fmt(s.chalStartedAll)} total challenges

$TOUCHGRASS #TouchGrass #ProofOfGrass
proofofgrass.app`;
  };

  const generateWelcomePost = () => {
    if (!stats?.newUsersList?.length) return "";
    const handles = stats.newUsersList.map(u => `@${u.username}`).join(" ");
    return `🌱 Welcome to Proof of Grass!

${handles}

You just took your first step outside. The streak starts now.

Touch grass daily. Log your proof. Build your legacy.

$TOUCHGRASS #TouchGrass #ProofOfGrass
proofofgrass.app`;
  };

  const [copiedWelcome, setCopiedWelcome] = useState(false);
  const copyWelcomePost = () => {
    navigator.clipboard.writeText(generateWelcomePost()).catch(()=>{});
    setCopiedWelcome(true);
    setTimeout(() => setCopiedWelcome(false), 2000);
  };

  const copyPost = () => {
    navigator.clipboard.writeText(generatePost()).catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const css = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    input{font-family:'DM Sans',sans-serif;}
    @keyframes spin{to{transform:rotate(360deg);}}
    .spin{animation:spin 1s linear infinite;display:inline-block;}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
    @media(max-width:640px){.grid{grid-template-columns:1fr 1fr!important;}}
    @media(max-width:400px){.grid{grid-template-columns:1fr!important;}}
  `;

  // -- Login gate ------------------------------------------------------------
  if (!authed) return (
    <>
      <style dangerouslySetInnerHTML={{__html:css}}/>
      <div style={{minHeight:"100vh",background:T.bg,display:"flex",
        alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{background:T.bg2,border:`1px solid ${T.borderG}`,borderRadius:16,
          padding:"36px 32px",width:"100%",maxWidth:360,textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:12}}>🌿</div>
          <div style={{fontFamily:"'Georgia',serif",fontSize:20,fontWeight:700,
            color:T.white,marginBottom:4}}>Admin Access</div>
          <div style={{fontSize:12,color:T.dim,marginBottom:24}}>Proof of Grass Stats Dashboard</div>
          <input
            type="password"
            placeholder="Enter admin password"
            value={pw}
            onChange={e=>setPw(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&checkPw()}
            style={{width:"100%",padding:"10px 14px",background:T.bg3,
              border:`1px solid ${pwError?T.red:T.border}`,borderRadius:8,
              color:T.white,fontSize:13,marginBottom:8,outline:"none"}}
          />
          {pwError && <div style={{fontSize:11,color:T.red,marginBottom:8}}>{pwError}</div>}
          <button onClick={checkPw} style={{width:"100%",padding:"11px",
            background:T.olive,color:T.bg,border:"none",borderRadius:8,
            fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em"}}>
            Enter
          </button>
          <div style={{fontSize:10,color:T.dim,marginTop:16}}>
            Set NEXT_PUBLIC_ADMIN_PASSWORD in .env.local
          </div>
        </div>
      </div>
    </>
  );

  // -- Stats dashboard -------------------------------------------------------
  return (
    <>
      <style dangerouslySetInnerHTML={{__html:css}}/>
      <div style={{minHeight:"100vh",background:T.bg}}>

        {/* Nav */}
        <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)",height:52,
          background:`${T.bg}ec`,backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}`,position:"sticky",top:0,zIndex:100}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>🌿</span>
            <span style={{fontFamily:"'Georgia',serif",fontSize:15,fontWeight:700,color:T.white}}>
              Admin Stats
            </span>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.14em",
              textTransform:"uppercase",color:T.olive,border:`1px solid ${T.olive}`,
              borderRadius:4,padding:"2px 6px",marginLeft:4}}>PRIVATE</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {lastRefresh && (
              <span style={{fontSize:10,color:T.dim}}>Updated {lastRefresh}</span>
            )}
            <a href="/admin/milestones"
              style={{fontSize:12,color:T.dim,textDecoration:"none",fontWeight:500}}>
              Milestones
            </a>
            <button onClick={loadStats} disabled={loading}
              style={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:7,
                padding:"6px 14px",color:loading?T.dim:T.white,fontSize:11,
                cursor:loading?"default":"pointer",fontFamily:"'DM Sans',sans-serif"}}>
              {loading ? <span className="spin">Refresh</span> : "Refresh Refresh"}
            </button>
          </div>
        </nav>

        <div style={{maxWidth:900,margin:"0 auto",padding:"28px clamp(14px,4vw,32px) 60px"}}>

          {/* Header */}
          <div style={{marginBottom:24}}>
            <h1 style={{fontFamily:"'Georgia',serif",fontSize:26,fontWeight:700,
              color:T.white,marginBottom:4}}>
              Platform Stats
            </h1>
            <div style={{fontSize:12,color:T.dim}}>
              {stats ? `Showing data for ${stats.today}` : "Loading..."}
            </div>
          </div>

          {loading && !stats && (
            <div style={{textAlign:"center",padding:"60px 0",color:T.dim,fontSize:14}}>
              Loading stats...
            </div>
          )}

          {stats && (<>

            {/* -- TODAY --------------------------------------------------- */}
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",
              textTransform:"uppercase",color:T.olive,marginBottom:12}}>
              ✦ Today -- {stats.today}
            </div>
            <div className="grid" style={{marginBottom:24}}>
              <StatCard label="Proofs Submitted"
                value={stats.proofsToday} yesterday={stats.proofsYest}
                weekly={stats.proofsWeek} allTime={stats.proofsAllTime} />
              <StatCard label="Active Users"
                value={stats.activeToday} yesterday={stats.activeYest}
                weekly={stats.activeWeek} allTime={stats.totalUsers} />
              <StatCard label="New Users Today"
                value={stats.newUsersToday}
                note="First-time submitters" />
              <StatCard label="Challenges Started"
                value={stats.chalStartedToday} yesterday={stats.chalStartedYest}
                weekly={stats.chalStartedWeek} allTime={stats.chalStartedAll}
                accent="gold" />
              <StatCard label="Challenges Completed"
                value={stats.chalDoneToday} yesterday={stats.chalDoneYest}
                weekly={stats.chalDoneWeek} allTime={stats.chalDoneAll}
                accent="gold" />
              <StatCard label="Shields Purchased"
                value={stats.shieldsToday} yesterday={stats.shieldsYest}
                weekly={stats.shieldsWeek} allTime={stats.shieldsAll}
                accent="gold"
                note="Approved purchases only" />
              <StatCard label="Referrals Converted Today"
                value={stats.referralsConvertedToday}
                allTime={stats.referralsConverted}
                note="Referred users who hit Day 10 today"
                accent="gold" />
              <StatCard label="Pending Referrals"
                value={stats.referralsPending}
                note="Referred users not yet at Day 10" />
              <StatCard label="Badges Earned Today"
                available={false}
                note="Requires BadgeLog table (not yet tracked)" />
              <StatCard label="Quests Completed Today"
                available={false}
                note="Requires QuestProgress wired to DB" />
              <StatCard label="$TOUCHGRASS Burned"
                available={false}
                note="Requires on-chain tracking (Phase 2)" />
            </div>

            {/* -- NEW USERS TODAY ---------------------------------------- */}
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",
              textTransform:"uppercase",color:T.olive,marginBottom:12}}>
              ✦ New Users Today -- {stats.newUsersToday} joined
            </div>
            <div style={{background:T.bg2,border:`1px solid ${T.borderG}`,
              borderRadius:12,padding:"18px 20px",marginBottom:24}}>
              {!stats.newUsersList?.length ? (
                <div style={{fontSize:12,color:T.dim}}>No new users yet today.</div>
              ) : (<>
                {/* Shoutout buttons */}
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                  <button onClick={copyWelcomePost} style={{
                    display:"inline-flex",alignItems:"center",gap:6,
                    background:T.olive,color:T.bg,border:"none",borderRadius:7,
                    padding:"7px 14px",fontSize:11,fontWeight:700,cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif"}}>
                    {copiedWelcome ? "✓ Copied!" : "🌱 Copy Welcome Post"}
                  </button>
                  <div style={{fontSize:11,color:T.dim,display:"flex",
                    alignItems:"center",gap:6}}>
                    Shout out all {stats.newUsersToday} new users in one post
                  </div>
                </div>
                {/* User list */}
                <div style={{display:"flex",flexDirection:"column",gap:0}}>
                  {stats.newUsersList.map((u, i) => {
                    const time = new Date(u.joinedAt).toLocaleTimeString([], {
                      hour:"2-digit", minute:"2-digit"
                    });
                    return (
                      <div key={u.username} style={{
                        display:"flex",alignItems:"center",gap:12,
                        padding:"10px 0",
                        borderBottom: i < stats.newUsersList.length-1
                          ? `1px solid ${T.border}` : "none"}}>
                        {/* Avatar circle */}
                        <div style={{width:32,height:32,borderRadius:"50%",
                          background:`rgba(147,168,90,0.15)`,
                          border:`1px solid ${T.borderG}`,flexShrink:0,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:13,fontWeight:700,color:T.olive}}>
                          {u.username[0]?.toUpperCase()}
                        </div>
                        {/* Username */}
                        <div style={{flex:1,minWidth:0}}>
                          <span style={{fontWeight:700,color:T.white,fontSize:13}}>
                            @{u.username}
                          </span>
                          <a href={`https://x.com/${u.username}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{fontSize:10,color:T.olive,marginLeft:8,
                              textDecoration:"none"}}>
                            Open X
                          </a>
                          <a href={`/u/${u.username}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{fontSize:10,color:T.dim,marginLeft:8,
                              textDecoration:"none"}}>
                            Profile &rarr;
                          </a>
                        </div>
                        {/* Join time */}
                        <span style={{fontSize:10,color:T.dim,flexShrink:0}}>
                          First proof {time}
                        </span>
                        {/* Individual shoutout copy */}
                        <button onClick={() => {
                          const t = `Welcome to Proof of Grass @${u.username}! 🌱\n\nDay 1 streak started. Touch grass daily, log your proof, build your legacy.\n\n$TOUCHGRASS #TouchGrass #ProofOfGrass\nproofofgrass.app`;
                          navigator.clipboard.writeText(t).catch(()=>{});
                        }} style={{
                          background:T.bg3,border:`1px solid ${T.border}`,
                          borderRadius:6,padding:"4px 9px",fontSize:10,
                          color:T.dim,cursor:"pointer",flexShrink:0,
                          fontFamily:"'DM Sans',sans-serif"}}>
                          Copy shoutout
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>)}
            </div>

            {/* -- TOP STREAKS --------------------------------------------- */}
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",
              textTransform:"uppercase",color:T.gold,marginBottom:12}}>
              ✦ Top Streaks
            </div>
            <div style={{background:T.bg2,border:`1px solid ${T.borderG}`,
              borderRadius:12,padding:"18px 20px",marginBottom:24}}>
              {stats.top5.map((u, i) => (
                <div key={u.username} style={{display:"flex",alignItems:"center",
                  gap:12,padding:"10px 0",
                  borderBottom: i < stats.top5.length-1 ? `1px solid ${T.border}` : "none"}}>
                  <span style={{fontFamily:"'Georgia',serif",fontSize:18,
                    color:T.gold,fontWeight:700,width:28}}>
                    {["🥇","🥈","🥉"][i] ?? `#${i+1}`}
                  </span>
                  <span style={{fontWeight:700,color:T.white,flex:1}}>@{u.username}</span>
                  <span style={{fontFamily:"'Georgia',serif",fontSize:20,
                    fontWeight:700,color:T.olive}}>
                    🔥 {fmt(u.current_streak)}d
                  </span>
                  <span style={{fontSize:10,color:T.dim}}>best: {fmt(u.best_streak)}d</span>
                </div>
              ))}
            </div>

            {/* -- COPY X POST --------------------------------------------- */}
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",
              textTransform:"uppercase",color:T.olive,marginBottom:12}}>
              ✦ X Post Generator
            </div>
            <div style={{background:T.bg2,border:`1px solid ${T.borderG}`,
              borderRadius:12,padding:"18px 20px",marginBottom:16}}>
              <pre style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,
                color:T.muted,lineHeight:1.7,whiteSpace:"pre-wrap",margin:0}}>
                {generatePost()}
              </pre>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button onClick={copyPost} style={{
                display:"inline-flex",alignItems:"center",gap:8,
                background:T.white,color:T.bg,border:"none",borderRadius:9,
                padding:"11px 22px",fontSize:13,fontWeight:700,cursor:"pointer",
                letterSpacing:"0.04em",fontFamily:"'DM Sans',sans-serif"}}>
                {copied ? "✓ Copied!" : "📋 Copy X Post"}
              </button>
              <button onClick={loadStats} disabled={loading} style={{
                display:"inline-flex",alignItems:"center",gap:8,
                background:"transparent",color:T.olive,
                border:`1px solid ${T.borderG}`,borderRadius:9,
                padding:"11px 22px",fontSize:13,fontWeight:600,cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif"}}>
                Refresh Refresh Stats
              </button>
            </div>

            {/* -- TABLES NOT YET TRACKED --------------------------------- */}
            <div style={{marginTop:32,background:T.bg3,border:`1px solid ${T.border}`,
              borderRadius:12,padding:"16px 20px"}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.14em",
                color:T.dim,textTransform:"uppercase",marginBottom:10}}>
                Stats requiring new tracking (not yet available)
              </div>
              {[
                ["Badges Earned Today", "Add a BadgeLog table with username, badge_id, earned_at"],
                ["Quests Completed Today", "Wire QuestProgress table to DB -- table exists but not populated"],
                ["$TOUCHGRASS Burned", "Track token_amount in ShieldPurchases or add a BurnLog table"],
                ["Referrals Today", "No referral tracking table exists yet"],
              ].map(([stat, fix]) => (
                <div key={stat} style={{display:"flex",gap:10,padding:"7px 0",
                  borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:11,color:T.dim,width:180,flexShrink:0}}>✗ {stat}</span>
                  <span style={{fontSize:11,color:T.dim,fontStyle:"italic"}}>{fix}</span>
                </div>
              ))}
            </div>

          </>)}
        </div>
      </div>
    </>
  );
}