-- Run AFTER chore/grass-draw-explicit-columns is deployed.
revoke select on public.grass_draw_cycles      from anon;
revoke select on public.grass_draw_entries     from anon;
revoke select on public.grass_draw_rewards     from anon;
revoke select on public.grass_draw_user_totals from anon;
grant select (id, name, starts_at, ends_at, status) on public.grass_draw_cycles to anon;
grant select (id, cycle_id, username, entry_type, created_at) on public.grass_draw_entries to anon;
grant select (id, cycle_id, reward_type, quantity, reward_value, draw_order, description) on public.grass_draw_rewards to anon;
grant select (cycle_id, username, proof_entries, total_bonus_entries, active_bonus_entries, pending_bonus_entries,
              total_active_entries, proof_day_count, eligible, disqualified) on public.grass_draw_user_totals to anon;
-- rollback: grant select on public.grass_draw_cycles, public.grass_draw_entries, public.grass_draw_rewards, public.grass_draw_user_totals to anon;
