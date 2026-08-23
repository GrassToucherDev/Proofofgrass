// pages/api/grass-draw/deliver-reward.js
// Delivers Grass Draw rewards to winners
// Grass Score: auto-delivered at draw time (Phase 7)
// Shields: increments shield_count in Streaks + UserConsumables
// Profile Packs: adds slugs to unlocked_covers + UserInventory
// NFTs: records wallet address for manual transfer + marks pending

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { winner_id, admin_username } = req.body;
  if (!winner_id || !admin_username) {
    return res.status(400).json({ error: 'winner_id and admin_username required' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── 1. Load winner record ─────────────────────────────────────────────────
    const { data: winner } = await supabase
      .from('grass_draw_winners')
      .select('*')
      .eq('id', winner_id)
      .single();

    if (!winner) return res.status(404).json({ error: 'Winner record not found' });
    if (winner.delivered) return res.status(400).json({ error: 'Reward already delivered' });
    if (winner.voided) return res.status(400).json({ error: 'Reward has been voided' });

    const { username, reward_type, reward_reference, reward_value, cycle_id } = winner;

    // ── 2. Deliver by type ────────────────────────────────────────────────────

    // ── SHIELD ────────────────────────────────────────────────────────────────
    if (reward_type === 'shield') {
      // Increment UserConsumables
      const { data: existing } = await supabase
        .from('UserConsumables')
        .select('quantity')
        .ilike('username', username)
        .eq('consumable_type', 'shield')
        .maybeSingle();

      if (existing) {
        await supabase.from('UserConsumables')
          .update({ quantity: existing.quantity + 1, updated_at: new Date().toISOString() })
          .ilike('username', username)
          .eq('consumable_type', 'shield');
      } else {
        await supabase.from('UserConsumables').insert([{
          username: username.toLowerCase(),
          consumable_type: 'shield',
          quantity: 1,
        }]);
      }

      // Also increment Streaks.shield_count as fallback
      await supabase.from('Streaks')
        .update({ shield_count: supabase.rpc('increment', { x: 1 }) })
        .ilike('username', username);

      // Log consumable event
      await supabase.from('ConsumableEvents').insert([{
        username:        username.toLowerCase(),
        consumable_type: 'shield',
        event_type:      'granted',
        quantity:        1,
        metadata:        { source: 'grass_draw', cycle_id, winner_id },
      }]).catch(() => {}); // non-fatal if ConsumableEvents doesn't exist

      // Mark delivered
      await supabase.from('grass_draw_winners')
        .update({ delivered: true, delivered_at: new Date().toISOString(),
          metadata: { ...winner.metadata, delivered_by: admin_username } })
        .eq('id', winner_id);

      return res.status(200).json({ success: true, reward_type: 'shield', username });
    }

    // ── PROFILE PACK ──────────────────────────────────────────────────────────
    if (reward_type === 'profile_pack') {
      const pack_id = reward_reference;
      if (!pack_id) return res.status(400).json({ error: 'No pack assigned to this winner. Set reward_reference first.' });

      // Determine cover slugs for the pack
      const PACK_COVERS = {
        retro_covers_pack: [
          'marketplace_retro_beach','marketplace_retro_mountain',
          'marketplace_retro_sunflower','marketplace_retro_waterfall','marketplace_retro_night',
        ],
        anime_nature_pack: [
          'marketplace_cherry_blossom','marketplace_torii_forest',
          'marketplace_lake_sunrise','marketplace_beach_coast','marketplace_city_view',
        ],
        y2k_pack: [
          'marketplace_chrome_meadow','marketplace_aqua_coast','marketplace_bubble_forest',
          'marketplace_dream_sky','marketplace_cyber_garden',
        ],
        trenches_pack: [
          'marketplace_ath_overlook','marketplace_rug_pull_ravine','marketplace_bear_market_blizzard',
          'marketplace_moonbag_camp','marketplace_liquidity_lagoon',
        ],
      };

      const coverSlugs = PACK_COVERS[pack_id] || [];

      // Add covers to Profiles.unlocked_covers
      const { data: profile } = await supabase
        .from('Profiles')
        .select('unlocked_covers')
        .ilike('username', username)
        .maybeSingle();

      const existing = profile?.unlocked_covers || [];
      const merged = [...new Set([...existing, ...coverSlugs])];

      await supabase.from('Profiles')
        .update({ unlocked_covers: merged })
        .ilike('username', username);

      // Add to UserInventory
      await supabase.from('UserInventory').upsert([{
        username:     username.toLowerCase(),
        item_id:      pack_id,
        owned:        true,
        equipped:     false,
        purchased_at: new Date().toISOString(),
      }], { onConflict: 'username,item_id' });

      // Mark delivered
      await supabase.from('grass_draw_winners')
        .update({ delivered: true, delivered_at: new Date().toISOString(),
          metadata: { ...winner.metadata, delivered_by: admin_username, pack_id, cover_slugs: coverSlugs } })
        .eq('id', winner_id);

      return res.status(200).json({ success: true, reward_type: 'profile_pack', username, pack_id, coverSlugs });
    }

    // ── NFT ───────────────────────────────────────────────────────────────────
    if (reward_type === 'nft') {
      // Fetch wallet address
      const { data: profile } = await supabase
        .from('Profiles')
        .select('wallet_address, wallet_verified')
        .ilike('username', username)
        .maybeSingle();

      if (!profile?.wallet_verified || !profile?.wallet_address) {
        return res.status(400).json({ error: `@${username} has no verified wallet — cannot deliver NFT` });
      }

      // Mark as pending NFT transfer — actual transfer is manual via wallet
      await supabase.from('grass_draw_winners')
        .update({
          delivered: false, // set to true after manual transfer
          metadata: {
            ...winner.metadata,
            nft_status:      'pending_transfer',
            wallet_address:  profile.wallet_address,
            nft_collection:  reward_value?.nft_collection || 'screen_touchers',
            delivery_note:   `Transfer NFT to ${profile.wallet_address}`,
            flagged_by:      admin_username,
            flagged_at:      new Date().toISOString(),
          },
        })
        .eq('id', winner_id);

      return res.status(200).json({
        success:        true,
        reward_type:    'nft',
        username,
        wallet_address: profile.wallet_address,
        nft_collection: reward_value?.nft_collection || 'screen_touchers',
        status:         'pending_transfer',
        message:        `Transfer NFT to ${profile.wallet_address} then mark as delivered.`,
      });
    }

    return res.status(400).json({ error: `Unhandled reward_type: ${reward_type}` });

  } catch(e) {
    console.error('[deliver-reward]', e);
    return res.status(500).json({ error: e.message || 'Delivery failed' });
  }
}