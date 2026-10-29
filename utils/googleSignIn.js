// One place for "Continue with Google", so signing back in is as quick as possible.
//
// We remember the Google email (this device only, in localStorage) after a successful sign-in and pass it
// to Google as login_hint. If the session cookie ever lapses, the next sign-in skips the account chooser.
import { signIn } from "next-auth/react";

const KEY = "pog_google_hint";

export function rememberGoogleHint(email) {
  try { if (email) localStorage.setItem(KEY, String(email)); } catch {}
}

export function getGoogleHint() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

// Same signature as next-auth's signIn("google", options), minus the provider.
export function signInWithGoogle(options, authorizationParams) {
  const hint = getGoogleHint();
  const params = hint ? { login_hint: hint, ...(authorizationParams || {}) } : authorizationParams;
  return signIn("google", options, params);
}
