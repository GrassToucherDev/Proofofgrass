// Admin: team token tracker. Wallet list + notes live in team_wallets; balances are read live from Solana, never stored.
// Needs x-admin-secret. GET = wallets with live balances; POST { action: add | update | delete }.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/wheel";

const RPC = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOL = "SOL", SOL_MINT = "So11111111111111111111111111111111111111112";
const TG_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const KNOWN = { [TG_MINT]: "TOUCHGRASS", [SOL_MINT]: "SOL" };
const PROGRAMS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];

async function rpc(method, params) {
  const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "rpc error");
  return j.result;
}

async function liveBalances(address) {
  const [sol, ...tok] = await Promise.all([
    rpc("getBalance", [address]),
    ...PROGRAMS.map((p) => rpc("getTokenAccountsByOwner", [address, { programId: p }, { encoding: "jsonParsed" }])),
  ]);
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
    const live = await Promise.all((rows || []).map((w) => liveBalances(w.address).then((b) => ({ ok: true, ...b })).catch((e) => ({ ok: false, error: e.message }))));
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
    return res.status(200).json({ wallets, total_usd: total, as_of: new Date().toISOString() });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { action, id, label, address, purpose, notes, expected } = req.body || {};
  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id." });
    const { error } = await db.from("team_wallets").delete().eq("id", id);
    return error ? res.status(400).json({ error: error.message }) : res.status(200).json({ ok: true });
  }
  if (action !== "add" && action !== "update") return res.status(400).json({ error: "Unknown action." });
  const addr = String(address || "").trim();
  if (!String(label || "").trim()) return res.status(400).json({ error: "Give the wallet a label." });
  if (!ADDR.test(addr)) return res.status(400).json({ error: "That doesn't look like a Solana address." });
  const row = { label: String(label).trim().slice(0, 80), address: addr, purpose: String(purpose || "").trim().slice(0, 200) || null,
    notes: String(notes || "").trim().slice(0, 2000) || null, expected: cleanExpected(expected), updated_at: new Date().toISOString() };
  const q = action === "add" ? db.from("team_wallets").insert(row) : db.from("team_wallets").update(row).eq("id", id);
  const { error } = await q;
  if (error) return res.status(400).json({ error: /duplicate/.test(error.message) ? "That wallet is already tracked." : error.message });
  return res.status(200).json({ ok: true });
}
