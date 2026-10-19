// Shared helpers for /api/groves/*. Every mutating route verifies the caller owns the username first.
import { requireOwner, adminClient } from "./requireOwner";

// POST handler factory: verifies ownership of body.username, then calls the SQL function.
export function groveAction(fn, buildArgs) {
  return async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const who = await requireOwner(req, res, req.body?.username);
    if (!who) return;
    const args = buildArgs(who.username, req.body || {});
    if (!args) return res.status(400).json({ error: "Missing fields." });
    const { data, error } = await adminClient().rpc(fn, args);
    if (error) { console.error(`[groves/${fn}]`, error); return res.status(500).json({ error: "Something went wrong." }); }
    if (data && data.ok === false) return res.status(409).json(data);
    return res.status(200).json(data);
  };
}
