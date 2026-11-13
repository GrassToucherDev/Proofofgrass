// Admin: team token tracker. Wallet list + notes live in team_wallets; balances are read live from Solana, never stored.
// Needs x-admin-secret. GET = wallets with live balances; POST { action: add | update | delete }.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/wheel";

export const config = { maxDuration: 30 };
const RPC = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const KINDS = ["team", "holder", "other"];
const SOL = "SOL", SOL_MINT = "So11111111111111111111111111111111111111112";
const TG_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const KNOWN = { [TG_MINT]: "TOUCHGRASS", [SOL_MINT]: "SOL" };
const PROGRAMS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The free public RPC rate-limits hard (HTTP 429), so: retry with backoff, and read the response as text before parsing.
async function rpc(method, params) {
  let lastErr = "rpc error";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      const txt = await r.text();
      if (r.status === 429 || /too many requests/i.test(txt.slice(0, 80))) { lastErr = "The Solana RPC is rate-limiting us (too many requests)"; await sleep(700 * 2 ** attempt); continue; }
      let j; try { j = JSON.parse(txt); } catch { throw new Error(`RPC returned a non-JSON response (HTTP ${r.status})`); }
      if (j.error) { if (/rate|limit|too many/i.test(j.error.message || "")) { lastErr = "The Solana RPC is rate-limiting us"; await sleep(700 * 2 ** attempt); continue; } throw new Error(j.error.message || "rpc error"); }
      return j.result;
    } catch (e) { lastErr = e.message || lastErr; if (attempt === 3) break; await sleep(400 * 2 ** attempt); }
  }
  throw new Error(lastErr);
}

