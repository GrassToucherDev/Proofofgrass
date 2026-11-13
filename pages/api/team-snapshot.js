// Daily snapshot of team wallet balances for the tracker graph. Vercel cron (Authorization: Bearer $CRON_SECRET) or admin (x-admin-secret).
import { timingSafeEqual } from "crypto";
import { isAdminRequest } from "../../utils/adminApi";
import { adminClient } from "../../utils/wheel";
import { loadWallets, snapshotIfDue } from "../../utils/teamWallets";

export const config = { maxDuration: 60 };

function isCron(req) {
  const secret = process.env.CRON_SECRET; const given = String(req.headers.authorization || "");
  if (!secret || !given.startsWith("Bearer ")) return false;
  const a = Buffer.from(given.slice(7)), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAdminRequest(req) && !isCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  const r = await loadWallets(db);
  if (r.error) return res.status(500).json({ error: r.error });
  const saved = await snapshotIfDue(db, r, 0);
  return res.status(200).json({ ok: true, saved, wallets: r.wallets.length, complete: r.complete });
}
