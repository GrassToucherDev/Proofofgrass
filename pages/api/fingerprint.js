// pages/api/fingerprint.js
// Records device fingerprint at proof submission time — flags only, no blocking

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, fingerprintHash, userAgent, screenResolution, timezone } = req.body;
  if (!username || !fingerprintHash) return res.status(400).json({ error: "Missing fields" });

  // Get IP — works behind Vercel's proxy
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    null;

  try {
    await supabaseAdmin.from("DeviceFingerprints").insert([{
      username:           username.toLowerCase().trim(),
      fingerprint_hash:   fingerprintHash,
      ip_address:         ip,
      user_agent:         userAgent || null,
      screen_resolution:  screenResolution || null,
      timezone:           timezone || null,
    }]);

    return res.status(200).json({ ok: true });
  } catch(e) {
    // Never block a user over fingerprint failure — silent fail
    console.error("[fingerprint]", e.message);
    return res.status(200).json({ ok: true });
  }
}