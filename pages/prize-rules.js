import Head from "next/head";
import Link from "next/link";
import { V2 } from "../utils/v2Theme";

const H = { fontSize: 17, margin: "22px 0 6px", color: V2.forestGreen };
const P = { fontSize: 14.5, lineHeight: 1.6, margin: "0 0 8px", color: "rgba(13,42,5,0.78)" };

export default function PrizeRules() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Nunito',-apple-system,sans-serif" }}>
      <Head><title>Prize Rules — Proof of Grass</title></Head>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 18px 80px" }}>
        <Link href="/" style={{ color: V2.grassDark, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>← Proof of Grass</Link>
        <h1 style={{ fontSize: 28, margin: "14px 0 4px", color: V2.forestGreen }}>Prize Rules</h1>
        <p style={{ ...P, fontSize: 12.5 }}>Version 2026-10-v1</p>

        <h2 style={H}>What prizes are</h2>
        <p style={P}>Sponsors may offer real-world prizes through WAGO Drops: trading cards, merchandise, cash or gift cards, or anything else the sponsor chooses. Each prize page says what the prize is and who is providing it.</p>

        <h2 style={H}>Sponsors provide the prizes</h2>
        <p style={P}>Prizes come from the sponsor, not from Proof of Grass. Value, condition, and availability are the sponsor's responsibility, and we make no promise about a prize's value. Prizes have no cash value to us and can't be exchanged for tokens.</p>

        <h2 style={H}>Found prizes</h2>
        <p style={P}>Some prizes are left at a location with a single-use code. You must be at the location, and the first person to enter a valid code gets that prize. Codes can only be used once, and repeated wrong guesses are limited.</p>

        <h2 style={H}>Shipped prizes</h2>
        <p style={P}>If a prize is shipped, you will be asked to share a shipping address and name. We show you which sponsor will receive it and only share it after you confirm, for that prize only. The sponsor is responsible for shipping and for handling your details under their own policies.</p>

        <h2 style={H}>Who can take part</h2>
        <p style={P}>You must be 18 or older, or have a parent or guardian's permission. Sponsors may add their own limits (for example, regions they can ship to), shown on the prize page.</p>

        <h2 style={H}>Staying safe and fair</h2>
        <p style={P}>Do not trespass, enter private or restricted areas, or put yourself or others at risk. Don't use fake locations, multiple accounts, or share codes you found. We may remove claims or accounts that break these rules, and we can end or change any prize at any time.</p>

        <h2 style={H}>Taxes</h2>
        <p style={P}>You are responsible for any taxes that apply to a prize you receive.</p>

        <h2 style={H}>Questions</h2>
        <p style={P}>Reach out through the Proof of Grass community channels listed on the site.</p>
      </div>
    </div>
  );
}
