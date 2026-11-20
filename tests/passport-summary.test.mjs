import { describe, it, expect, vi, beforeEach } from "vitest";

const W = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
let rows;
vi.mock("../utils/requireOwner", () => {
  const q = (table) => {
    const f = {}; const chain = { select: () => chain, eq: (k, v) => { f[k] = v; return chain; }, in: () => chain,
      maybeSingle: async () => ({ data: table === "Profiles" ? (f.wallet_address === rows.wallet && f.wallet_verified === true ? { username: "TrailTess" } : null) : table === "Streaks" ? { current_streak: 12, best_streak: 30 } : null }),
      then: (ok) => ok({ count: 41 }) };
    return chain;
  };
  return { adminClient: () => ({ from: q, rpc: async () => ({ data: { grove: { name: "Trail Crew" } } }) }) };
});
const { default: handler } = await import("../pages/api/passport/summary.js");

const call = async (method, headers, body) => {
  const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } };
  await handler({ method, headers, body }, res); return res;
};
const SECRET = "a-long-shared-secret-1234";

describe("passport summary (server to server)", () => {
  beforeEach(() => { rows = { wallet: W }; process.env.PASSPORT_PARTNER_SECRET = SECRET; });
  it("refuses without the shared secret, with a wrong one, or when unconfigured", async () => {
    expect((await call("POST", {}, { wallet: W })).code).toBe(401);
    expect((await call("POST", { "x-passport-secret": "nope" }, { wallet: W })).code).toBe(401);
    delete process.env.PASSPORT_PARTNER_SECRET;
    expect((await call("POST", { "x-passport-secret": SECRET }, { wallet: W })).code).toBe(401);
  });
  it("returns the summary only for a verified-linked wallet", async () => {
    const r = await call("POST", { "x-passport-secret": SECRET }, { wallet: W });
    expect(r.code).toBe(200);
    expect(r.body).toEqual({ linked: true, username: "trailtess", streak: 12, best: 30, proofs: 41, grove: "Trail Crew" });
    expect(r.h["Cache-Control"]).toBe("no-store");
  });
  it("says not linked (and reveals nothing) for any other wallet", async () => {
    const r = await call("POST", { "x-passport-secret": SECRET }, { wallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" });
    expect(r.body).toEqual({ linked: false });
  });
  it("validates input and method", async () => {
    expect((await call("POST", { "x-passport-secret": SECRET }, { wallet: "bad" })).code).toBe(400);
    expect((await call("GET", { "x-passport-secret": SECRET }, {})).code).toBe(405);
  });
});