// Small in-memory cache (per server instance) so Refresh doesn't re-hit the RPC for every wallet.
const CACHE = new Map(); const TTL = 45_000;
async function cached(key, fn) {
  const hit = CACHE.get(key); if (hit && Date.now() - hit.t < TTL) return hit.v;
  const v = await fn(); CACHE.set(key, { t: Date.now(), v }); return v;
}
async function mapLimit(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

async function liveBalances(address) {
  const sol = await rpc("getBalance", [address]);
  const tok = [];
  for (const p of PROGRAMS) tok.push(await rpc("getTokenAccountsByOwner", [address, { programId: p }, { encoding: "jsonParsed" }]));
  const byMint = {};
  for (const t of tok) for (const a of t?.value || []) {
    const info = a.account?.data?.parsed?.info; if (!info) continue;
    const amt = Number(info.tokenAmount?.uiAmount || 0);
    byMint[info.mint] = (byMint[info.mint] || 0) + amt;
  }
  return { sol: (sol?.value || 0) / 1e9, tokens: byMint };
}

async function prices(mints) {
  const out = {}; const list = [...new Set(mints)].slice(0, 30);
  if (!list.length) return out;
  try {
    const r = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${list.join(",")}`);
    if (!r.ok) return out;
    const pairs = await r.json();
    for (const p of Array.isArray(pairs) ? pairs : []) {
      const m = p?.baseToken?.address; const usd = parseFloat(p?.priceUsd);
      if (m && usd > 0 && (!out[m] || (p.liquidity?.usd || 0) > out[m].liq)) out[m] = { usd, liq: p.liquidity?.usd || 0, symbol: p.baseToken?.symbol };
    }
  } catch {}
  return out;
}

const cleanExpected = (arr) => (Array.isArray(arr) ? arr : []).map((e) => ({
  mint: String(e?.mint || "").trim(), symbol: String(e?.symbol || "").trim().slice(0, 24),
  amount: e?.amount === "" || e?.amount == null ? null : Number(e.amount),
})).filter((e) => e.mint && (e.mint === SOL || ADDR.test(e.mint)) && (e.amount == null || Number.isFinite(e.amount)));

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const { data: rows, error } = await db.from("team_wallets").select("*").order("sort").order("created_at");
    if (error) return res.status(500).json({ error: /does not exist/.test(error.message) ? "Run team_wallets.sql in Supabase first." : error.message });
    const live = await mapLimit(rows || [], 2, (w) => cached("bal:" + w.address, () => liveBalances(w.address)).then((b) => ({ ok: true, ...b })).catch((e) => ({ ok: false, error: e.message })));
    const mints = new Set([SOL_MINT, TG_MINT]);
    live.forEach((l) => l.ok && Object.keys(l.tokens).forEach((m) => mints.add(m)));
    (rows || []).forEach((w) => (w.expected || []).forEach((e) => e.mint !== SOL && mints.add(e.mint)));
    const px = await prices([...mints]);
    const usdOf = (mint, amt) => { const p = px[mint === SOL ? SOL_MINT : mint]; return p ? amt * p.usd : null; };

    let total = 0;
    const wallets = (rows || []).map((w, i) => {
      const l = live[i];
      if (!l.ok) return { ...w, error: l.error, holdings: [], usd: null };
      const held = [{ mint: SOL, symbol: "SOL", amount: l.sol }, ...Object.entries(l.tokens).filter(([, a]) => a > 0).map(([m, a]) => ({ mint: m, amount: a }))];
      const exp = Object.fromEntries((w.expected || []).map((e) => [e.mint, e]));
      const holdings = held.map((h) => {
        const e = exp[h.mint]; const symbol = e?.symbol || KNOWN[h.mint] || px[h.mint]?.symbol || null;
        return { ...h, symbol, usd: usdOf(h.mint, h.amount), expected: e?.amount ?? null, tracked: !!e };
      }).filter((h) => h.tracked || h.mint === SOL || h.symbol);
      // expected tokens the wallet doesn't hold at all
      for (const e of w.expected || []) if (!held.find((h) => h.mint === e.mint)) holdings.push({ mint: e.mint, symbol: e.symbol || KNOWN[e.mint] || null, amount: 0, usd: 0, expected: e.amount ?? null, tracked: true });
      const usd = holdings.reduce((s, h) => s + (h.usd || 0), 0); total += usd;
      return { ...w, holdings, usd };
    });
    let supply = null;
    try { const r = await cached("supply", () => rpc("getTokenSupply", [TG_MINT])); supply = Number(r?.value?.uiAmount) || null; } catch {}
    const by_kind = {};
    for (const w of wallets) { const k = w.kind || "team"; by_kind[k] = by_kind[k] || { usd: 0, count: 0, tg: 0 };
      by_kind[k].usd += w.usd || 0; by_kind[k].count += 1; by_kind[k].tg += (w.holdings || []).find((h) => h.mint === TG_MINT)?.amount || 0; }
    return res.status(200).json({ wallets, total_usd: total, by_kind, tg_supply: supply, as_of: new Date().toISOString() });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { action, id, label, address, kind, purpose, notes, expected } = req.body || {};
  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id." });
    const { error } = await db.from("team_wallets").delete().eq("id", id);
    return error ? res.status(400).json({ error: error.message }) : res.status(200).json({ ok: true });
  }
  if (action !== "add" && action !== "update") return res.status(400).json({ error: "Unknown action." });
  const addr = String(address || "").trim();
  if (!String(label || "").trim()) return res.status(400).json({ error: "Give the wallet a label." });
  if (!ADDR.test(addr)) return res.status(400).json({ error: "That doesn't look like a Solana address." });
  const row = { label: String(label).trim().slice(0, 80), address: addr, kind: KINDS.includes(kind) ? kind : "team", purpose: String(purpose || "").trim().slice(0, 200) || null,
    notes: String(notes || "").trim().slice(0, 2000) || null, expected: cleanExpected(expected), updated_at: new Date().toISOString() };
  const q = action === "add" ? db.from("team_wallets").insert(row) : db.from("team_wallets").update(row).eq("id", id);
  const { error } = await q;
  if (error) return res.status(400).json({ error: /duplicate/.test(error.message) ? "That wallet is already tracked." : error.message });
  return res.status(200).json({ ok: true });
}
