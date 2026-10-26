// POST { username, kind: "premium" | "consumable", type, tx_signature, token_amount }
// Files a PENDING purchase request for an admin to check against the chain. Requests can no longer be written, or
// approved, straight from the browser.
import { adminClient, cleanUsername } from "../../../utils/requireOwner";

const SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const username = cleanUsername(req.body?.username);
  const kind = req.body?.kind;
  const type = String(req.body?.type ?? "").slice(0, 60);
  const tx = String(req.body?.tx_signature ?? "").trim();
  const amount = Number(req.body?.token_amount);
  if (!username || !type || !["premium", "consumable"].includes(kind)) return res.status(400).json({ error: "Invalid request." });
  if (!SIG_RE.test(tx)) return res.status(400).json({ error: "That doesn't look like a transaction signature." });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return res.status(400).json({ error: "Invalid amount." });
  const db = adminClient();

  const table = kind === "premium" ? "PremiumPurchaseRequests" : "ShieldPurchases";
  const typeCol = kind === "premium" ? "premium_type" : "consumable_type";

  const { data: dupTx } = await db.from(table).select("id").eq("tx_signature", tx).limit(1);
  if (dupTx?.length) return res.status(409).json({ error: "That transaction was already submitted." });

  const { count: pendingCount } = await db.from(table).select("id", { count: "exact", head: true }).eq("username", username).eq("status", "pending");
  if ((pendingCount ?? 0) >= 10) return res.status(429).json({ error: "You have too many pending requests. Wait for review." });

  if (kind === "premium") {
    const { data: existing } = await db.from(table).select("id,status").eq("username", username).eq(typeCol, type).maybeSingle();
    if (existing?.status === "approved") return res.status(409).json({ error: "You already own this upgrade." });
    if (existing?.status === "pending") return res.status(409).json({ error: "You already have a pending request for this upgrade." });
  }

  const { error } = await db.from(table).insert({ username, [typeCol]: type, tx_signature: tx, token_amount: amount, status: "pending" });
  if (error) return res.status(500).json({ error: "Submission failed." });
  return res.status(200).json({ ok: true });
}
