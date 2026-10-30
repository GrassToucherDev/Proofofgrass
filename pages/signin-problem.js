import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signInWithGoogle } from "../utils/googleSignIn";
import { explainSigninError, safeReturnPath } from "../utils/signinError";

// Where NextAuth sends people when a Google sign-in fails. Shows what happened and lets them retry,
// instead of dropping them on an unrelated page.
export default function SigninProblem() {
  const { query } = useRouter();
  const back = safeReturnPath(query.callbackUrl);
  const msg = explainSigninError(typeof query.error === "string" ? query.error : "");
  return (
    <div style={{ minHeight: "100vh", background: "#080a06", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito',sans-serif", color: "#f0efea", textAlign: "center", padding: 24 }}>
      <Head><title>Sign-in problem · Proof of Grass</title><meta name="robots" content="noindex" /></Head>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
      <h1 style={{ fontFamily: "'Georgia',serif", fontSize: 26, fontWeight: 700, marginBottom: 12 }}>Sign-in didn't work</h1>
      <p style={{ fontSize: 14, color: "rgba(240,239,234,0.65)", lineHeight: 1.7, maxWidth: 340 }}>{msg}</p>
      <p style={{ fontSize: 13, color: "rgba(240,239,234,0.5)", lineHeight: 1.7, maxWidth: 340, marginTop: 10 }}>
        Tip: if you opened this from another app, tap the menu and choose "Open in Safari" or "Open in Chrome", then try again. Your streak and proofs are safe.
      </p>
      <button onClick={() => signInWithGoogle({ callbackUrl: back })}
        style={{ marginTop: 26, background: "#93a85a", color: "#080a06", border: "none", borderRadius: 9, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>
        Try Google sign-in again
      </button>
      <Link href={back} style={{ marginTop: 16, fontSize: 13, color: "rgba(240,239,234,0.5)", textDecoration: "underline" }}>Go back</Link>
    </div>
  );
}
