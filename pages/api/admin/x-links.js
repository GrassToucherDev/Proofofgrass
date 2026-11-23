// GET /api/admin/x-links[?usernames=a,b,c] — admin only. Which X account each Proof of Grass username has verified.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Admin authorization required" });
  try {
    let q = adminClient().from("x_links").select("username,x_username,x_user_id,linked_at,refreshed_at").order("linked_at", { ascending: false }).limit(5000);
    const names = String(req.query.usernames || "").split(",").map(cleanUsername).filter(Boolean).slice(0, 500);
    if (names.length) q = q.in("username", names);
    const { data, error } = await q;
    if (error) return res.status(error.code === "42P01" ? 200 : 500).json({ links: [], needsSql: error.code === "42P01" });
    return res.status(200).json({ links: data || [] });
  } catch { return res.status(500).json({ error: "Query failed." }); }
}
