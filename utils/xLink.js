// Connect an X account to a secured Proof of Grass username (OAuth 2.0 authorization code + PKCE).
// Read-only: asks X only "who is this?" (scopes tweet.read users.read), stores the numeric X id and @handle, and
// throws the access token away. We never post, follow or read anything on their behalf, and ask for no refresh token.
import crypto from "node:crypto";

export const X_AUTHORIZE = "https://x.com/i/oauth2/authorize";
export const X_TOKEN = "https://api.x.com/2/oauth2/token";
export const X_ME = "https://api.x.com/2/users/me";
export const X_SCOPES = "tweet.read users.read";
export const X_COOKIE = "pog_x_link";
const TTL_MS = 10 * 60 * 1000;

export const b64u = (buf) => Buffer.from(buf).toString("base64url");

export function xConfig(env = process.env) {
  const id = (env.X_CLIENT_ID || "").trim(), secret = (env.X_CLIENT_SECRET || "").trim();
  const base = (env.NEXTAUTH_URL || "https://proofofgrass.app").replace(/\/$/, "");
  const redirect = (env.X_REDIRECT_URI || `${base}/api/x/callback`).trim();
  return { ok: !!(id && secret && /^https:\/\/|^http:\/\/localhost/.test(redirect)), id, secret, redirect };
}

export function makePkce() {
  const verifier = b64u(crypto.randomBytes(48));
  return { verifier, challenge: b64u(crypto.createHash("sha256").update(verifier).digest()), state: b64u(crypto.randomBytes(24)) };
}

export function authorizeUrl(cfg, { state, challenge }) {
  const q = new URLSearchParams({ response_type: "code", client_id: cfg.id, redirect_uri: cfg.redirect, scope: X_SCOPES, state, code_challenge: challenge, code_challenge_method: "S256" });
  return `${X_AUTHORIZE}?${q}`;
}

// The cookie that carries the PKCE verifier and who started the flow is encrypted and tamper-proof (AES-256-GCM).
function key(env) {
  const s = (env.NEXTAUTH_SECRET || "").trim();
  return s.length >= 16 ? crypto.createHash("sha256").update("pog-x-link:" + s).digest() : null;
}
export function seal(payload, env = process.env, now = Date.now()) {
  const k = key(env); if (!k) throw new Error("NEXTAUTH_SECRET missing");
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(JSON.stringify({ ...payload, e: now + TTL_MS }), "utf8"), c.final()]);
  return b64u(Buffer.concat([iv, c.getAuthTag(), ct]));
}
export function open(token, env = process.env, now = Date.now()) {
  try {
    const k = key(env); if (!k || !token) return null;
    const raw = Buffer.from(String(token), "base64url"); if (raw.length < 29) return null;
    const d = crypto.createDecipheriv("aes-256-gcm", k, raw.subarray(0, 12)); d.setAuthTag(raw.subarray(12, 28));
    const p = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8"));
    return p && p.e > now ? p : null;
  } catch { return null; }
}

export const readCookie = (req, name) => {
  const m = String(req.headers?.cookie || "").split(/;\s*/).find((c) => c.startsWith(name + "="));
  return m ? m.slice(name.length + 1) : "";
};
export const cookieHeader = (value, maxAge, env = process.env) =>
  `${X_COOKIE}=${value}; Path=/api/x; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${env.NODE_ENV === "production" ? "; Secure" : ""}`;

export const sameText = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

async function timed(fetchImpl, url, opts) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 8000);
  try { return await fetchImpl(url, { ...opts, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

// Returns the short-lived access token. Errors carry a code only, never a secret or a response body.
export async function exchangeCode(cfg, { code, verifier }, fetchImpl = fetch) {
  const r = await timed(fetchImpl, X_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: "Basic " + Buffer.from(`${cfg.id}:${cfg.secret}`).toString("base64") },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: cfg.redirect, code_verifier: verifier, client_id: cfg.id }).toString(),
  });
  if (!r.ok) throw Object.assign(new Error("x_token_failed"), { status: r.status });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error("x_token_missing");
  return String(j.access_token);
}

export async function fetchMe(token, fetchImpl = fetch) {
  const r = await timed(fetchImpl, `${X_ME}?user.fields=username,name`, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw Object.assign(new Error("x_me_failed"), { status: r.status });
  const d = (await r.json().catch(() => ({}))).data || {};
  if (!/^\d{1,25}$/.test(String(d.id || "")) || !/^[A-Za-z0-9_]{1,15}$/.test(String(d.username || ""))) throw new Error("x_me_invalid");
  return { id: String(d.id), username: String(d.username), name: String(d.name || "").slice(0, 80) };
}
