// Shared by the admin API and the daily snapshot cron: team wallets + live Solana balances + prices.
const RPC = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
export const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const KINDS = ["team", "holder", "friends", "other"];
export const SOL = "SOL", SOL_MINT = "So11111111111111111111111111111111111111112";
export const TG_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
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


// One wallet's live view (holdings, USD) built from its balances and prices.
function buildView(w, l, px) {
  const usdOf = (mint, amt) => { const p = px[mint === SOL ? SOL_MINT : mint]; return p ? amt * p.usd : null; };
  const held = [{ mint: SOL, symbol: "SOL", amount: l.sol }, ...Object.entries(l.tokens).filter(([, a]) => a > 0).map(([m, a]) => ({ mint: m, amount: a }))];
  const exp = Object.fromEntries((w.expected || []).map((e) => [e.mint, e]));
  const holdings = held.map((h) => {
    const e = exp[h.mint]; const symbol = e?.symbol || KNOWN[h.mint] || px[h.mint]?.symbol || null;
    return { ...h, symbol, usd: usdOf(h.mint, h.amount), expected: e?.amount ?? null, tracked: !!e };
  }).filter((h) => h.tracked || h.mint === SOL || h.symbol);
  // expected tokens the wallet doesn't hold at all
  for (const e of w.expected || []) if (!held.find((h) => h.mint === e.mint)) holdings.push({ mint: e.mint, symbol: e.symbol || KNOWN[e.mint] || null, amount: 0, usd: 0, expected: e.amount ?? null, tracked: true });
  return { holdings, usd: holdings.reduce((s, h) => s + (h.usd || 0), 0) };
}

// Used by the page, one wallet per request, so a long list can never run into the server time limit.
export async function walletView(w) {
  const l = await cached("bal:" + w.address, () => liveBalances(w.address));
  const mints = [...new Set([SOL_MINT, TG_MINT, ...Object.keys(l.tokens), ...(w.expected || []).map((e) => e.mint).filter((m) => m !== SOL)])].sort();
  const px = await cached("px:" + mints.join(","), () => prices(mints));
  return buildView(w, l, px);
}
export async function tokenSupply() {
  const r = await cached("supply", () => rpc("getTokenSupply", [TG_MINT]));
  return Number(r?.value?.uiAmount) || null;
}

// Everything at once (the nightly snapshot job). Fine with a dedicated RPC; the page itself loads wallet by wallet.
export async function loadWallets(db) {
  const { data: rows, error } = await db.from("team_wallets").select("*").order("sort").order("created_at");
  if (error) return { error: /does not exist/.test(error.message) ? "Run team_wallets.sql in Supabase first." : error.message };
  const conc = process.env.SOLANA_RPC_URL ? 6 : 2;
  const views = await mapLimit(rows || [], conc, (w) => walletView(w).then((v) => ({ ok: true, ...v })).catch((e) => ({ ok: false, error: e.message })));
  const wallets = (rows || []).map((w, i) => (views[i].ok ? { ...w, holdings: views[i].holdings, usd: views[i].usd } : { ...w, error: views[i].error, holdings: [], usd: null }));
  let supply = null; try { supply = await tokenSupply(); } catch {}
  const agg = aggregate(wallets);
  return { wallets, ...agg, tg_supply: supply, complete: wallets.every((w) => !w.error), as_of: new Date().toISOString() };
}

export function aggregate(wallets) {
  const by_kind = {}; let locked_tg = 0, total_usd = 0;
  for (const w of wallets) { const k = w.kind || "team"; by_kind[k] = by_kind[k] || { usd: 0, count: 0, tg: 0, locked_tg: 0 };
    const tg = (w.holdings || []).find((h) => h.mint === TG_MINT)?.amount || 0;
    by_kind[k].usd += w.usd || 0; by_kind[k].count += 1; by_kind[k].tg += tg; total_usd += w.usd || 0;
    if (w.locked) { by_kind[k].locked_tg += tg; locked_tg += tg; } }
  return { by_kind, locked_tg, total_usd };
}

// ---- history: one snapshot batch = one timestamp across every wallet. Only written when every wallet was read OK, so totals never dip falsely. ----
export async function snapshotIfDue(db, r, minGapMs = 0) {
  if (!r.complete || !r.wallets.length) return false;
  if (minGapMs) {
    const { data: last } = await db.from("team_wallet_snapshots").select("taken_at").order("taken_at", { ascending: false }).limit(1);
    if (last?.[0] && Date.now() - new Date(last[0].taken_at).getTime() < minGapMs) return false;
  }
  const at = new Date().toISOString();
  const rows = r.wallets.map((w) => ({
    taken_at: at, address: w.address, kind: w.kind || "team",
    tg_amount: (w.holdings || []).find((h) => h.mint === TG_MINT)?.amount || 0,
    sol_amount: (w.holdings || []).find((h) => h.mint === SOL)?.amount || 0,
    usd: w.usd || 0,
  }));
  const { error } = await db.from("team_wallet_snapshots").insert(rows);
  return !error;
}

export async function history(db, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await db.from("team_wallet_snapshots").select("taken_at, kind, tg_amount, usd").gte("taken_at", since).order("taken_at").limit(50000);
  if (error) return { error: /does not exist/.test(error.message) ? "Run team_wallet_snapshots.sql in Supabase first." : error.message, points: [] };
  const by = new Map();
  for (const r of data || []) {
    const p = by.get(r.taken_at) || { t: r.taken_at, tg: { all: 0 }, usd: { all: 0 } };
    p.tg[r.kind] = (p.tg[r.kind] || 0) + Number(r.tg_amount || 0); p.tg.all += Number(r.tg_amount || 0);
    p.usd[r.kind] = (p.usd[r.kind] || 0) + Number(r.usd || 0); p.usd.all += Number(r.usd || 0);
    by.set(r.taken_at, p);
  }
  return { points: [...by.values()] };
}

// The page posts the numbers it just loaded (only when every wallet read OK). Addresses are checked against our own list.
export async function saveSnapshotRows(db, rows, minGapMs) {
  const { data: mine } = await db.from("team_wallets").select("address, kind");
  const known = new Map((mine || []).map((w) => [w.address, w.kind || "team"]));
  const clean = (Array.isArray(rows) ? rows : []).filter((r) => known.has(r?.address)).map((r) => ({ address: r.address, kind: known.get(r.address),
    tg_amount: Math.max(0, Number(r.tg_amount) || 0), sol_amount: Math.max(0, Number(r.sol_amount) || 0), usd: Math.max(0, Number(r.usd) || 0) }));
  if (!clean.length || clean.length !== known.size) return false;     // must cover every tracked wallet, so totals stay comparable
  if (minGapMs) {
    const { data: last } = await db.from("team_wallet_snapshots").select("taken_at").order("taken_at", { ascending: false }).limit(1);
    if (last?.[0] && Date.now() - new Date(last[0].taken_at).getTime() < minGapMs) return false;
  }
  const at = new Date().toISOString();
  const { error } = await db.from("team_wallet_snapshots").insert(clean.map((r) => ({ ...r, taken_at: at })));
  return !error;
}
