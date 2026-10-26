-- WAGO Wheel: 'nothing' spins are automatic (never manual). Run once in the Supabase SQL editor.
create or replace function public.wheel_spin_settle(p_intent uuid, p_signature text, p_wallet text, p_received numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  i wheel_intents%rowtype; w wheels%rowtype; s wheel_spins%rowtype; m_count int; guaranteed boolean := false;
  r numeric; total numeric; acc numeric := 0; pick wheel_prizes%rowtype; cand record; min_rank int; got boolean := false;
  owned_ids text[]; snap jsonb; v_spin uuid;
begin
  select * into i from wheel_intents where id = p_intent for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'intent_not_found'); end if;

  select * into s from wheel_spins where payment_tx = p_signature;
  if found then
    if s.intent_id = p_intent then return jsonb_build_object('ok', true, 'replay', true, 'spin', wheel_spin_json(s)); end if;
    return jsonb_build_object('ok', false, 'error', 'signature_used');
  end if;
  if i.status = 'settled' then return jsonb_build_object('ok', false, 'error', 'intent_already_paid'); end if;
  if p_received < i.price_tokens * 0.99 then return jsonb_build_object('ok', false, 'error', 'underpaid'); end if;

  select * into w from wheels where id = i.wheel_id;
  perform pg_advisory_xact_lock(hashtext('wheel:' || w.id::text));

  -- The meter is per Google account and wheel; the row lock makes concurrent spins count one at a time.
  insert into wheel_meters(wheel_id, google_id, count) values (w.id, i.google_id, 0) on conflict do nothing;
  select count into m_count from wheel_meters where wheel_id = w.id and google_id = i.google_id for update;
  m_count := m_count + 1;
  guaranteed := w.meter_enabled and m_count >= w.meter_spins;
  min_rank := wheel_rarity_rank(w.meter_min_rarity);

  -- Cover packs the user already owns are skipped (they could not be granted twice).
  select coalesce(array_agg(item_id), '{}') into owned_ids from "UserInventory" where lower(username) = i.username and owned;

  for pass in 1..2 loop
    select coalesce(sum(weight), 0) into total from wheel_prizes p
      where p.wheel_id = w.id and p.active and (p.inventory_remaining is null or p.inventory_remaining > 0)
        and not (p.reward_type = 'cosmetic_pack' and (p.reward_config->>'item_id') = any(owned_ids))
        and (pass = 2 or not guaranteed or wheel_rarity_rank(p.rarity) >= min_rank);
    if total > 0 then
      r := (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))::bit(48)::bigint)::numeric / 281474976710656.0 * total;
      for cand in
        select * from wheel_prizes p
         where p.wheel_id = w.id and p.active and (p.inventory_remaining is null or p.inventory_remaining > 0)
           and not (p.reward_type = 'cosmetic_pack' and (p.reward_config->>'item_id') = any(owned_ids))
           and (pass = 2 or not guaranteed or wheel_rarity_rank(p.rarity) >= min_rank)
         order by p.sort_order, p.id
      loop
        acc := acc + cand.weight;
        if r < acc then pick := cand; got := true; exit; end if;
      end loop;
      if not got then  -- floating point edge: take the last candidate
        select * into pick from wheel_prizes p
         where p.wheel_id = w.id and p.active and (p.inventory_remaining is null or p.inventory_remaining > 0)
           and not (p.reward_type = 'cosmetic_pack' and (p.reward_config->>'item_id') = any(owned_ids))
           and (pass = 2 or not guaranteed or wheel_rarity_rank(p.rarity) >= min_rank)
         order by p.sort_order desc, p.id desc limit 1;
        got := true;
      end if;
    end if;
    exit when got;
  end loop;
  if not got then return jsonb_build_object('ok', false, 'error', 'pool_empty'); end if;

  if pick.inventory_remaining is not null then
    update wheel_prizes set inventory_remaining = inventory_remaining - 1 where id = pick.id and inventory_remaining > 0;
    if not found then return jsonb_build_object('ok', false, 'error', 'inventory_conflict'); end if;
  end if;

  snap := jsonb_build_object('id', pick.id, 'name', pick.name, 'description', pick.description, 'reward_type', pick.reward_type,
    'reward_config', pick.reward_config, 'rarity', pick.rarity, 'image_url', pick.image_url, 'segment', pick.segment);
  insert into wheel_spins(wheel_id, intent_id, google_id, username, wallet, payment_tx, spin_price, amount_locked, eco_amount,
      prize_id, prize_snapshot, rarity, meter_guaranteed, segment, fulfillment_status)
    values (w.id, i.id, i.google_id, i.username, p_wallet, p_signature, i.price_tokens, i.lock_amount, i.eco_amount,
      pick.id, snap, pick.rarity, guaranteed and wheel_rarity_rank(pick.rarity) >= min_rank, pick.segment,
      case when pick.reward_type in ('cosmetic_pack','shield','sunset_pass','grass_tickets','nothing') then 'pending' else 'manual_required' end)
    returning id into v_spin;

  update wheel_meters set count = case when guaranteed and wheel_rarity_rank(pick.rarity) >= min_rank then 0 else m_count end, updated_at = now()
    where wheel_id = w.id and google_id = i.google_id;
  update wheel_intents set status = 'settled', spin_id = v_spin where id = i.id;
  select * into s from wheel_spins where id = v_spin;
  return jsonb_build_object('ok', true, 'replay', false, 'spin', wheel_spin_json(s));
end $$;

-- Repair existing no-prize spins that were marked manual.
update wheel_spins set fulfillment_status = 'completed', fulfilled_at = now(), fulfillment_note = null
where prize_snapshot->>'reward_type' = 'nothing' and fulfillment_status in ('manual_required','pending','failed');
