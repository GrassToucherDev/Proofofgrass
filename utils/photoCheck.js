// Server only. Looks at a proof photo with Claude (same Haiku model Field Guide uses) and decides:
//   ok      -> let it through
//   flag    -> let it through, but put it on the "Needs review" list (indoor, photo of a screen, looks AI-made, unsure screenshot)
//   blocked -> clear screenshot / receipt / document; the player is asked to take a real outdoor photo
// Fails OPEN: no API key, a timeout, an API error, an unreadable answer or a daily-cap hit all mean "ok" and nothing is blocked.
// Env: PHOTO_CHECK_MODE = "block" (default) | "flag" (never block, only flag) | "off";  PHOTO_CHECK_DAILY_CAP (default 3000).
export const BLOCK_MESSAGE = "That looks like a screenshot or document, not an outdoor photo. Take a new photo outside to log your proof.";
const MODEL = "claude-haiku-4-5-20251001";
const BLOCK_CATS = new Set(["screenshot", "document_or_receipt"]);
const FLAG_CATS = new Set(["indoor", "photo_of_screen", "ai_suspected", "screenshot", "document_or_receipt"]);
const BLOCK_AT = 0.9, FLAG_AT = 0.6;

const PROMPT = `You review photos for an app where people post a real photo taken OUTDOORS (grass, trees, sky, parks, streets, gardens, hikes) to prove they went outside today.
Classify the photo into exactly one category:
- outdoor_photo: a real photograph taken outdoors. Signs, text or buildings inside an outdoor scene are fine.
- screenshot: a screenshot of a phone/computer screen, an app, a website, a chat, a chart or a wallet.
- document_or_receipt: a receipt, bank/transfer confirmation, ID, form, paper document or text-only graphic.
- indoor: a real photograph taken indoors.
- photo_of_screen: a camera photo of a monitor, TV or phone screen, or of a printed picture.
- ai_suspected: looks AI-generated or heavily synthetic (not a camera photo). Only choose this if fairly sure.
- unclear: you cannot tell.
Be careful: do NOT call a real outdoor photo a screenshot or AI image just because it is beautiful, edited with a filter, or contains a little text.
Reply with ONLY JSON: {"category":"...","confidence":0.0-1.0,"reason":"one short sentence"}`;

function sniffMime(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.slice(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}
async function shrink(buf) {
  try {
    const sharp = (await import("sharp")).default;
    return { data: await sharp(buf).rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer(), mime: "image/jpeg" };
  } catch { return null; }
}

// Pure decision step (kept separate so it can be tested without the API).
export function decide(category, confidence, mode = "block") {
  const c = Number(confidence) || 0;
  if (mode !== "flag" && BLOCK_CATS.has(category) && c >= BLOCK_AT) return "blocked";
  if (category !== "outdoor_photo" && FLAG_CATS.has(category) && c >= FLAG_AT) return "flag";
  if ((category === "screenshot" || category === "document_or_receipt") && c >= 0.4) return "flag";   // unsure screenshot: look at it, don't block it
  return "ok";
}

export async function checkProofPhoto(db, buf, username, { timeoutMs = 5000 } = {}) {
  const mode = String(process.env.PHOTO_CHECK_MODE || "block").toLowerCase();
  if (mode === "off" || !process.env.ANTHROPIC_API_KEY) return { verdict: "ok", skipped: true };
  try {
    const cap = Number(process.env.PHOTO_CHECK_DAILY_CAP || 3000);
    const day = new Date().toISOString().slice(0, 10);
    const { count } = await db.from("photo_checks").select("id", { count: "exact", head: true }).eq("day", day);
    if (Number.isFinite(cap) && (count ?? 0) >= cap) return { verdict: "ok", skipped: true, reason: "daily cap" };

    let data = buf, mime = sniffMime(buf);
    if (!mime) return { verdict: "ok", skipped: true };
    if (buf.length > 600_000) { const s = await shrink(buf); if (s) { data = s.data; mime = s.mime; } else if (buf.length > 4_500_000) return { verdict: "ok", skipped: true }; }

    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let resp;
    try {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 120, system: PROMPT, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: data.toString("base64") } }, { type: "text", text: "Classify this photo." }] }] }),
      });
    } finally { clearTimeout(timer); }
    if (!resp.ok) { console.warn("[photoCheck] api", resp.status); return { verdict: "ok", skipped: true }; }
    const j = await resp.json();
    const text = (j?.content || []).map((p) => p.text || "").join("");
    const m = text.match(/\{[\s\S]*\}/); if (!m) return { verdict: "ok", skipped: true };
    const out = JSON.parse(m[0]);
    const category = String(out.category || "unclear"), confidence = Math.max(0, Math.min(1, Number(out.confidence) || 0));
    const reason = String(out.reason || "").slice(0, 240);
    const verdict = decide(category, confidence, mode);
    try { await db.from("photo_checks").insert([{ username, day, verdict, category, confidence, reason }]); } catch {}
    return { verdict, category, confidence, reason };
  } catch (e) {
    console.warn("[photoCheck] skipped:", e?.name === "AbortError" ? "timeout" : e?.message);
    return { verdict: "ok", skipped: true };
  }
}
