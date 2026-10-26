-- WAGO Wheel: shorten a spin's price quote from 30 to 10 minutes.
-- A shorter lock-in leaves less room to open a quote and wait for the token price to drop before paying.
-- Open quotes keep the expiry they were created with. Safe to re-run.
create or replace function public.wheel_intent_create(p_wheel uuid, p_google text, p_username text, p_token_price_usd numeric, p_is_tester boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w wheels%rowtype; v_tokens numeric; v_lock numeric; v_eco numeric; v_open wheel_intents%rowtype; v_id uuid; v_recent int;
begin
  select * into w from wheels where id = p_wheel;
  if not found or w.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if w.visibility = 'admin' and not p_is_tester then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if (w.starts_at is not null and w.starts_at > now()) or (w.ends_at is not null and w.ends_at < now()) then
    return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if not wheel_is_playable(p_wheel) then return jsonb_build_object('ok', false, 'error', 'not_playable'); end if;

  select count(*) into v_recent from wheel_intents where google_id = p_google and created_at > now() - interval '1 hour';
  if v_recent >= 30 then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;

  -- Reuse a recent unpaid intent so refreshing never piles up quotes.
  select * into v_open from wheel_intents where wheel_id = p_wheel and google_id = p_google and status = 'pending' and expires_at > now()
    order by created_at desc limit 1;
  if found then
    return jsonb_build_object('ok', true, 'intent_id', v_open.id, 'price_tokens', v_open.price_tokens, 'lock_amount', v_open.lock_amount, 'eco_amount', v_open.eco_amount, 'expires_at', v_open.expires_at, 'price_usd', v_open.price_usd);
  end if;

  if w.price_mode = 'usd' then
    if p_token_price_usd is null or p_token_price_usd <= 0 then return jsonb_build_object('ok', false, 'error', 'price_unavailable'); end if;
    v_tokens := ceil(w.price_usd / p_token_price_usd);
  else
    v_tokens := w.price_tokens;
  end if;
  v_lock := round(v_tokens * w.lock_pct / 100.0, 6);
  v_eco  := v_tokens - v_lock;
  insert into wheel_intents(wheel_id, google_id, username, price_tokens, price_usd, token_price_usd, lock_amount, eco_amount, expires_at)
    values (p_wheel, p_google, lower(p_username), v_tokens, case when w.price_mode='usd' then w.price_usd end, p_token_price_usd, v_lock, v_eco, now() + interval '10 minutes')
    returning id into v_id;
  return jsonb_build_object('ok', true, 'intent_id', v_id, 'price_tokens', v_tokens, 'lock_amount', v_lock, 'eco_amount', v_eco, 'expires_at', now() + interval '10 minutes', 'price_usd', case when w.price_mode='usd' then w.price_usd end);
end $$;
