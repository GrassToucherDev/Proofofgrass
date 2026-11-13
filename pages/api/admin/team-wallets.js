// Admin: team token tracker. Wallet list + notes live in team_wallets; balances are read live from Solana.
// Needs x-admin-secret. GET = wallets with live balances; GET ?history=1&days=N = totals over time; POST { action: add | update | delete }.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/wheel";
import { loadWallets, snapshotIfDue, history, KINDS, ADDR, SOL } from "../../../utils/teamWallets";

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
    if (req.query.history) return res.status(200).json(await history(db, Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365)));
    const r = await loadWallets(db);
    if (r.error) return res.status(500).json({ error: r.error });
    await snapshotIfDue(db, r, 6 * 3600 * 1000);   // lazy snapshot when you open the page, at most every 6 hours
    return res.status(200).json(r);
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
