// Server only. /api/field-guide/classify signs the result of a real photo check; /api/field-guide/entry only
// saves an entry that carries a valid, unexpired signature, so the browser can't write its own "approved" rows.
import crypto from "crypto";

const TTL_MS = 15 * 60 * 1000;
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const body = ({ username, collectionSlug, label, confidence, exp }) =>
  [String(username).toLowerCase(), collectionSlug, label, confidence ?? "", exp].join("|");

export function signApproval({ username, collectionSlug, label, confidence }) {
  const exp = Date.now() + TTL_MS;
  const proof = crypto.createHmac("sha256", secret()).update(body({ username, collectionSlug, label, confidence, exp })).digest("hex");
  return { exp, proof };
}

export function verifyApproval({ username, collectionSlug, label, confidence, exp, proof }) {
  if (!secret() || !proof || !(Number(exp) > Date.now())) return false;
  const want = crypto.createHmac("sha256", secret()).update(body({ username, collectionSlug, label, confidence, exp })).digest("hex");
  const a = Buffer.from(String(proof)), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
