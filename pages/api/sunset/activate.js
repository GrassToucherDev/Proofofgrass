// pages/api/sunset/activate.js
// Activates a Sunset Pass, extending a day's submission deadline from midnight to 02:00 UTC.
//   23:00–23:59 UTC → arms a pass for today (posting before midnight refunds it)
//   00:00–01:59 UTC → applies a pass to YESTERDAY (a post now counts for yesterday)
// The day itself is honoured in the lock_in_streak() database function.

import { createClient } from '@supabase/supabase-js';
import { sunsetWindow } from '../../../utils/sunsetPass';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const username = String(req.body?.username || '').replace(/@/g, '').toLowerCase().trim();
  if (!username) return res.status(400).json({ error: 'username required' });

  try {
    const now = new Date();
    const win = sunsetWindow(now);
    if (!win) {
      return res.status(400).json({
        error: 'Sunset Passes can only be activated between 11:00 PM and 2:00 AM UTC.',
      });
    }
    const activatedDate = win.date;

    // Nothing to extend if that day is already submitted (or a later one is).
    const { data: streak } = await supabase
      .from('Streaks').select('last_submission_date').ilike('username', username).maybeSingle();
    const last = streak?.last_submission_date ? String(streak.last_submission_date).slice(0, 10) : null;
    if (last && last >= activatedDate) {
      return res.status(400).json({
        error: win.mode === 'arm'
          ? "You've already posted today — no pass needed."
          : "You've already posted since yesterday's deadline, so a pass can't change it.",
      });
    }

    const { data: existing } = await supabase
      .from('SunsetPassActivations').select('id')
      .ilike('username', username).eq('activated_date', activatedDate).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Sunset Pass already activated for this day.' });

    const { data: consumable } = await supabase
      .from('UserConsumables').select('quantity')
      .ilike('username', username).eq('consumable_type', 'sunset_pass').maybeSingle();
    if (!consumable || consumable.quantity < 1) {
      return res.status(400).json({ error: 'No Sunset Passes available. Purchase one in the Marketplace.' });
    }

    // Record the activation first (unique index guards double-taps), then spend the pass
    // with a compare-and-set on the quantity we read.
    const { error: insErr } = await supabase.from('SunsetPassActivations').insert([{
      username: username, activated_date: activatedDate,
    }]);
    if (insErr) {
      if (insErr.code === '23505') return res.status(400).json({ error: 'Sunset Pass already activated for this day.' });
      throw insErr;
    }
    const { data: spent } = await supabase.from('UserConsumables')
      .update({ quantity: consumable.quantity - 1, updated_at: now.toISOString() })
      .ilike('username', username).eq('consumable_type', 'sunset_pass').eq('quantity', consumable.quantity)
      .select('quantity');
    if (!spent?.length) {
      await supabase.from('SunsetPassActivations').delete().ilike('username', username).eq('activated_date', activatedDate);
      return res.status(409).json({ error: 'Your passes changed while activating. Please try again.' });
    }

    await supabase.from('ConsumableEvents').insert([{
      username, consumable_type: 'sunset_pass', event_type: 'consumed', quantity: 1,
      metadata: { activated_date: activatedDate, activated_at: now.toISOString(), mode: win.mode },
    }]).then(() => {}, () => {});

    return res.status(200).json({
      success: true,
      activated_date: activatedDate,
      new_deadline: win.deadline,
      passes_remaining: consumable.quantity - 1,
    });
  } catch (e) {
    console.error('[sunset/activate]', e);
    return res.status(500).json({ error: e.message || 'Activation failed' });
  }
}
