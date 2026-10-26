-- WAGO Wheel: a 'nothing' (no prize) outcome. Run once in the Supabase SQL editor.
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.wheel_prizes'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%reward_type%' loop
    execute format('alter table public.wheel_prizes drop constraint %I', c);
  end loop;
end $$;
alter table public.wheel_prizes add constraint wheel_prizes_reward_type_check check (reward_type in ('cosmetic_pack','shield','sunset_pass','grass_tickets','spl_token','touchgrass','sol','nft','badge','collectible','partner_asset','manual','nothing'));

create or replace function public.wheel_fulfill(p_spin uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare s wheel_spins%rowtype; cfg jsonb; t text; qty int; cyc uuid; slugs text[]; item text; cur text[];
begin
  update wheel_spins set fulfillment_status = 'processing' where id = p_spin and fulfillment_status in ('pending','failed') returning * into s;
  if not found then
    select * into s from wheel_spins where id = p_spin;
    if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
    return jsonb_build_object('ok', true, 'status', s.fulfillment_status);
  end if;
  t := s.prize_snapshot->>'reward_type'; cfg := coalesce(s.prize_snapshot->'reward_config', '{}'::jsonb);

  if t in ('shield','sunset_pass') then
    qty := greatest(coalesce((cfg->>'quantity')::int, 1), 1);
    insert into "UserConsumables"(username, consumable_type, quantity) values (s.username, case t when 'shield' then 'shield' else 'sunset_pass' end, qty)
      on conflict (username, consumable_type) do update set quantity = "UserConsumables".quantity + qty, updated_at = now();
    insert into "ConsumableEvents"(username, consumable_type, event_type, quantity, metadata)
      values (s.username, case t when 'shield' then 'shield' else 'sunset_pass' end, 'granted', qty, jsonb_build_object('source', 'wago_wheel', 'spin_id', s.id));
    if t = 'shield' then update "Streaks" set shield_count = coalesce(shield_count, 0) + qty where lower(username) = s.username; end if;

  elsif t = 'cosmetic_pack' then
    item := cfg->>'item_id';
    select coalesce(array_agg(x), '{}') into slugs from jsonb_array_elements_text(coalesce(cfg->'cover_slugs', '[]'::jsonb)) x;
    insert into "UserInventory"(username, item_id, owned, equipped, purchased_at) values (s.username, item, true, false, now())
      on conflict (username, item_id) do update set owned = true;
    select coalesce(unlocked_covers, '{}') into cur from "Profiles" where lower(username) = s.username;
    update "Profiles" set unlocked_covers = (select coalesce(array_agg(distinct e), '{}') from unnest(coalesce(cur, '{}') || slugs) e) where lower(username) = s.username;

  elsif t = 'grass_tickets' then
    qty := greatest(coalesce((cfg->>'amount')::int, 1), 1);
    select id into cyc from grass_draw_cycles where status = 'active' and starts_at <= now() and ends_at >= now() limit 1;
    if cyc is null then
      update wheel_spins set fulfillment_status = 'failed', fulfillment_note = 'No active Grass Draw cycle. Retry when one is open.' where id = s.id;
      return jsonb_build_object('ok', false, 'error', 'no_active_cycle');
    end if;
    if not exists (select 1 from grass_draw_entries where entry_type = 'wheel' and source_id = s.id::text) then
      insert into grass_draw_entries(cycle_id, username, entry_type, source_id, raw_amount, weighted_amount, multiplier, notes, metadata)
        values (cyc, s.username, 'wheel', s.id::text, qty, qty, 1.0, 'WAGO Wheel prize', jsonb_build_object('awarded_by', 'wago_wheel', 'spin_id', s.id));
      perform recalculate_draw_totals(cyc, s.username);
    end if;
  elsif t = 'nothing' then
    null;  -- no prize: the spin is simply complete
  else
    update wheel_spins set fulfillment_status = 'manual_required' where id = s.id;
    return jsonb_build_object('ok', true, 'status', 'manual_required');
  end if;

  update wheel_spins set fulfillment_status = 'completed', fulfilled_at = now(), fulfillment_note = null where id = s.id;
  return jsonb_build_object('ok', true, 'status', 'completed');
exception when others then
  update wheel_spins set fulfillment_status = 'failed', fulfillment_note = left(sqlerrm, 300) where id = p_spin and fulfillment_status in ('pending','processing','failed');
  return jsonb_build_object('ok', false, 'error', 'fulfillment_failed');
end $$;

-- "Prizes claimed" should not count no-prize spins.
create or replace function public.wheel_stats(p_wheel uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total_spins', count(*),
    'prizes_claimed', count(*) filter (where fulfillment_status = 'completed' and coalesce(prize_snapshot->>'reward_type','') <> 'nothing'),
    'locked_amount', coalesce(sum(amount_locked) filter (where lock_status = 'locked'), 0),
    'queued_amount', coalesce(sum(amount_locked) filter (where lock_status = 'queued'), 0))
  from wheel_spins where wheel_id = p_wheel $$;
