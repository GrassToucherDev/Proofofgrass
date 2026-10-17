// POST /api/wago-drops/trails/[id]/claim-reward — collect the Trail completion reward.
// Idempotent: the reward row is claimed with a conditional update; tickets dedupe on source_id.
// Token/SOL rewards are queued for the existing payout flow (verified wallet only).
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import { sb } from "../../../../../utils/wagoTrailsServer";

async function resolveUsername(googleId, wallet, supplied) {
  if (wallet) {
    const { data } = await sb.from("Profiles").select("username").eq("wallet_address", wallet).maybeSingle();
    if (data?.username) return data.username;
  }
  const candidate = String(supplied || "").trim().replace(/^@/, "").toLowerCase();
  if (!candidate) return null;
  const [{ data: prof }, { data: streak }] = await Promise.all([
    sb.from("Profiles").select("username").ilike("username", candidate).maybeSingle(),
    sb.from("Streaks").select("username").ilike("username", candidate).maybeSingle(),
  ]);
  return prof?.username || streak?.username ? candidate : "__invalid__";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id;
  if (!googleId) return res.status(401).json({ error: "Not authenticated" });

  const { data: trail } = await sb.from("wago_trails").select("*").eq("id", req.query.id).maybeSingle();
  const { data: prog } = trail ? await sb.from("wago_trail_progress").select("*").eq("trail_id", trail.id).eq("google_id", googleId).maybeSingle() : { data: null };
  if (!trail || !prog) return res.status(404).json({ error: "Trail progress not found" });
  if (prog.status !== "completed") return res.status(400).json({ error: "Finish every stop to collect the reward." });

  const { data: acct } = await sb.from("wago_google_accounts").select("linked_wallet, wallet_verified").eq("google_id", googleId).maybeSingle();
  const walletOk = !!(acct?.linked_wallet && acct.wallet_verified);
  const hasToken = trail.reward_type && trail.reward_type !== "none" && Number(trail.reward_amount) > 0;
  const wantTickets = Number(trail.reward_tickets) > 0;

  // 1) Take the one-time reward claim (or, if already taken, upgrade a waiting token reward).
  let row = prog;
  if (!prog.reward_claimed_at) {
    const status = hasToken ? (walletOk ? "pending" : "awaiting_wallet") : "completed";
    const { data: won } = await sb.from("wago_trail_progress")
      .update({ reward_claimed_at: new Date().toISOString(), reward_status: status, reward_wallet: hasToken && walletOk ? acct.linked_wallet : null })
      .eq("id", prog.id).is("reward_claimed_at", null).select().maybeSingle();
    row = won || (await sb.from("wago_trail_progress").select("*").eq("id", prog.id).single()).data;
  } else if (prog.reward_status === "awaiting_wallet" && walletOk) {
    const { data: up } = await sb.from("wago_trail_progress")
      .update({ reward_status: "pending", reward_wallet: acct.linked_wallet })
      .eq("id", prog.id).eq("reward_status", "awaiting_wallet").select().maybeSingle();
    if (up) row = up;
  }

  // 2) Grass Tickets (separate from token status; safe to retry).
  let needUsername = false, ticketsError = null;
  if (wantTickets && row.reward_tickets_awarded == null) {
    const username = row.pog_username || await resolveUsername(googleId, acct?.linked_wallet, req.body?.pogUsername);
    if (!username) needUsername = true;
    else if (username === "__invalid__") { needUsername = true; ticketsError = "No Proof of Grass account found for that username."; }
    else {
      const proto = req.headers["x-forwarded-proto"] || "https";
      const r = await fetch(`${proto}://${req.headers.host}/api/grass-draw/award-bonus`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.SUPABASE_SERVICE_ROLE_KEY },
        body: JSON.stringify({ username, entry_type: "wago_trail", source_id: row.id, amount: trail.reward_tickets, notes: `WAGO Trail — ${trail.name}` }),
      });
      const d = await r.json().catch(() => ({}));
      const already = !r.ok && /already awarded/i.test(d.error || "");
      if (r.ok || already) {
        const { data: up } = await sb.from("wago_trail_progress").update({ pog_username: username, reward_tickets_awarded: trail.reward_tickets }).eq("id", row.id).select().single();
        row = up || row;
      } else ticketsError = d.error || "Couldn't award Grass Tickets.";
    }
  }

  res.status(200).json({
    ok: true, reward_status: row.reward_status, tickets_awarded: row.reward_tickets_awarded,
    awaiting_wallet: row.reward_status === "awaiting_wallet", need_username: needUsername, tickets_error: ticketsError,
  });
}
