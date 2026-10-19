// GET /api/sunset/status?username=…
// What the UI needs to decide whether to offer a Sunset Pass right now.
import { createClient } from '@supabase/supabase-js';
import { sunsetWindow } from '../../../utils/sunsetPass';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const username = String(req.query.username || '').replace(/@/g, '').toLowerCase().trim();
  if (!username) return res.status(400).json({ error: 'username required' });

  const win = sunsetWindow(new Date());
  const [{ data: cons }, { data: streak }] = await Promise.all([
    supabase.from('UserConsumables').select('quantity').ilike('username', username).eq('consumable_type', 'sunset_pass').maybeSingle(),
    supabase.from('Streaks').select('current_streak,last_submission_date').ilike('username', username).maybeSingle(),
  ]);
  const passes = cons?.quantity ?? 0;
  if (!win) return res.status(200).json({ window: null, passes, activated: false, can_activate: false });

  const last = streak?.last_submission_date ? String(streak.last_submission_date).slice(0, 10) : null;
  // A pass is only worth offering when it saves a live streak: the extended day isn't
  // submitted yet, but the day before it was.
  const dayBefore = new Date(new Date(win.date + 'T00:00:00Z').getTime() - 86400000).toISOString().slice(0, 10);
  const needed = last === dayBefore;
  const { data: act } = await supabase.from('SunsetPassActivations').select('id')
    .ilike('username', username).eq('activated_date', win.date).maybeSingle();

  return res.status(200).json({
    window: win.mode, date: win.date, deadline: win.deadline, passes,
    activated: !!act,
    needed,
    can_activate: needed && !act && passes > 0,
    current_streak: streak?.current_streak ?? 0,
  });
}
