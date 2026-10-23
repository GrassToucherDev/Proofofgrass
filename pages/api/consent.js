// GET: has the signed-in user accepted the current terms? POST: record acceptance.
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { CONSENT_VERSION, hasConsent } from "../../utils/prizes";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const gid = session?.user?.google_id;
  if (!gid) return res.status(401).json({ error: "Not authenticated" });
  if (req.method === "GET") {
    try { return res.status(200).json({ accepted: await hasConsent(supabase, gid), version: CONSENT_VERSION }); }
    catch { return res.status(200).json({ accepted: true, version: CONSENT_VERSION, unavailable: true }); }
  }
  if (req.method === "POST") {
    if (!req.body?.adult || !req.body?.terms) return res.status(400).json({ error: "Both boxes must be checked." });
    const { error } = await supabase.from("wago_consents").upsert({ google_id: gid, version: CONSENT_VERSION });
    if (error) return res.status(500).json({ error: "Could not save. Try again." });
    return res.status(200).json({ accepted: true, version: CONSENT_VERSION });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
