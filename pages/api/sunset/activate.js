// pages/api/sunset/activate.js
// Activates a Sunset Pass for the current UTC day
// Extends submission deadline from midnight to 2:00 AM UTC

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const now       = new Date();
    const todayUTC  = now.toISOString().split('T')[0];
    const hourUTC   = now.getUTCHours();

    // Only valid between 11 PM and 2 AM UTC (23:00–02:00)
    const inWindow = hourUTC === 23 || hourUTC === 0 || hourUTC === 1;
    if (!inWindow) {
      return res.status(400).json({
        error: 'Sunset Passes can only be activated between 11:00 PM and 2:00 AM UTC.',
      });
    }

    // Check not already activated today
    const activatedDate = hourUTC === 23 ? todayUTC
      : new Date(now.getTime() - 86400000).toISOString().split('T')[0]; // past midnight = yesterday's date

    const { data: existing } = await supabase
      .from('SunsetPassActivations')
      .select('id')
      .ilike('username', username)
      .eq('activated_date', activatedDate)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Sunset Pass already activated for today.' });
    }

    // Check user has a sunset pass
    const { data: consumable } = await supabase
      .from('UserConsumables')
      .select('quantity')
      .ilike('username', username)
      .eq('consumable_type', 'sunset_pass')
      .maybeSingle();

    if (!consumable || consumable.quantity < 1) {
      return res.status(400).json({ error: 'No Sunset Passes available. Purchase one in the Marketplace.' });
    }

    // Consume the pass
    await supabase.from('UserConsumables')
      .update({ quantity: consumable.quantity - 1, updated_at: new Date().toISOString() })
      .ilike('username', username)
      .eq('consumable_type', 'sunset_pass');

    // Record activation
    await supabase.from('SunsetPassActivations').insert([{
      username:       username.toLowerCase(),
      activated_date: activatedDate,
    }]);

    // Log consumable event
    await supabase.from('ConsumableEvents').insert([{
      username:        username.toLowerCase(),
      consumable_type: 'sunset_pass',
      event_type:      'consumed',
      quantity:        1,
      metadata:        { activated_date: activatedDate, activated_at: now.toISOString() },
    }]).catch(() => {});

    return res.status(200).json({
      success:        true,
      activated_date: activatedDate,
      new_deadline:   `${activatedDate}T02:00:00Z`,
      passes_remaining: consumable.quantity - 1,
    });

  } catch(e) {
    console.error('[sunset/activate]', e);
    return res.status(500).json({ error: e.message || 'Activation failed' });
  }
}