// Admin: team token tracker. Wallet list + notes live in team_wallets; balances are read live from Solana.
// Needs x-admin-secret. GET = wallets with live balances; GET ?history=1&days=N = totals over time; POST { action: add | update | delete }.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/wheel";
import { loadWallets, snapshotIfDue, history, refreshWallet, tokenSupply, saveSnapshotRows, KINDS, ADDR, SOL } from "../../../utils/teamWallets";

export const config = { maxDuration: 30 };

const cleanExpected = (arr) => (Array.isArray(arr) ? arr : []).map((e) => ({
  mint: String(e?.mint || "").trim(), symbol: String(e?.symbol || "").trim().slice(0, 24),
  amount: e?.amount === "" || e?.amount == null ? null : Number(e.amount),
})).filter((e) => e.mint && (e.mint === SOL || ADDR.test(e.mint)) && (e.amount == null || Number.isFinite(e.amount)));

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    if (req.query.list) {            // wallets and notes only, no Solana calls: instant
      const { data: rows, error } = await db.from("team_wallets").select("*").order("sort").order("created_at");
      if (error) return res.status(500).json({ error: /does not exist/.test(error.message) ? "Run team_wallets.sql in Supabase first." : error.message });
      return res.status(200).json({ wallets: rows || [] });
    }
    if (req.query.id) {              // one wallet's live balances
      const { data: w } = await db.from("team_wallets").select("*").eq("id", String(req.query.id)).maybeSingle();
      if (!w) return res.status(404).json({ error: "Wallet not found." });
      return res.status(200).json(await refreshWallet(db, w, req.query.fresh === "1"));
    }
    if (req.query.supply) { try { return res.status(200).json({ tg_supply: await tokenSupply() }); } catch { return res.status(200).json({ tg_supply: null }); } }
    if (req.query.history) return res.status(200).json(await history(db, Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365)));
    const r = await loadWallets(db);
    if (r.error) return res.status(500).json({ error: r.error });
    await snapshotIfDue(db, r, 6 * 3600 * 1000);   // lazy snapshot when you open the page, at most every 6 hours
    return res.status(200).json(r);
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if ((req.body || {}).action === "snapshot") return res.status(200).json({ saved: await saveSnapshotRows(db, req.body.rows, 6 * 3600 * 1000) });
  const { action, id, label, address, kind, purpose, notes, expected, locked, unlock_date, lock_url } = req.body || {};
  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id." });
    const { error } = await db.from("team_wallets").delete().eq("id", id);
    return error ? res.status(400).json({ error: error.message }) : res.status(200).json({ ok: true });
  }
  if (action !== "add" && action !== "update") return res.status(400).json({ error: "Unknown action." });
  const addr = String(address || "").trim();
  if (!String(label || "").trim()) return res.status(400).json({ error: "Give the wallet a label." });
  if (!ADDR.test(addr)) return res.status(400).json({ error: "That doesn't look like a Solana address." });
  const lu = String(lock_url || "").trim();
  if (lu) { let ok = false; try { const u = new URL(lu); ok = u.protocol === "https:" || u.protocol === "http:"; } catch {} if (!ok || lu.length > 500) return res.status(400).json({ error: "The lock link must be a full web address starting with https://" }); }
  const ud = String(unlock_date || "").trim();
  if (ud && !(/^\d{4}-\d{2}-\d{2}$/.test(ud) && !Number.isNaN(Date.parse(ud + "T00:00:00Z")))) return res.status(400).json({ error: "Unlock date must be a real date." });
  const row = { label: String(label).trim().slice(0, 80), address: addr, kind: KINDS.includes(kind) ? kind : "team", locked: locked === true, unlock_date: locked === true && ud ? ud : null, lock_url: locked === true && lu ? lu : null, purpose: String(purpose || "").trim().slice(0, 200) || null,
    notes: String(notes || "").trim().slice(0, 2000) || null, expected: cleanExpected(expected), updated_at: new Date().toISOString() };
  if (action === "update") {        // only a changed address or expected-holdings list needs a fresh read; notes, labels and locks do not
    const { data: cur } = await db.from("team_wallets").select("address, expected").eq("id", id).maybeSingle();
    if (!cur || cur.address !== addr || JSON.stringify(cur.expected || []) !== JSON.stringify(row.expected)) Object.assign(row, { holdings: null, usd: null, refreshed_at: null, read_error: null });
  }
  const q = action === "add" ? db.from("team_wallets").insert(row).select("id").single() : db.from("team_wallets").update(row).eq("id", id).select("id").single();
  let { data: saved, error } = await q;
  if (error && /holdings|refreshed_at|read_error/.test(error.message)) {      // cache columns not added yet: save without them
    for (const k of ["holdings", "usd", "refreshed_at", "read_error"]) delete row[k];
    ({ data: saved, error } = await (action === "add" ? db.from("team_wallets").insert(row).select("id").single() : db.from("team_wallets").update(row).eq("id", id).select("id").single()));
  }
  if (error) return res.status(400).json({ error: /duplicate/.test(error.message) ? "That wallet is already tracked." : error.message });
  return res.status(200).json({ ok: true, id: saved?.id });
}
