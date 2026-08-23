// pages/api/grass-draw/award-bonus.js
// Awards bonus Grass Draw entries for ecosystem actions
// Called by: admin pages, automated triggers (challenge win, referral convert, field guide, flex card)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    username,
    entry_type,   // spotlight | flex_card | field_guide | x_engagement | challenge_win | referral_convert | manual
    source_id,
    admin_username,
    notes,
    cycle_id,
  } = req.body;

  if (!username || !entry_type) return res.status(400).json({ error: 'username and entry_type required' });

  const VALID_TYPES = ['spotlight','flex_card','field_guide','x_engagement','challenge_win','referral_convert','manual'];
  if (!VALID_TYPES.includes(entry_type)) return res.status(400).json({ error: `Invalid entry_type` });

  const ADMIN_TYPES = ['spotlight','x_engagement','manual'];
  if (ADMIN_TYPES.includes(entry_type) && !admin_username) {
    return res.status(400).json({ error: `entry_type "${entry_type}" requires admin_username` });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── 1. Get active cycle ─────────────────────────────────────────────────
    let activeCycleId = cycle_id;
    if (!activeCycleId) {
      const { data: cycle } = await supabase
        .from('grass_draw_cycles')
        .select('id')
        .eq('status', 'active')
        .lte('starts_at', new Date().toISOString())
        .gte('ends_at', new Date().toISOString())
        .single();
      if (!cycle) return res.status(400).json({ error: 'No active Grass Draw cycle.' });
      activeCycleId = cycle.id;
    }

    // ── 2. Check not disqualified ───────────────────────────────────────────
    const { data: disq } = await supabase
      .from('grass_draw_disqualifications')
      .select('id')
      .ilike('username', username)
      .or(`cycle_id.eq.${activeCycleId},permanent.eq.true`)
      .eq('reversed', false)
      .maybeSingle();
    if (disq) return res.status(403).json({ error: 'User is disqualified from this Grass Draw cycle.' });

    // ── 3. Entry amounts ────────────────────────────────────────────────────
    const BONUS_AMOUNTS = {
      spotlight: 10, x_engagement: 5, challenge_win: 8,
      referral_convert: 5, flex_card: 2, field_guide: 1, manual: null,
    };
    let raw_amount = BONUS_AMOUNTS[entry_type];
    if (entry_type === 'manual') {
      raw_amount = parseFloat(req.body.amount);
      if (!raw_amount || raw_amount <= 0) return res.status(400).json({ error: 'Manual entries require a positive amount.' });
    }

    // ── 4. Weekly caps (flex_card: 3/week, field_guide: 5/week, x_engagement: 1/week) ──
    const WEEKLY_CAP_TYPES = { flex_card: 3, field_guide: 5, x_engagement: 1 };
    if (WEEKLY_CAP_TYPES[entry_type] !== undefined) {
      const now = new Date();
      const daysToMonday = now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() - daysToMonday);
      monday.setUTCHours(0, 0, 0, 0);
      const weekStart = monday.toISOString().split('T')[0];
      const cap = WEEKLY_CAP_TYPES[entry_type];

      const { data: capRow } = await supabase
        .from('grass_draw_weekly_caps')
        .select('count')
        .ilike('username', username)
        .eq('week_start', weekStart)
        .eq('cap_type', entry_type)
        .maybeSingle();

      if ((capRow?.count ?? 0) >= cap) {
        return res.status(400).json({ error: `Weekly ${entry_type} cap of ${cap} reached. Resets Monday 00:00 UTC.` });
      }

      // Check duplicate source
      if (source_id) {
        const { data: dup } = await supabase
          .from('grass_draw_entries')
          .select('id')
          .eq('cycle_id', activeCycleId)
          .ilike('username', username)
          .eq('entry_type', entry_type)
          .eq('source_id', source_id)
          .maybeSingle();
        if (dup) return res.status(400).json({ error: 'This submission has already been awarded bonus entries.' });
      }

      await supabase.from('grass_draw_weekly_caps').upsert([{
        username: username.toLowerCase(), week_start: weekStart,
        cap_type: entry_type, count: (capRow?.count ?? 0) + 1,
      }], { onConflict: 'username,week_start,cap_type' });
    }

    // ── 5. Spotlight: once per cycle ────────────────────────────────────────
    if (entry_type === 'spotlight') {
      const { data: existingSpot } = await supabase
        .from('grass_draw_entries')
        .select('id')
        .eq('cycle_id', activeCycleId)
        .ilike('username', username)
        .eq('entry_type', 'spotlight')
        .maybeSingle();
      if (existingSpot) return res.status(400).json({ error: 'Spotlight bonus already awarded this cycle.' });
    }

    // ── 6. Write to ledger ──────────────────────────────────────────────────
    await supabase.from('grass_draw_entries').insert([{
      cycle_id: activeCycleId,
      username: username.toLowerCase(),
      entry_type,
      source_id: source_id || null,
      raw_amount,
      weighted_amount: raw_amount,
      multiplier: 1.0,
      admin_username: admin_username || null,
      notes: notes || null,
      metadata: { awarded_by: admin_username || 'system', source_id },
    }]);

    // ── 7. Recalculate totals ───────────────────────────────────────────────
    await supabase.rpc('recalculate_draw_totals', {
      p_cycle_id: activeCycleId,
      p_username: username.toLowerCase(),
    });

    const { data: totals } = await supabase
      .from('grass_draw_user_totals')
      .select('*')
      .eq('cycle_id', activeCycleId)
      .ilike('username', username)
      .maybeSingle();

    return res.status(200).json({ success: true, entry_type, amount: raw_amount, totals });

  } catch(e) {
    console.error('[award-bonus]', e);
    return res.status(500).json({ error: e.message || 'Failed to award bonus entries.' });
  }
}