// GET /api/fright-bits/state — the public gallery. Draft collections are invisible. Reserve characters follow the admin reveal mode.
import { adminClient, sessionIdentity } from "../../../utils/wheel";

export const FB_SLUG = "fright-bits";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const db = adminClient();
  const { data, error } = await db.rpc("fright_bits_state", { p_slug: FB_SLUG });
  if (error || !data?.ok || data.collection.status === "draft") return res.status(200).json({ collection: null });
  const { googleId } = await sessionIdentity(req, res);
  let mine = [];
  if (googleId) {
    const { data: m } = await db.rpc("fright_bits_for_user", { p_google: googleId });
    mine = (m || []).map(x => x.slug);
  }
  return res.status(200).json({ collection: data.collection, items: data.items, counts: data.counts, mine, signedIn: !!googleId });
}
