import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { publicPrize, loadSpots, parsePos } from "../../../../utils/prizes";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const UUID = /^[0-9a-f-]{36}$/i;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { id } = req.query;
  if (!UUID.test(id)) return res.status(404).json({ error: "Prize not found" });
  const { data: p } = await supabase.from("wago_prizes").select("*").eq("id", id).maybeSingle();
  if (!p || p.status === "draft") return res.status(404).json({ error: "Prize not found" });
  const { spots, codes } = await loadSpots(supabase, [id]);
  const { data: found } = await supabase.from("wago_prize_codes").select("claimed_by, claimed_by_name, claimed_at")
    .eq("prize_id", id).not("claimed_at", "is", null).order("claimed_at", { ascending: false });
  const session = await getServerSession(req, res, authOptions);
  const gid = session?.user?.google_id;
  const out = publicPrize(p, spots[id], codes[id], parsePos(req.query));
  out.ended = p.status === "ended" || (p.ends_at && new Date(p.ends_at) < new Date());
  out.finders = (found || []).map(f => ({ name: f.claimed_by_name, at: f.claimed_at }));
  out.you_found = !!gid && (found || []).some(f => f.claimed_by === gid);
  return res.status(200).json(out);
}
