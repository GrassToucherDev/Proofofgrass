// POST { username, image }  image = JPEG data URL (<= ~1.5 MB) already cropped square by the browser.
// POST { username, remove: true } clears the picture.
// Only the signed-in owner of the username can change it, and only when their profile is flagged as a
// Grass Toucher or Screen Toucher NFT holder. Stored in the existing public "avatars" bucket as <username>.jpg.
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

  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.image || ""));
  if (!m) return res.status(400).json({ error: "Please choose a JPG, PNG or WebP image." });
  const buf = Buffer.from(m[1], "base64");
  if (buf.length < 500 || buf.length > 1_500_000) return res.status(400).json({ error: "That image is too large. Try a smaller one." });

  // Same layout as the existing avatars: one <username>.jpg at the bucket root, replaced on change.
  const path = `${who.username}.jpg`;
  const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: "image/jpeg", upsert: true, cacheControl: "300" });
  if (up.error) return res.status(500).json({ error: "Could not upload. Please try again." });
  const url = `${db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;

  const { error } = await db.from("Profiles").update({ avatar_url: url }).ilike("username", who.username);
  if (error) return res.status(500).json({ error: "Could not save." });
  return res.status(200).json({ ok: true, avatar_url: url });
}
