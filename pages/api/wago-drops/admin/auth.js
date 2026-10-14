// pages/api/wago-drops/admin/auth.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { secret } = req.body;
  if (!secret) return res.status(400).json({ error: "secret required" });

  if (secret !== process.env.WAGO_ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }

  return res.status(200).json({ ok: true });
}