// components/BuyGate.js
// Shared "secure your username" gate used before any purchase (Marketplace items, banners, and WAGO Wheel spins).
import { V2, V2Styles } from "../utils/v2Theme";
import { signIn } from "next-auth/react";
import SecureUsernameCard from "./SecureUsernameCard";

// Individual purchases need a username secured by the signed-in Google account (the server enforces it too).
// This is checked BEFORE the wallet opens so nobody pays and then fails verification.
export default function BuyGate({ username, status, item, onClose, onReady }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div role="dialog" aria-label="Secure your username" style={{ background:"white", borderRadius:20, padding:"26px 22px", maxWidth:420, width:"100%", boxShadow:"0 20px 60px rgba(26,74,10,0.25)" }}>
        <div style={{ fontFamily:V2.fontSans, fontWeight:800, fontSize:20, color:V2.forestGreen, marginBottom:8 }}>Secure your username to buy</div>
        {!username ? (
          <p style={{ fontSize:14, color:V2.textBody, lineHeight:1.6 }}>Enter your username in the top bar first.</p>
        ) : status?.claimed && status?.signedIn && !status?.mine ? (
          <p style={{ fontSize:14, color:V2.textBody, lineHeight:1.6 }}>@{username} belongs to a different Google account. Sign in with the account that secured it.</p>
        ) : status?.claimed ? (
          <>
            <p style={{ fontSize:14, color:V2.textBody, lineHeight:1.6, margin:"0 0 14px" }}>@{username} is secured by a Google account. Sign in with it to buy {item?.name}. This makes sure purchases always land on the right account.</p>
            <button onClick={()=>signIn("google")} style={{ ...V2Styles.btnPrimary, padding:"10px 20px" }}>Continue with Google</button>
          </>
        ) : (
          <>
            <p style={{ fontSize:14, color:V2.textBody, lineHeight:1.6, margin:"0 0 14px" }}>Purchases are tied to a username secured with your Google account, so nobody else can claim your payment. It takes a few seconds.</p>
            <SecureUsernameCard username={username} onClaimed={onReady} />
          </>
        )}
        <button onClick={onClose} style={{ ...V2Styles.btnSecondary, marginTop:14, fontSize:13, padding:"8px 18px" }}>Cancel</button>
      </div>
    </div>
  );
}
