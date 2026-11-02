-- WAGO: Fright Bits meter guarantee (final rules). Safe to re-run; works whether or not the earlier version of this patch was applied.
-- While a Fright Bits collection is ACTIVE (before its ends_at) and at least one monster is available:
--   * a meter-guaranteed spin can ONLY land on a monster, and
--   * ONLY a monster win resets the meter (a Shield, $1 TOUCHGRASS, etc. does not).
-- Otherwise (event ended or paused, or every monster is gone) the normal rules apply: guaranteed Rare or better,
-- and any Rare-or-better prize resets the meter (wheel_meter_reset_on_rare.sql, which must already be applied).
do $$
declare def text; hits int;
  p constant text := '(pass = 2 or not guaranteed or wheel_rarity_rank(p.rarity) >= min_rank)';
  mr_old constant text := 'min_rank := wheel_rarity_rank(w.meter_min_rarity);';
  v1 constant text := 'min_rank := wheel_rarity_rank(w.meter_min_rarity);
  fb_only := guaranteed
    and exists (select 1 from collectible_collections c where c.wheel_id = w.id and c.status = ''active'' and (c.ends_at is null or c.ends_at >= i.created_at))
    and exists (select 1 from wheel_prizes q where q.wheel_id = w.id and q.active and q.collectible_id is not null
                  and (q.inventory_remaining is null or q.inventory_remaining > 0) and (q.available_until is null or q.available_until >= i.created_at));';
  v2 constant text := 'min_rank := wheel_rarity_rank(w.meter_min_rarity);
  fb_live := exists (select 1 from collectible_collections c where c.wheel_id = w.id and c.status = ''active'' and (c.ends_at is null or c.ends_at >= i.created_at))
    and exists (select 1 from wheel_prizes q where q.wheel_id = w.id and q.active and q.collectible_id is not null
                  and (q.inventory_remaining is null or q.inventory_remaining > 0) and (q.available_until is null or q.available_until >= i.created_at));
  fb_only := guaranteed and fb_live;';
  rs_old constant text := 'case when wheel_rarity_rank(pick.rarity) >= min_rank then 0 else m_count end';
  rs_new constant text := 'case when wheel_rarity_rank(pick.rarity) >= min_rank and (pick.collectible_id is not null or not fb_live) then 0 else m_count end';
begin
  select pg_get_functiondef('public.wheel_spin_settle(uuid,text,text,numeric)'::regprocedure) into def;
  if def like '%fb_live%' then raise notice 'fright bits meter rules already applied'; return; end if;
  if position(rs_old in def) = 0 then raise exception 'run wheel_meter_reset_on_rare.sql first (reset expression not found)'; end if;
  if def like '%fb_only%' then
    if position(v1 in def) = 0 then raise exception 'earlier fright bits patch not in the expected form'; end if;
    def := replace(def, v1, v2);
    def := replace(def, 'fb_only boolean := false;', 'fb_only boolean := false; fb_live boolean := false;');
  else
    hits := (length(def) - length(replace(def, p, ''))) / length(p);
    if hits <> 3 then raise exception 'expected 3 candidate predicates in wheel_spin_settle, found %', hits; end if;
    if position('guaranteed boolean := false;' in def) = 0 or position(mr_old in def) = 0 then raise exception 'anchor not found in wheel_spin_settle'; end if;
    def := replace(def, 'guaranteed boolean := false;', 'guaranteed boolean := false; fb_only boolean := false; fb_live boolean := false;');
    def := replace(def, mr_old, v2);
    def := replace(def, p, p || ' and (pass = 2 or not fb_only or p.collectible_id is not null)');
  end if;
  def := replace(def, rs_old, rs_new);
  execute def;
end $$;
-- rollback: press Pause on the Fright Bits page (the rules go back to normal immediately).
