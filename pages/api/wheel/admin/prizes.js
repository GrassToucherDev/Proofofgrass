// Admin: add / edit wheel prizes. Past spins keep their own snapshot, so edits never change a result already given.
import { isAdminRequest } from "../../../../utils/adminApi";
import { adminClient, WHEEL_REWARD_TYPES, WHEEL_RARITIES } from "../../../../utils/wheel";
import { MARKET_COVER_UNLOCKS } from "../../../../utils/marketplaceCatalog";

const txt = (v, n) => (v == null || String(v).trim() === "" ? null : String(v).trim().slice(0, n));

function buildConfig(type, cfg = {}) {
  if (type === "cosmetic_pack") {
    const slugs = MARKET_COVER_UNLOCKS[cfg.item_id];
    if (!slugs) throw new Error(`Unknown pack. Use one of: ${Object.keys(MARKET_COVER_UNLOCKS).join(", ")}`);
    return { item_id: cfg.item_id, cover_slugs: slugs };
  }
  if (type === "shield" || type === "sunset_pass") return { quantity: Math.min(Math.max(parseInt(cfg.quantity) || 1, 1), 10) };
  if (type === "grass_tickets") return { amount: Math.min(Math.max(parseInt(cfg.amount) || 1, 1), 1000) };
  return cfg && typeof cfg === "object" ? cfg : {};          // tokens, NFTs, collectibles: free-form notes for the person sending them
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  const b = req.body || {};

  if (req.method === "POST") {
    try {
      if (!b.wheel_id) throw new Error("wheel_id required");
      if (!WHEEL_REWARD_TYPES.includes(b.reward_type)) throw new Error("Unknown reward type.");
      if (!WHEEL_RARITIES.includes(b.rarity || "common")) throw new Error("Unknown rarity.");
      const weight = Number(b.weight);
      if (!(weight > 0)) throw new Error("Weight must be above 0.");
      const unlimited = b.inventory_total === "" || b.inventory_total == null;
      const inv = unlimited ? null : Math.max(parseInt(b.inventory_total) || 0, 0);
      const { data, error } = await db.from("wheel_prizes").insert({
        wheel_id: b.wheel_id, name: txt(b.name, 80), description: txt(b.description, 300), reward_type: b.reward_type,
        reward_config: buildConfig(b.reward_type, b.reward_config), rarity: b.rarity || "common", weight,
        inventory_total: inv, inventory_remaining: inv, image_url: txt(b.image_url, 500),
        segment: Math.max(parseInt(b.segment) || 0, 0), sort_order: parseInt(b.sort_order) || 0, active: b.active !== false,
      }).select().single();
      if (error) throw new Error(error.message);
      return res.status(201).json({ prize: data });
    } catch (e) { return res.status(400).json({ error: e.message }); }
  }

  if (req.method === "PATCH") {
    if (!b.id) return res.status(400).json({ error: "id required" });
    try {
      const { data: cur } = await db.from("wheel_prizes").select("*").eq("id", b.id).single();
      if (!cur) throw new Error("Prize not found.");
      const o = {};
      if (b.name !== undefined) o.name = txt(b.name, 80);
      if (b.description !== undefined) o.description = txt(b.description, 300);
      if (b.image_url !== undefined) o.image_url = txt(b.image_url, 500);
      if (b.rarity !== undefined) { if (!WHEEL_RARITIES.includes(b.rarity)) throw new Error("Unknown rarity."); o.rarity = b.rarity; }
      if (b.weight !== undefined) { if (!(Number(b.weight) > 0)) throw new Error("Weight must be above 0."); o.weight = Number(b.weight); }
      if (b.segment !== undefined) o.segment = Math.max(parseInt(b.segment) || 0, 0);
      if (b.sort_order !== undefined) o.sort_order = parseInt(b.sort_order) || 0;
      if (b.active !== undefined) o.active = !!b.active;
      if (b.reward_config !== undefined) o.reward_config = buildConfig(cur.reward_type, b.reward_config);
      if (b.add_stock !== undefined) {
        if (cur.inventory_total == null) throw new Error("This prize has unlimited stock.");
        const n = parseInt(b.add_stock);
        if (!(n > 0)) throw new Error("add_stock must be a positive number.");
        o.inventory_total = cur.inventory_total + n; o.inventory_remaining = cur.inventory_remaining + n;
      }
      const { data, error } = await db.from("wheel_prizes").update(o).eq("id", b.id).select().single();
      if (error) throw new Error(error.message);
      return res.status(200).json({ prize: data });
    } catch (e) { return res.status(400).json({ error: e.message }); }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
