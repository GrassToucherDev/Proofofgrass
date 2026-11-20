import { describe, it, expect, vi } from "vitest";
import { cleanDisplayName, DEFAULT_NAME, pickCover, sortPieces, tokenNumber, looksLikeAddress } from "../utils/passport";
import { passportConfig, classify, fetchHoldings, verifiedImageFor, isPrivateIp, fetchImageSafe, toHttps } from "../utils/passportServer";

const W = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const OTHER = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const ORI = "BjEWJWPEeZPkmQTKHz8oXtRtE82yqp1TrKzq7GmYgA2N";
const ST = "8kDqxcvuiGhTA1qDfa9v4rsuxFHQwuQhwWWaauNZy2BT";
const cfg = { rpc: "https://rpc.example/?api-key=SECRET123", origins: ORI, screenTouchers: ST, ok: true };

const asset = (id, col, owner = W, over = {}) => ({
  id, ownership: { owner }, grouping: col ? [{ group_key: "collection", group_value: col }] : [],
  content: { metadata: { name: over.name || `WAGO Origins #${id.slice(-3)}` }, links: { image: over.image || `https://cdn.example/${id}.png` } }, ...over.extra,
});

describe("display name", () => {
  it("trims, strips control characters, caps length", () => {
    expect(cleanDisplayName("  Trail\u0000   Fan ‮ ")).toBe("Trail Fan");
    expect(cleanDisplayName("trail ".repeat(12)).length).toBeLessThanOrEqual(24);
  });
  it("never lets a wallet address become the printed name", () => {
    expect(cleanDisplayName(W)).toBe("");
    expect(looksLikeAddress(W)).toBe(true);
    expect(DEFAULT_NAME).toBe("WAGO Collector");
  });
});

describe("cover selection", () => {
  const pieces = sortPieces([
    { id: "st1", collection: "screen_touchers", name: "Screen Toucher #5" },
    { id: "o9", collection: "origins", name: "WAGO Origins #204" },
    { id: "o2", collection: "origins", name: "WAGO Origins #12" },
  ]);
  it("puts Origins first, ordered by token number, and auto-selects the first", () => {
    expect(pieces.map((p) => p.id)).toEqual(["o2", "o9", "st1"]);
    expect(pickCover(pieces).id).toBe("o2");
  });
  it("keeps a saved pick only if still owned", () => {
    expect(pickCover(pieces, "o9").id).toBe("o9");
    expect(pickCover(pieces, "gone").id).toBe("o2");
    expect(pickCover([], "o9")).toBeNull();
  });
  it("parses token numbers", () => { expect(tokenNumber("WAGO Origins #204")).toBe(204); expect(tokenNumber("nope")).toBeNull(); });
});

describe("config", () => {
  it("reports missing env vars and never guesses addresses", () => {
    const c = passportConfig({});
    expect(c.ok).toBe(false);
    expect(c.missing).toEqual(expect.arrayContaining(["WAGO_ORIGINS_COLLECTION", "SCREEN_TOUCHERS_COLLECTION"]));
    expect(c.origins).toBe(""); expect(c.screenTouchers).toBe("");
  });
  it("falls back to SOLANA_RPC_URL and rejects malformed addresses", () => {
    expect(passportConfig({ SOLANA_RPC_URL: "https://r", WAGO_ORIGINS_COLLECTION: ORI }).ok).toBe(true);
    expect(passportConfig({ SOLANA_RPC_URL: "https://r", WAGO_ORIGINS_COLLECTION: "not-an-address" }).ok).toBe(false);
  });
});

describe("collection verification", () => {
  it("keeps only verified members of the configured collections owned by this wallet", () => {
    const out = classify([
      asset("aaa111", ORI), asset("bbb222", ST), asset("ccc333", "SomeOtherCollection1111111111111111111111"),
      asset("ddd444", null), asset("eee555", ORI, OTHER), asset("fff666", ORI, W, { extra: { burnt: true } }),
    ], W, cfg);
    expect(out.map((p) => [p.id, p.collection])).toEqual([["aaa111", "origins"], ["bbb222", "screen_touchers"]]);
  });
  it("skips assets with no usable https image and converts ipfs links", () => {
    expect(classify([asset("a1", ORI, W, { image: "http://insecure/a.png" })], W, cfg)).toEqual([]);
    expect(toHttps("ipfs://bafy/1.png", {})).toBe("https://ipfs.io/ipfs/bafy/1.png");
  });
});

describe("holdings lookup", () => {
  it("pages through results and scrubs the RPC key from errors", async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => asset("n" + i, "Other11111111111111111111111111111111111"));
    const f = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: { items: page1 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: { items: [asset("last01", ORI)] } }) });
    const out = await fetchHoldings(W, cfg, { fetchImpl: f });
    expect(f).toHaveBeenCalledTimes(2);
    expect(out.map((p) => p.id)).toEqual(["last01"]);
    const bad = vi.fn().mockRejectedValue(new Error("boom https://rpc.example/?api-key=SECRET123"));
    await expect(fetchHoldings(W, cfg, { fetchImpl: bad })).rejects.toThrow(/\[rpc\]/);
    await expect(fetchHoldings(W, cfg, { fetchImpl: bad })).rejects.not.toThrow(/SECRET123/);
  });
  it("returns nothing for an empty wallet", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { items: [] } }) });
    expect(await fetchHoldings(W, cfg, { fetchImpl: f })).toEqual([]);
  });
});

describe("image route guards", () => {
  it("only resolves images for verified collection members", async () => {
    const f = (a) => vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: a }) });
    expect(await verifiedImageFor(W, cfg, { fetchImpl: f(asset("x", ORI)) })).toBe("https://cdn.example/x.png");
    expect(await verifiedImageFor(W, cfg, { fetchImpl: f(asset("x", "Other11111111111111111111111111111111111")) })).toBeNull();
    expect(await verifiedImageFor("bad!", cfg, { fetchImpl: f(asset("x", ORI)) })).toBeNull();
  });
  it("blocks private and non-https targets", async () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.9", "169.254.169.254", "172.20.0.1", "::1", "fd00::1"]) expect(isPrivateIp(ip)).toBe(true);
    expect(isPrivateIp("93.184.216.34")).toBe(false);
    await expect(fetchImageSafe("http://93.184.216.34/a.png", { fetchImpl: vi.fn() })).rejects.toThrow();
    await expect(fetchImageSafe("https://169.254.169.254/latest", { fetchImpl: vi.fn() })).rejects.toThrow(/blocked/);
  });
  it("accepts images, rejects other types and re-checks redirects", async () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    const ok = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "image/png" }), arrayBuffer: async () => png.buffer });
    expect((await fetchImageSafe("https://93.184.216.34/a.png", { fetchImpl: ok })).type).toBe("image/png");
    const html = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "text/html" }), arrayBuffer: async () => png.buffer });
    await expect(fetchImageSafe("https://93.184.216.34/a", { fetchImpl: html })).rejects.toThrow(/not an image/);
    const redir = vi.fn().mockResolvedValue({ ok: false, status: 302, headers: new Headers({ location: "https://127.0.0.1/x" }) });
    await expect(fetchImageSafe("https://93.184.216.34/a", { fetchImpl: redir })).rejects.toThrow(/blocked/);
  });
});
