// Admin: record HAND-PICKED NFT winners for a cycle so they are logged exactly like drawn winners
// (admin list, delivery tracking, winner share page). Nothing is randomised here and no weights are invented:
// every row is marked metadata.method = "manual". Auth: x-admin-secret. dry_run:true validates only.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/requireOwner";

const COLLECTIONS = { screen_touchers: "Screen Toucher", grass_touchers: "Grass Toucher" };
const clean = (v) => String(v || "").replace(/@/g, "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  const b = req.body || {};
  const dry = b.dry_run !== false;
  const cycleId = String(b.cycle_id || "");
  const picks = Array.isArray(b.picks) ? b.picks.slice(0, 25) : [];
  const note = String(b.note || "").trim().slice(0, 200);
  if (!cycleId) return res.status(400).json({ error: "Pick a cycle." });
  if (!picks.length) return res.status(400).json({ error: "Add at least one winner." });

  const { data: cycle } = await db.from("grass_draw_cycles").select("id,name").eq("id", cycleId).maybeSingle();
  if (!cycle) return res.status(404).json({ error: "Cycle not found." });

  const { data: existing } = await db.from("grass_draw_winners").select("username,reward_type,major_reward,voided,metadata").eq("cycle_id", cycleId).eq("voided", false);
  const priorMajor = new Set((existing || []).filter((w) => w.major_reward).map((w) => w.username.toLowerCase()));
  const priorNft = new Set((existing || []).filter((w) => w.reward_type === "nft").map((w) => w.username.toLowerCase()));
  const priorAny = new Map();
  (existing || []).forEach((w) => { const k = w.username.toLowerCase(); priorAny.set(k, [...(priorAny.get(k) || []), w.reward_type]); });

  const rows = [], checks = [], seen = new Set();
  for (const p of picks) {
    const u = clean(p.username), collection = String(p.collection || "");
    const c = { username: u, collection, problems: [], warnings: [] };
    if (!u) { c.problems.push("Missing username"); checks.push(c); continue; }
    if (!COLLECTIONS[collection]) c.problems.push("Pick Screen Toucher or Grass Toucher");
    if (seen.has(u)) c.problems.push("Listed twice"); seen.add(u);
    if (priorNft.has(u)) c.problems.push("Already recorded as an NFT winner this cycle");
    const { data: prof } = await db.from("Profiles").select("username,wallet_address,wallet_verified").ilike("username", u).maybeSingle();
    if (!prof) c.problems.push("No Proof of Grass profile with this username");
    else {
      c.username = prof.username;
      if (!prof.wallet_address) c.warnings.push("No wallet connected yet — you'll need one to transfer");
      else if (!prof.wallet_verified) c.warnings.push("Wallet not verified");
    }
    if (priorMajor.has(u)) c.warnings.push("Already won a major prize this cycle");
    const others = (priorAny.get(u) || []).filter((t) => t !== "nft");
    if (others.length) c.warnings.push(`Also won this cycle: ${[...new Set(others)].join(", ")}`);
    checks.push(c);
    if (!c.problems.length) rows.push({ c, prof });
  }
  const problems = checks.some((c) => c.problems.length);
  if (dry || problems) return res.status(problems ? 400 : 200).json({ ok: !problems, dry_run: dry, cycle: cycle.name, checks, error: problems ? "Fix the problems marked above, then try again." : undefined });

  const at = new Date().toISOString();
  const inserts = rows.map(({ c, prof }) => ({
    cycle_id: cycleId, username: prof.username, reward_type: "nft", reward_reference: null,
    reward_value: { nft_collection: c.collection, nft_label: COLLECTIONS[c.collection] },
    major_reward: true, active_entries_at_draw: 0, delivered: false, voided: false,
    metadata: { method: "manual", picked_by: "admin", recorded_at: at, note: note || null, nft_collection: c.collection, nft_status: "pending_transfer",
      wallet_address: prof.wallet_address || null, wallet_verified: !!prof.wallet_verified },
  }));
  const { error } = await db.from("grass_draw_winners").insert(inserts);
  if (error) { console.error("[record-manual]", error); return res.status(500).json({ error: "Could not save: " + error.message }); }
  return res.status(200).json({ ok: true, saved: inserts.length, checks });
}
