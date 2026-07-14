// pages/api/field-guide/classify.js
// Receives a photo (base64) + collection slug + username's existing entries.
// Calls Claude Vision to:
//   1. Confirm the photo matches the collection type
//   2. Confirm it is visually distinct from existing entries
// Returns { approved, label, confidence, reason }

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

const COLLECTION_PROMPTS = {
  skies: {
    subject: "sky",
    description: "a photograph where the sky is the primary subject — clouds, sunrise, sunset, stars, storm, blue sky, overcast, golden hour, etc.",
    notAllowed: "ground-level scenes where sky is not the main focus, indoor photos, or photos with no visible sky",
  },
  plants: {
    subject: "plant or foliage",
    description: "a close or medium photograph of plant life — leaves, bark, roots, moss, ferns, grass, trees, branches, vines, or any natural plant matter",
    notAllowed: "animals, people, buildings, sky-only shots, or photos without visible plant life",
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imageBase64, mimeType, collectionSlug, existingLabels } = req.body;

  if (!imageBase64 || !collectionSlug) {
    return res.status(400).json({ error: "Missing imageBase64 or collectionSlug" });
  }

  const prompt = COLLECTION_PROMPTS[collectionSlug];
  if (!prompt) {
    return res.status(400).json({ error: `Unknown collection: ${collectionSlug}` });
  }

  const existingContext = existingLabels?.length
    ? `The user already has these entries in this collection:\n${existingLabels.map((l, i) => `  ${i + 1}. ${l}`).join("\n")}\n\nThe new photo must be visually distinct — a meaningfully different scene, angle, lighting, or subject within the category.`
    : "This is the user's first entry in this collection.";

  const systemPrompt = `You are a strict but fair Field Guide photo classifier for the Proof of Grass app.

Your job is to evaluate whether a submitted photo qualifies for a specific nature collection slot.

Rules:
1. The photo must clearly show: ${prompt.description}
2. Not allowed: ${prompt.notAllowed}
3. The photo must be taken outdoors in a real environment (not a photo of a photo, not AI-generated art, not stock imagery)
4. ${existingContext}

Respond ONLY with valid JSON in this exact format:
{
  "approved": true or false,
  "label": "a short 3-6 word description of what is in this specific photo (e.g. 'dramatic storm clouds at dusk')",
  "confidence": "high" or "medium" or "low",
  "reason": "one sentence explaining your decision"
}

Be fair but firm. Reject photos that clearly don't match. Accept photos that genuinely show the subject even if imperfect.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
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
      return res.status(500).json({ error: "Classification service unavailable" });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Strip markdown fences if present
    const clean = text.replace(/```json[\s\S]*?```|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch(parseErr) {
      console.error("[classify] JSON parse failed. Raw text:", text);
      // Fallback — treat as approved if Claude described it positively
      const lowerText = text.toLowerCase();
      const approved  = lowerText.includes("approved") || lowerText.includes("qualifies") || lowerText.includes("yes");
      result = {
        approved,
        label:      "outdoor nature photo",
        confidence: "medium",
        reason:     "Auto-classified due to response format issue.",
      };
    }

    return res.status(200).json(result);
  } catch (e) {
    console.error("[classify] error:", e);
    return res.status(500).json({
      error:    "Classification failed",
      detail:   e.message,
      approved: false,
      label:    "",
      confidence: "low",
      reason:   "Classification service error. Please try again.",
    });
  }
}