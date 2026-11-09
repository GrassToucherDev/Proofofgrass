// POST { username, image }  image = data URL (jpeg/png/webp, <= ~1.5 MB) already cropped square by the browser.
// POST { username, remove: true } clears the picture.
// Only the signed-in owner of the username can change it, and only when their profile is flagged as a
// Grass Toucher or Screen Toucher NFT holder. Stored in the public "avatars" bucket, one file per user.
import { requireOwner, adminClient } from "../../../utils/requireOwner";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };
const BUCKET = "avatars";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.username);
  if (!who) return;
  const db = adminClient();

  const { data: prof } = await db.from("Profiles").select("has_grass_toucher,has_screen_toucher").ilike("username", who.username).maybeSingle();
  if (!prof?.has_grass_toucher && !prof?.has_screen_toucher) {
    return res.status(403).json({ error: "Changing your picture is for Grass Toucher and Screen Toucher holders.", code: "not_holder" });
  }

  if (req.body?.remove) {
    const { error } = await db.from("Profiles").update({ avatar_url: null }).ilike("username", who.username);
    if (error) return res.status(500).json({ error: "Could not save." });
    return res.status(200).json({ ok: true, avatar_url: null });
  }

  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.image || ""));
  if (!m) return res.status(400).json({ error: "Please choose a JPG, PNG or WebP image." });
  const buf = Buffer.from(m[2], "base64");
  if (buf.length < 500 || buf.length > 1_500_000) return res.status(400).json({ error: "That image is too large. Try a smaller one." });

  const ext = m[1] === "image/png" ? "png" : m[1] === "image/webp" ? "webp" : "jpg";
  const path = `${who.username}/${Date.now()}.${ext}`;
  const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: m[1], upsert: false, cacheControl: "31536000" });
  if (up.error) return res.status(500).json({ error: "Could not upload. Please try again." });
  const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { error } = await db.from("Profiles").update({ avatar_url: url }).ilike("username", who.username);
  if (error) return res.status(500).json({ error: "Could not save." });

  // keep only the newest few files for this user
  try {
    const { data: files } = await db.storage.from(BUCKET).list(who.username, { limit: 100, sortBy: { column: "name", order: "desc" } });
    const old = (files || []).slice(3).map((f) => `${who.username}/${f.name}`);
    if (old.length) await db.storage.from(BUCKET).remove(old);
  } catch {}
  return res.status(200).json({ ok: true, avatar_url: url });
}
