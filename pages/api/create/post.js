// POST { as, kind: "meme"|"pfp", tool, caption, image: "data:image/..;base64,..." }
// Posts a finished creation to Community Creations. Needs a secured username, a current streak of POST_MIN_STREAK+,
// and an account that isn't paused. Max POSTS_PER_DAY a day. The image is re-encoded server side (real image only).
import sharp from "sharp";
import { adminClient, requireOwner } from "../../../utils/requireOwner";
import { resolvePause, DEFAULT_PAUSE_MESSAGE } from "../../../utils/pauses";
import { POST_MIN_STREAK, POSTS_PER_DAY, CREATIONS_BUCKET, MAX_IMAGE_BYTES, KINDS, currentTheme } from "../../../utils/createCommunity";

export const config = { api: { bodyParser: { sizeLimit: "5mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.as);
  if (!who) return;
  const kind = req.body?.kind, tool = String(req.body?.tool || "").slice(0, 40) || null;
  const caption = String(req.body?.caption || "").replace(/\s+/g, " ").trim().slice(0, 140) || null;
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.image || ""));
  if (!KINDS.includes(kind) || !m) return res.status(400).json({ error: "That image couldn't be read. Try generating it again." });
  const raw = Buffer.from(m[2], "base64");
  if (raw.length > MAX_IMAGE_BYTES) return res.status(413).json({ error: "That image is too large." });

  const db = adminClient();
  const pause = await resolvePause(db, who.username);
  if (pause) return res.status(403).json({ error: pause.message || DEFAULT_PAUSE_MESSAGE, code: "paused" });

  const { data: st } = await db.from("Streaks").select("current_streak").eq("username", who.username).maybeSingle();
  const streak = st?.current_streak || 0;
  if (streak < POST_MIN_STREAK) {
    return res.status(403).json({ error: `Posting to Community Creations unlocks at a ${POST_MIN_STREAK}-day streak. You're on ${streak}. You can still make, download and share anything.`, code: "streak_low", streak, need: POST_MIN_STREAK });
  }

  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
  const { count, error: cErr } = await db.from("community_creations").select("id", { count: "exact", head: true }).eq("username", who.username).gte("created_at", dayStart.toISOString());
  if (cErr) return res.status(500).json({ error: /does not exist|schema cache/i.test(cErr.message) ? "Community Creations isn't switched on yet (database setup pending)." : "Could not post that." });
  if ((count ?? 0) >= POSTS_PER_DAY) return res.status(429).json({ error: `That's ${POSTS_PER_DAY} posts today. Come back tomorrow.`, code: "rate_limited" });

  let out;
  try {
    const img = sharp(raw, { failOn: "error" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height || meta.width < 200 || meta.height < 200) return res.status(400).json({ error: "That image is too small." });
    out = await img.rotate().resize({ width: 1080, height: 1350, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
  } catch { return res.status(400).json({ error: "That file isn't a valid image." }); }

  const id = (await import("crypto")).randomUUID();
  const path = `${who.username}/${id}.webp`;
  const up = await db.storage.from(CREATIONS_BUCKET).upload(path, out, { contentType: "image/webp", upsert: false });
  if (up.error) { console.error("[create/post] upload", up.error.message); return res.status(500).json({ error: /not found/i.test(up.error.message) ? "Community Creations isn't switched on yet (storage setup pending)." : "Could not upload that image." }); }

  const { error } = await db.from("community_creations").insert({ id, username: who.username, kind, tool, caption, theme: currentTheme().title, image_path: path });
  if (error) { await db.storage.from(CREATIONS_BUCKET).remove([path]).catch(() => {}); console.error("[create/post] insert", error.message); return res.status(500).json({ error: "Could not post that." }); }
  return res.status(200).json({ ok: true, id });
}
