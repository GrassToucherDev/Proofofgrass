// pages/api/grass-draw/execute-draw.js
// Server-side weighted random draw engine
// Auditable, seed-based, excludes ineligible users per draw order rules

import crypto from "crypto";
import { isAdminRequest } from "../../../utils/adminApi";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin authorization required' });

  const { cycle_id, draw_type, admin_username, dry_run = false } = req.body;

  if (!cycle_id || !draw_type || !admin_username) {
    return res.status(400).json({ error: 'cycle_id, draw_type, and admin_username required' });
  }

  const VALID_TYPES = ['grass_score', 'shield', 'profile_pack', 'nft'];
  if (!VALID_TYPES.includes(draw_type)) {
    return res.status(400).json({ error: `Invalid draw_type. Must be one of: ${VALID_TYPES.join(', ')}` });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── 1. Load cycle ─────────────────────────────────────────────────────────
    const { data: cycle } = await supabase
      .from('grass_draw_cycles')
      .select('*')
      .eq('id', cycle_id)
      .single();

    if (!cycle) return res.status(404).json({ error: 'Cycle not found' });
    if (!['active','closed'].includes(cycle.status)) {
      return res.status(400).json({ error: `Cycle status is "${cycle.status}" — must be active or closed to draw` });
    }

    // ── 2. Load reward config ─────────────────────────────────────────────────
    const { data: reward } = await supabase
      .from('grass_draw_rewards')
      .select('*')
      .eq('cycle_id', cycle_id)
      .eq('reward_type', draw_type)
      .single();

    if (!reward) return res.status(404).json({ error: `No reward config for ${draw_type} in this cycle` });
    if (draw_type !== 'nft' && reward.quantity === 0) {
      return res.status(400).json({ error: `Quantity for ${draw_type} is 0 — update reward config first` });
    }

    const draw_qty = reward.quantity || 1;

    // ── 3. Load existing winners for exclusion ────────────────────────────────
    const { data: existingWinners } = await supabase
      .from('grass_draw_winners')
      .select('username, reward_type, major_reward')
      .eq('cycle_id', cycle_id)
      .eq('voided', false);

    // One draw per reward type per cycle. (Void the winners first if you need to re-draw.)
    const alreadyDrawn = (existingWinners || []).filter(w => w.reward_type === draw_type).length;
    if (alreadyDrawn > 0 && !dry_run) {
      return res.status(409).json({ error: `${draw_type} has already been drawn for this cycle (${alreadyDrawn} winner${alreadyDrawn === 1 ? '' : 's'}). Void them first if you need to re-draw.` });
    }

    const majorWinnerSet = new Set(
      (existingWinners || [])
        .filter(w => w.major_reward)
        .map(w => w.username.toLowerCase())
    );
    const gsWinnerSet = new Set(
      (existingWinners || [])
        .filter(w => w.reward_type === 'grass_score')
        .map(w => w.username.toLowerCase())
    );

    // ── 4. Load eligible participants ─────────────────────────────────────────
    const { data: allTotals } = await supabase
      .from('grass_draw_user_totals')
      .select('username, total_active_entries, proof_entries, active_bonus_entries, proof_day_count')
      .eq('cycle_id', cycle_id)
      .eq('eligible', true)
      .eq('disqualified', false)
      .gt('total_active_entries', 0);

    let pool = (allTotals || []).map(t => ({
      ...t,
      total_active_entries: parseFloat(t.total_active_entries),
    }));

    // ── 5. Apply exclusions ───────────────────────────────────────────────────
    const excluded = [];

    // Exclude major reward winners from shield/pack/nft
    if (['shield', 'profile_pack', 'nft'].includes(draw_type)) {
      pool = pool.filter(t => {
        if (majorWinnerSet.has(t.username.toLowerCase())) {
          excluded.push({ username: t.username, reason: 'Already won major reward this cycle' });
          return false;
        }
        return true;
      });
    }

    // Exclude grass_score repeat winners
    if (draw_type === 'grass_score') {
      pool = pool.filter(t => {
        if (gsWinnerSet.has(t.username.toLowerCase())) {
          excluded.push({ username: t.username, reason: 'Already won Grass Score this cycle' });
          return false;
        }
        return true;
      });
    }

    // NFT: require connected wallet
    let walletSet = null;
    if (draw_type === 'nft') {
      const { data: walletProfiles } = await supabase
        .from('Profiles')
        .select('username')
        .eq('wallet_verified', true)
        .not('wallet_address', 'is', null)
        .neq('wallet_address', '');

      walletSet = new Set((walletProfiles || []).map(p => p.username.toLowerCase()));

      pool = pool.filter(t => {
        if (!walletSet.has(t.username.toLowerCase())) {
          excluded.push({ username: t.username, reason: 'No connected wallet (NFT draw requires wallet)' });
          return false;
        }
        return true;
      });
    }

    // Profile pack: skip users who own all eligible packs
    if (draw_type === 'profile_pack') {
      const eligiblePacks = reward.reward_value?.eligible_packs || [];
      if (eligiblePacks.length > 0) {
        const { data: inventoryRows } = await supabase
          .from('UserInventory')
          .select('username, item_id')
          .in('item_id', eligiblePacks)
          .eq('owned', true);

        const userPackCount = {};
        (inventoryRows || []).forEach(row => {
          const u = row.username.toLowerCase();
          userPackCount[u] = (userPackCount[u] || 0) + 1;
        });

        pool = pool.filter(t => {
          if ((userPackCount[t.username.toLowerCase()] || 0) >= eligiblePacks.length) {
            excluded.push({ username: t.username, reason: 'Already owns all eligible profile packs' });
            return false;
          }
          return true;
        });
      }
    }

    if (pool.length === 0) {
      return res.status(400).json({
        error: 'No eligible participants after applying exclusions',
        excluded_count: excluded.length,
        excluded,
      });
    }

    // ── 6. Generate draw seed ─────────────────────────────────────────────────
    // The seed is derived from the cycle, the draw type and the exact pool (usernames + entries), plus how many
    // times this type has been drawn or voided before. So a dry run and the real draw give the SAME winners
    // (no re-rolling until you like the result), and anyone holding the saved pool_snapshot can recompute them.
    const draw_timestamp = new Date().toISOString();

    // ── 7. Snapshot eligible pool at draw time ────────────────────────────────
    const pool_snapshot = pool
      .map(t => ({
        username:      t.username,
        entries:       t.total_active_entries,
        proof_entries: parseFloat(t.proof_entries),
        bonus_entries: parseFloat(t.active_bonus_entries),
      }))
      .sort((a, b) => a.username.localeCompare(b.username));

    const total_weight = pool.reduce((s, t) => s + t.total_active_entries, 0);

    const { count: priorRuns } = await supabase
      .from('grass_draw_winners').select('id', { count: 'exact', head: true })
      .eq('cycle_id', cycle_id).eq('reward_type', draw_type);
    const pool_hash = crypto.createHash('sha256')
      .update(pool_snapshot.map(p => `${p.username.toLowerCase()}:${p.entries}`).join('|')).digest('hex');
    const draw_seed = crypto.createHash('sha256')
      .update(`${cycle_id}::${draw_type}::${pool_hash}::${priorRuns || 0}`).digest('hex');

    // ── 8. Weighted random draw: sha256(seed:counter) -> uniform [0,1) ────────
    let counter = 0;
    function lcg_rand() {
      const h = crypto.createHash('sha256').update(`${draw_seed}:${counter++}`).digest();
      return h.readUIntBE(0, 6) / 281474976710656;   // 48 bits
    }

    const winners = [];
    const remaining = [...pool];
    const draw_log = []; // step-by-step audit

    for (let i = 0; i < draw_qty; i++) {
      if (remaining.length === 0) break;

      const round_weight = remaining.reduce((s, t) => s + t.total_active_entries, 0);
      const rand_val = lcg_rand() * round_weight;

      let cumulative = 0;
      let selected = remaining[remaining.length - 1];
      for (const p of remaining) {
        cumulative += p.total_active_entries;
        if (rand_val <= cumulative) { selected = p; break; }
      }

      winners.push(selected);
      draw_log.push({
        round:          i + 1,
        rand_val:       rand_val.toFixed(6),
        round_weight:   round_weight.toFixed(4),
        selected:       selected.username,
        entries:        selected.total_active_entries,
        pool_size:      remaining.length,
      });

      remaining.splice(remaining.indexOf(selected), 1);
    }

    // ── 9. If dry_run, return results without saving ──────────────────────────
    if (dry_run) {
      return res.status(200).json({
        dry_run: true,
        draw_type,
        draw_qty,
        draw_seed,
        pool_hash,
        draw_timestamp,
        total_weight,
        pool_size:     pool.length,
        excluded_count: excluded.length,
        excluded,
        winners:       winners.map(w => ({ username: w.username, entries: w.total_active_entries })),
        draw_log,
        pool_snapshot,
      });
    }

    // ── 10. Save winners to DB ────────────────────────────────────────────────
    const isMajor = ['shield', 'profile_pack', 'nft'].includes(draw_type);

    // For profile packs — assign specific pack to each winner
    const eligiblePacks = reward.reward_value?.eligible_packs || [];
    let packAssignments = {};
    if (draw_type === 'profile_pack' && eligiblePacks.length > 0) {
      const { data: inventoryRows } = await supabase
        .from('UserInventory').select('username, item_id')
        .in('item_id', eligiblePacks).eq('owned', true);

      const ownedByUser = {};
      (inventoryRows || []).forEach(r => {
        const u = r.username.toLowerCase();
        if (!ownedByUser[u]) ownedByUser[u] = new Set();
        ownedByUser[u].add(r.item_id);
      });

      winners.forEach(w => {
        const owned = ownedByUser[w.username.toLowerCase()] || new Set();
        const available = eligiblePacks.filter(p => !owned.has(p));
        packAssignments[w.username] = available[Math.floor(lcg_rand() * available.length)] || null;
      });
    }

    const inserts = winners.map(w => ({
      cycle_id,
      username:             w.username,
      reward_type:          draw_type,
      reward_reference:     draw_type === 'profile_pack' ? (packAssignments[w.username] || null) : null,
      reward_value:         draw_type === 'grass_score'
                              ? { amount: reward.reward_value?.amount || 250 }
                              : reward.reward_value || {},
      major_reward:         isMajor,
      active_entries_at_draw: w.total_active_entries,
      delivered:            false,
      voided:               false,
      metadata: {
        draw_seed,
        pool_hash,
        pool_snapshot,
        algorithm:      'sha256(seed:counter) 48-bit, weighted without replacement',
        draw_timestamp,
        draw_log,
        pool_size:      pool.length,
        total_weight,
        admin_username,
        excluded_count: excluded.length,
      },
    }));

    const { error: insertError } = await supabase
      .from('grass_draw_winners')
      .insert(inserts);

    if (insertError) throw new Error(insertError.message);

    // Deliver Grass Score immediately
    if (draw_type === 'grass_score') {
      const scoreAmount = reward.reward_value?.amount || 250;
      for (const w of winners) {
        const { data: prof } = await supabase.from('Profiles').select('grass_score').ilike('username', w.username).maybeSingle();
        const { error: gsErr } = await supabase.from('Profiles')
          .update({ grass_score: (prof?.grass_score || 0) + scoreAmount })
          .ilike('username', w.username);
        if (gsErr) { console.error('[execute-draw] grass_score credit failed', w.username, gsErr.message); continue; }   // leave undelivered so it can be retried
        await supabase.from('ScoreEvents').insert([{
          username:   w.username,
          event_type: 'grass_draw_win',
          points:     scoreAmount,
          metadata:   { draw_type, cycle_id, draw_seed },
        }]);
        // Mark delivered
        await supabase.from('grass_draw_winners')
          .update({ delivered: true, delivered_at: new Date().toISOString() })
          .eq('cycle_id', cycle_id).eq('username', w.username).eq('reward_type', 'grass_score');
      }
    }

    return res.status(200).json({
      success:       true,
      draw_type,
      draw_qty,
      draw_seed,
      draw_timestamp,
      winners_count: winners.length,
      winners:       winners.map(w => ({ username: w.username, entries: w.total_active_entries })),
      excluded_count: excluded.length,
      pool_size:     pool.length,
      total_weight,
      draw_log,
    });

  } catch(e) {
    console.error('[execute-draw]', e);
    return res.status(500).json({ error: e.message || 'Draw failed' });
  }
}