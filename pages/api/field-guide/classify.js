// pages/api/field-guide/classify.js
export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

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
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imageBase64, mimeType, collectionSlug, existingLabels } = req.body;

  if (!imageBase64 || !collectionSlug) {
    return res.status(400).json({ error: "Missing imageBase64 or collectionSlug" });
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
      return res.status(200).json({
        approved: true,
        label: "outdoor nature photo",
        confidence: "medium",
        reason: "Auto-approved — verification service temporarily unavailable.",
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    const clean = text.replace(/```json[\s\S]*?```|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch(parseErr) {
      console.error("[classify] JSON parse failed. Raw text:", text);
      const lowerText = text.toLowerCase();
      const approved = lowerText.includes('"approved": true') ||
                       lowerText.includes('"approved":true') ||
                       lowerText.includes("qualifies") ||
                       lowerText.includes("approve");
      result = {
        approved,
        label: "outdoor nature photo",
        confidence: "medium",
        reason: "Verified.",
      };
    }

    return res.status(200).json(result);

  } catch(e) {
    console.error("[classify] error:", e);
    // On unexpected error — auto approve
    return res.status(200).json({
      approved: true,
      label: "outdoor nature photo",
      confidence: "medium",
      reason: "Auto-approved — verification service temporarily unavailable.",
    });
  }
}