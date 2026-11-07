// Shared frame for every /create page: the main site's top bar (with the account chip and menu), the bottom bar on phones,
// the light page background, and an optional "back" link. Wrap each page's content in this.
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import V2Nav from "./V2Nav";
import V2BottomNav from "./V2BottomNav";
import { V2GlobalCSS } from "../utils/v2Theme";
import { T } from "../utils/createTheme";

export default function CreateShell({ title, back, children, noindex }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  useEffect(() => { try { const u = localStorage.getItem("pog_username"); if (u) setUsername(u.replace(/@/g, "").toLowerCase().trim()); } catch {} }, []);
  const toUpload = () => router.push("/#upload");
  return (
    <>
      <Head>
        <title>{title ? `${title} | Touch Grass` : "Creator Hub | Touch Grass"}</title>
        {noindex && <meta name="robots" content="noindex,nofollow" />}
      </Head>
      <style dangerouslySetInnerHTML={{ __html: V2GlobalCSS + `.cs-wrap{min-height:100vh;background:linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 22%,#eef7ea 55%);padding-bottom:84px}
        .cs-back{display:inline-block;margin:14px clamp(14px,4vw,40px) 0;font-size:13px;font-weight:800;color:${T.olive};text-decoration:none}` }} />
      <div className="cs-wrap">
        <V2Nav username={username} onUsernameChange={setUsername} showUpload={toUpload} />
        {back !== false && <Link href={back?.href || "/create"} className="cs-back">← {back?.label || "Creator Hub"}</Link>}
        {children}
        <V2BottomNav username={username} onLogProof={toUpload} onMore={() => {}} />
      </div>
    </>
  );
}
