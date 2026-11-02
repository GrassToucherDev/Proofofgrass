-- WAGO: Fright Bits meter guarantee. Safe to re-run.
-- While a Fright Bits collection is ACTIVE (before its ends_at) and at least one monster is available, a meter-guaranteed spin
-- can ONLY land on a monster. Once the event ends or is paused, or every monster is gone, the guarantee is the normal
-- "Rare or better" again. The meter still resets on any Rare-or-better prize (see wheel_meter_reset_on_rare.sql).
-- Patches the LIVE wheel_spin_settle (which already carries the Fright Bits, free-spin and meter-reset changes).
do $$
declare def text; hits int;
  p constant text := '(pass = 2 or not guaranteed or wheel_rarity_rank(p.rarity) >= min_rank)';
  decl_old constant text := 'guaranteed boolean := false;';
  mr_old constant text := 'min_rank := wheel_rarity_rank(w.meter_min_rarity);';
  mr_new constant text := 'min_rank := wheel_rarity_rank(w.meter_min_rarity);
  fb_only := guaranteed
    and exists (select 1 from collectible_collections c where c.wheel_id = w.id and c.status = ''active'' and (c.ends_at is null or c.ends_at >= i.created_at))
    and exists (select 1 from wheel_prizes q where q.wheel_id = w.id and q.active and q.collectible_id is not null
                  and (q.inventory_remaining is null or q.inventory_remaining > 0) and (q.available_until is null or q.available_until >= i.created_at));';
begin
  select pg_get_functiondef('public.wheel_spin_settle(uuid,text,text,numeric)'::regprocedure) into def;
  if def like '%fb_only%' then raise notice 'fright bits meter guarantee already patched'; return; end if;
  hits := (length(def) - length(replace(def, p, ''))) / length(p);
  if hits <> 3 then raise exception 'expected 3 candidate predicates in wheel_spin_settle, found %', hits; end if;
  if position(decl_old in def) = 0 or position(mr_old in def) = 0 then raise exception 'anchor not found in wheel_spin_settle'; end if;
  def := replace(def, decl_old, decl_old || ' fb_only boolean := false;');
  def := replace(def, mr_old, mr_new);
  def := replace(def, p, p || ' and (pass = 2 or not fb_only or p.collectible_id is not null)');
  execute def;
end $$;
-- rollback: re-run wheel_meter_reset_on_rare.sql's source function from wheel_core.sql is NOT needed; simplest is to
--   disable the event (fright_bits_pause) which makes the guarantee normal again, or ask for a revert patch.
