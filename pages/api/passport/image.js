// GET /api/passport/image?mint=<asset id>
// Same-origin copy of a verified WAGO Origins / Screen Toucher image, so the browser can draw it onto the
// download canvas without CORS problems. Refuses anything that isn't a verified member of a configured collection.
import { passportConfig, verifiedImageFor, fetchImageSafe } from "../../../utils/passportServer";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const cfg = passportConfig();
  if (!cfg.ok) return res.status(503).json({ error: "Passport isn't configured." });
  try {
    const url = await verifiedImageFor(String(req.query.mint || ""), cfg);
    if (!url) return res.status(404).json({ error: "Not a verified WAGO piece." });
    const { buf, type } = await fetchImageSafe(url);
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.status(200).send(buf);
  } catch (e) {
    console.error("[passport] image failed:", e?.message);
    return res.status(502).json({ error: "Couldn't load the artwork." });
  }
}
