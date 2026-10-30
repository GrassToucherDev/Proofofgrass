// Pure helpers for the sign-in problem page.
// Only same-site relative paths are allowed as a return target, so the error page can never be used as an open redirect.
export function safeReturnPath(raw) {
  if (typeof raw !== "string") return "/";
  let p = raw;
  try { const u = new URL(raw, "https://proofofgrass.app"); if (u.origin === "https://proofofgrass.app" || /^https?:\/\/(www\.)?proofofgrass\.app$/i.test(u.origin)) p = u.pathname + u.search; } catch { return "/"; }
  if (!p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\") || p.startsWith("/signin-problem") || p.startsWith("/api/auth")) return "/";
  return p;
}

// Plain-language reason for each NextAuth error code. Unknown codes fall back to the generic message.
export function explainSigninError(code) {
  switch (code) {
    case "OAuthCallback":
    case "Callback":
    case "OAuthSignin":
      return "Google sign-in didn't finish. This usually happens when the sign-in screen was opened inside another app's built-in browser (X, Instagram, Telegram), the page was refreshed or the back button was used partway through, or sign-in was cancelled.";
    case "AccessDenied":
      return "Google sign-in was cancelled or not allowed for that account.";
    case "OAuthAccountNotLinked":
    case "OAuthCreateAccount":
      return "That Google account couldn't be used to sign in. Try the Google account you used before.";
    case "Configuration":
      return "Sign-in is having a problem on our side. Please try again in a few minutes.";
    default:
      return "Something went wrong while signing you in.";
  }
}
