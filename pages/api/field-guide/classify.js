// pages/api/field-guide/classify.js
import { signApproval } from "../../../utils/fieldGuideProof";
// Vercel caps request bodies at ~4.5 MB regardless of this; the client shrinks photos before sending.
export const config = { api: { bodyParser: { sizeLimit: "6mb" } } };

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BASE64_CHARS = 5_500_000;

// Best-effort per-IP limiter (per server instance — it slows abuse, it doesn't stop a determined one).
const HITS = new Map();
function rateLimited(req) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const now = Date.now(), WINDOW = 10 * 60 * 1000, MAX = 15;
  const recent = (HITS.get(ip) || []).filter(t => now - t < WINDOW);
  recent.push(now);
  HITS.set(ip, recent);
  if (HITS.size > 5000) for (const [k, v] of HITS) if (!v.some(t => now - t < WINDOW)) HITS.delete(k);
  return recent.length > MAX;
}

const COLLECTION_PROMPTS = {
  skies: {
    subject: "sky",
    description: "a photograph where the sky is clearly visible and a significant part of the image — clouds, sunrise, sunset, stars, storm, blue sky, overcast, golden hour, moon, etc.",
    notAllowed: "indoor photos with no sky visible, or photos taken completely underground",
  },
  plants: {
    subject: "plant or foliage",
    description: "a photograph showing plant life — leaves, bark, roots, moss, ferns, grass, trees, branches, flowers, vines, or any natural plant matter. Garden plants and outdoor plants both qualify.",
    notAllowed: "photos with absolutely no plant life visible",
  },
  plants_foliage: {
    subject: "plant or foliage",
    description: "a photograph showing plant life — leaves, bark, roots, moss, ferns, grass, trees, branches, flowers, vines, or any natural plant matter. Garden plants and outdoor plants both qualify.",
    notAllowed: "photos with absolutely no plant life visible",
  },
  wildlife: {
    subject: "animal or wildlife",
    description: "a photograph showing any animal — birds, insects, mammals, reptiles, fish, or any creature. Pets in outdoor settings qualify.",
    notAllowed: "photos with absolutely no animals visible",
  },
  water: {
    subject: "water",
    description: "a photograph showing water — ocean, lake, river, stream, waterfall, rain, puddle, dew, or any body of water in a natural setting.",
    notAllowed: "photos with absolutely no water visible",
  },
  animals: {
    subject: "animal or wildlife",
    description: "a photograph showing any animal outdoors or in nature — birds, insects, mammals, reptiles, fish, amphibians, or any creature. Pets photographed outside qualify. Wild animals of any kind qualify.",
    notAllowed: "photos with absolutely no animals visible, or photos of stuffed animals or animal illustrations",
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imageBase64, mimeType, collectionSlug } = req.body || {};
  const proofUser = String(req.body?.username ?? "").replace(/@/g, "").toLowerCase().trim();
  // An approved result carries a short-lived signature that /api/field-guide/entry requires before saving.
  const withProof = (r) => {
    if (!r?.approved || !proofUser) return r;
    const label = String(r.label || "outdoor nature photo").slice(0, 120);
    const confidence = r.confidence == null ? "" : String(r.confidence);
    return { ...r, label, ...signApproval({ username: proofUser, collectionSlug, label, confidence }) };
  };
  const existingLabels = Array.isArray(req.body?.existingLabels)
    ? req.body.existingLabels.slice(0, 30).map(l => String(l).slice(0, 80)) : [];

  if (!imageBase64 || !collectionSlug) {
    return res.status(400).json({ error: "Missing imageBase64 or collectionSlug" });
  }
  if (!ALLOWED_MIME.includes(mimeType || "image/jpeg")) {
    return res.status(400).json({ error: "Unsupported image type. Please use a JPEG, PNG, WebP or GIF photo." });
  }
  if (typeof imageBase64 !== "string" || imageBase64.length > MAX_BASE64_CHARS) {
    return res.status(413).json({ error: "That photo is too large. Try a smaller one." });
  }
  if (rateLimited(req)) {
    return res.status(429).json({ error: "Too many photos submitted. Please wait a few minutes and try again." });
  }

  const prompt = COLLECTION_PROMPTS[collectionSlug];
  if (!prompt) {
    // Unknown collection — auto-approve
    return res.status(200).json({
      approved: true,
      label: "outdoor nature photo",
      confidence: "medium",
      reason: "Auto-approved — collection type not configured.",
    });
  }

  const existingContext = existingLabels?.length
    ? `The user already has these entries in this collection:\n${existingLabels.map((l,i)=>`  ${i+1}. ${l}`).join("\n")}\n\nThe new photo should be a meaningfully different scene or subject within the category — different angle, lighting, location, or specific subject is fine.`
    : "This is the user's first entry in this collection.";

  const systemPrompt = `You are a generous and fair Field Guide photo classifier for the Proof of Grass outdoor accountability app.
Your job is to evaluate whether a submitted photo qualifies for a specific nature collection slot.

Rules:
1. The photo must show: ${prompt.description}
2. Not allowed: ${prompt.notAllowed}
3. The photo should be a real photograph (not AI-generated art or illustrated images)
4. ${existingContext}

IMPORTANT: Be generous with approvals. If the subject is present and identifiable, approve it. 
Only reject photos that clearly and obviously do not contain the required subject at all.
A photo does not need to be perfectly composed or professionally taken to qualify.

Respond ONLY with valid JSON in this exact format:
{
  "approved": true or false,
  "label": "a short 3-6 word description of what is in this specific photo (e.g. 'dramatic storm clouds at dusk')",
  "confidence": "high" or "medium" or "low",
  "reason": "one sentence explaining your decision"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType || "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Classify this photo for the "${collectionSlug}" collection. Respond with JSON only.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[classify] Anthropic error:", err);
      // On API error — auto approve so users aren't blocked
      return res.status(200).json(withProof({
        approved: true,
        label: "outdoor nature photo",
        confidence: "medium",
        reason: "Auto-approved — verification service temporarily unavailable.",
      }));
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    const clean = text.replace(/```json[\s\S]*?```|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch(parseErr) {
      console.error("[classify] JSON parse failed. Raw text:", text);
      // Only trust an explicit "approved": true/false. The old keyword fallback matched words like
      // "disapprove" / "not approved" and approved photos the model had rejected.
      const m = text.match(/"approved"\s*:\s*(true|false)/i);
      if (!m) return res.status(502).json({ error: "Couldn't read the verification result. Please try again." });
      result = {
        approved: m[1].toLowerCase() === "true",
        label: (text.match(/"label"\s*:\s*"([^"]{1,80})"/) || [])[1] || "outdoor nature photo",
        confidence: "medium",
        reason: (text.match(/"reason"\s*:\s*"([^"]{1,300})"/) || [])[1] || "Verified.",
      };
    }
    result.approved = result.approved === true;

    return res.status(200).json(withProof(result));

  } catch(e) {
    console.error("[classify] error:", e);
    // On unexpected error — auto approve
    return res.status(200).json(withProof({
      approved: true,
      label: "outdoor nature photo",
      confidence: "medium",
      reason: "Auto-approved — verification service temporarily unavailable.",
    }));
  }
}