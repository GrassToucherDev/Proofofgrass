-- WAGO Wheel meter: ANY Rare-or-better prize (lucky or guaranteed) resets the meter. Safe to re-run.
-- Before: the meter only reset when the guaranteed spin landed. A player who pulled a Rare by luck on spin 6
--         still got a second guaranteed Rare on spin 10.
-- After:  the meter counts spins since the player's last Rare-or-better. At N spins without one, the next spin is guaranteed.
-- This patches the LIVE wheel_spin_settle (which already carries the Fright Bits and free-spin changes) by changing one expression.
do $$
declare def text;
  old_e constant text := 'case when guaranteed and wheel_rarity_rank(pick.rarity) >= min_rank then 0 else m_count end';
  new_e constant text := 'case when wheel_rarity_rank(pick.rarity) >= min_rank then 0 else m_count end';
begin
  select pg_get_functiondef('public.wheel_spin_settle(uuid,text,text,numeric)'::regprocedure) into def;
  if position(old_e in def) = 0 then
    if position(new_e in def) > 0 then raise notice 'meter reset already patched'; return; end if;
    raise exception 'meter reset expression not found in wheel_spin_settle';
  end if;
  execute replace(def, old_e, new_e);
end $$;
-- rollback: re-run the same block with old_e and new_e swapped.
