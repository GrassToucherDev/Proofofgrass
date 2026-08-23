// pages/api/grass-draw/execute-draw.js
// Server-side weighted random draw engine
// Auditable, seed-based, excludes ineligible users per draw order rules

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
    const draw_seed = `${cycle_id}::${draw_type}::${Date.now()}::${Math.random().toString(36).slice(2)}`;
    const draw_timestamp = new Date().toISOString();

    // ── 7. Snapshot eligible pool at draw time ────────────────────────────────
    const pool_snapshot = pool.map(t => ({
      username:      t.username,
      entries:       t.total_active_entries,
      proof_entries: parseFloat(t.proof_entries),
      bonus_entries: parseFloat(t.active_bonus_entries),
    }));

    const total_weight = pool.reduce((s, t) => s + t.total_active_entries, 0);

    // ── 8. Weighted random draw (seeded via simple LCG for reproducibility) ───
    // Simple LCG seeded from the draw_seed hash
    function hashSeed(str) {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
      }
      return Math.abs(h);
    }

    let lcg_state = hashSeed(draw_seed);
    function lcg_rand() {
      lcg_state = (Math.imul(1664525, lcg_state) + 1013904223) >>> 0;
      return lcg_state / 0x100000000;
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
        await supabase.from('Profiles')
          .update({ grass_score: supabase.rpc('increment', { x: scoreAmount }) })
          .ilike('username', w.username);
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