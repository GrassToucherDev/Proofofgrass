// Every caption we hand to X / the share sheet carries the same tags and the @XTouchGrass handle, and every proofofgrass.app link in it
// carries the sender's ?ref= so a signup from a shared post is credited to them.
// withShareTags() is idempotent: tags and ?ref= already in the text are not repeated.
export const SHARE_TAGS = ["$TOUCHGRASS", "#TouchGrass", "#ProofOfGrass", "@XTouchGrass"];

function myName() {
  try { return (typeof localStorage !== "undefined" ? localStorage.getItem("pog_username") || "" : "").toLowerCase().replace(/@/g, "").trim(); }
  catch { return ""; }
}

// proofofgrass.app with an optional /path, not already followed by a query string.
const LINK = /((?:https?:\/\/)?(?:www\.)?proofofgrass\.app)(\/[^\s?#]*)?(?![\w?#/.-])/gi;

export function withShareLink(text, user = myName()) {
  const base = String(text ?? "").trimEnd();
  const ref = user ? `ref=${encodeURIComponent(user)}` : "";
  let found = /proofofgrass\.app/i.test(base);
  const out = base.replace(LINK, (m, host, path = "") => {
    if (!ref) return m;
    return `${host}${path || "/"}?${ref}`;
  });
  if (found) return out;
  return `${base}${base ? "\n\n" : ""}Start your streak: proofofgrass.app/${ref ? "?" + ref : ""}`;
}

export function withShareTags(text) {
  const base = withShareLink(text);
  const lower = base.toLowerCase();
  const missing = SHARE_TAGS.filter((t) => !lower.includes(t.toLowerCase()));
  if (!missing.length) return base;
  return `${base}${base ? "\n\n" : ""}${missing.join(" ")}`;
}
