import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

const ENV = { NEXTAUTH_SECRET: "x".repeat(40), X_CLIENT_ID: "cid", X_CLIENT_SECRET: "csecret", NEXTAUTH_URL: "https://proofofgrass.app" };
Object.assign(process.env, ENV);

let db, session;
vi.mock("next-auth/next", () => ({ getServerSession: async () => session }));
vi.mock("../pages/api/auth/[...nextauth]", () => ({ authOptions: {} }));
vi.mock("../utils/requireOwner", () => ({
  cleanUsername: (v) => String(v ?? "").replace(/@/g, "").toLowerCase().trim(),
  adminClient: () => ({
    from: (t) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: t === "username_claims" ? db.claim : db.link }) }) }),
      upsert: async (row) => { db.saved = row; return { error: db.upsertError || null }; },
    }),
  }),
}));
const X = await import("../utils/xLink.js");
const { default: start } = await import("../pages/api/x/start.js");
const { default: callback } = await import("../pages/api/x/callback.js");

const mkRes = () => ({ h: {}, setHeader(k, v) { this.h[k] = v; }, redirect(c, u) { this.code = c; this.to = u; return this; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } });
const cfg = X.xConfig(ENV);

describe("X link helpers", () => {
  it("PKCE challenge is the S256 of the verifier and the authorize URL carries no secret", () => {
    const p = X.makePkce();
    expect(p.challenge).toBe(crypto.createHash("sha256").update(p.verifier).digest("base64url"));
    const u = new URL(X.authorizeUrl(cfg, p));
    expect(u.origin + u.pathname).toBe("https://x.com/i/oauth2/authorize");
    expect(u.searchParams.get("scope")).toBe("tweet.read users.read");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("redirect_uri")).toBe("https://proofofgrass.app/api/x/callback");
    expect(u.toString()).not.toContain("csecret"); expect(u.toString()).not.toContain(p.verifier);
  });
  it("sealed cookie round-trips, expires and rejects tampering or the wrong secret", () => {
    const t = X.seal({ u: "dave", g: "g1" }, ENV, 1000);
    expect(X.open(t, ENV, 2000)).toMatchObject({ u: "dave", g: "g1" });
    expect(X.open(t, ENV, 1000 + 11 * 60 * 1000)).toBeNull();
    expect(X.open(t.slice(0, -2) + "AA", ENV, 2000)).toBeNull();
    expect(X.open(t, { NEXTAUTH_SECRET: "y".repeat(40) }, 2000)).toBeNull();
    expect(t).not.toContain("dave");
  });
  it("is unavailable without credentials", () => { expect(X.xConfig({}).ok).toBe(false); });
});

describe("start", () => {
  beforeEach(() => { session = { user: { google_id: "g1" } }; db = { claim: { google_id: "g1" } }; });
  it("redirects to X with an encrypted cookie when the Google account owns the username", async () => {
    const res = mkRes(); await start({ method: "GET", query: { username: "@Dave" }, headers: {} }, res);
    expect(res.code).toBe(302); expect(res.to).toMatch(/^https:\/\/x\.com\/i\/oauth2\/authorize\?/);
    expect(res.h["Set-Cookie"]).toMatch(/pog_x_link=.+HttpOnly.+SameSite=Lax/);
  });
  it("refuses signed-out visitors and people who do not own the username", async () => {
    session = null; let res = mkRes(); await start({ method: "GET", query: { username: "dave" }, headers: {} }, res); expect(res.to).toBe("/?x_link=signin");
    session = { user: { google_id: "other" } }; res = mkRes(); await start({ method: "GET", query: { username: "dave" }, headers: {} }, res); expect(res.to).toBe("/?x_link=not_owner");
  });
});

describe("callback", () => {
  let cookie, state;
  const mkReq = (q) => ({ method: "GET", query: q, headers: { cookie: `pog_x_link=${cookie}` } });
  const fetchOk = (me) => vi.fn(async (url) => String(url).includes("oauth2/token") ? { ok: true, json: async () => ({ access_token: "tok" }) } : { ok: true, json: async () => ({ data: me }) });
  beforeEach(() => {
    session = { user: { google_id: "g1" } }; db = { claim: { google_id: "g1" } };
    const p = X.makePkce(); state = p.state; cookie = X.seal({ u: "dave", g: "g1", s: state, v: p.verifier }, ENV);
    globalThis.fetch = fetchOk({ id: "1234567890", username: "RealKingDave", name: "Dave" });
  });
  it("saves the verified X id and handle, then returns home with ok", async () => {
    const res = mkRes(); await callback(mkReq({ state, code: "abc" }), res);
    expect(res.to).toBe("/?x_link=ok");
    expect(db.saved).toMatchObject({ username: "dave", x_user_id: "1234567890", x_username: "RealKingDave" });
    const tokenCall = globalThis.fetch.mock.calls[0]; expect(tokenCall[1].headers.authorization).toMatch(/^Basic /);
    expect(String(tokenCall[1].body)).toContain("code_verifier=");
    expect(JSON.stringify(db.saved)).not.toContain("tok");
    expect(res.h["Set-Cookie"]).toContain("Max-Age=0");
  });
  it("rejects a wrong state, a missing cookie, a denied request and a different Google account", async () => {
    let res = mkRes(); await callback(mkReq({ state: "nope", code: "abc" }), res); expect(res.to).toBe("/?x_link=expired");
    res = mkRes(); await callback({ method: "GET", query: { state, code: "abc" }, headers: {} }, res); expect(res.to).toBe("/?x_link=expired");
    res = mkRes(); await callback(mkReq({ error: "access_denied" }), res); expect(res.to).toBe("/?x_link=denied");
    session = { user: { google_id: "someone-else" } }; res = mkRes(); await callback(mkReq({ state, code: "abc" }), res); expect(res.to).toBe("/?x_link=signin");
    expect(db.saved).toBeUndefined();
  });
  it("refuses when the username is no longer owned, and when X is already linked elsewhere", async () => {
    db.claim = { google_id: "other" }; let res = mkRes(); await callback(mkReq({ state, code: "abc" }), res); expect(res.to).toBe("/?x_link=not_owner");
    db.claim = { google_id: "g1" }; db.upsertError = { code: "23505" }; res = mkRes(); await callback(mkReq({ state, code: "abc" }), res); expect(res.to).toBe("/?x_link=x_taken");
  });
  it("fails cleanly when X errors, without leaking details", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    const res = mkRes(); await callback(mkReq({ state, code: "abc" }), res); expect(res.to).toBe("/?x_link=x_failed");
  });
});
