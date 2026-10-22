-- Checkout resume/cancel for Grove banners. Safe to re-run. Run in the Supabase SQL editor.

create or replace function grove_banners_get(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_grove uuid := grove_of(p_username); g groves%rowtype;
begin
  if v_grove is not null then select * into g from groves where id = v_grove; end if;
  return jsonb_build_object(
    'grove_id',     v_grove,
    'grove_name',   g.name,
    'owner',        lower(g.owner_username),
    'active',       coalesce(g.active_banner_id, 'default'),
    'banners', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'art_path', b.art_path,
        'price_usd', b.price_usd, 'is_default', b.is_default,
        'purchasable', (not b.is_default and b.available and b.price_usd is not null),
        'unlocked', (b.is_default or u.grove_id is not null),
        'unlocked_by', u.purchased_by,
        'pending', exists (select 1 from grove_banner_purchases p where p.grove_id = v_grove and p.banner_id = b.id and p.status = 'pending' and p.expires_at > now()),
        'pending_mine', exists (select 1 from grove_banner_purchases p where p.grove_id = v_grove and p.banner_id = b.id and p.status = 'pending' and p.expires_at > now() and lower(p.buyer) = lower(btrim(p_username))),
        'pending_by', (select p.buyer from grove_banner_purchases p where p.grove_id = v_grove and p.banner_id = b.id and p.status = 'pending' and p.expires_at > now() limit 1),
        'pending_until', (select p.expires_at from grove_banner_purchases p where p.grove_id = v_grove and p.banner_id = b.id and p.status = 'pending' and p.expires_at > now() limit 1)
      ) order by b.sort_order)
      from grove_banners b left join grove_banner_unlocks u on u.banner_id = b.id and u.grove_id = v_grove
      where b.available or b.is_default or u.grove_id is not null), '[]'::jsonb));
end $$;

create or replace function grove_banner_cancel(p_username text, p_banner text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(btrim(p_username)); v_grove uuid; v_n int;
begin
  v_grove := grove_of(u);
  if v_grove is null then return jsonb_build_object('ok', false, 'error', 'not_in_grove'); end if;
  -- only the buyer's own checkout, and only while no payment signature is attached to it
  update grove_banner_purchases set status = 'expired', note = 'Cancelled by buyer'
   where grove_id = v_grove and banner_id = p_banner and status = 'pending' and lower(buyer) = u and transaction_signature is null;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'cancelled', v_n);
end $$;

revoke all on function grove_banner_cancel(text,text) from public, anon, authenticated;
grant execute on function grove_banner_cancel(text,text) to service_role;
