-- WAGO: Fright Bits — the ten characters. Run AFTER fright_bits.sql. Safe to re-run (never changes ownership or live status).
--
-- Everything is created OFF: the collection starts in 'draft' with paid_eligibility_enabled = false, and every wheel prize is
-- inactive. Nothing can be won until the legal gate is opened and the collection is started from the admin page.
-- Needs the featured WAGO Wheel to exist. Ends Fri Nov 6 2026 11:59 PM America/New_York (stored as UTC).
do $$
declare w uuid; col uuid; cutoff timestamptz := timestamptz '2026-11-06 23:59:59 America/New_York';
  r record; pid uuid; kid uuid;
begin
  select id into w from wheels where featured limit 1;
  if w is null then raise exception 'No featured wheel found. Create the WAGO Wheel first.'; end if;

  insert into collectible_collections(slug, name, description, wheel_id, status, max_active, starts_at, ends_at, reveal_mode, paid_eligibility_enabled)
    values ('fright-bits', 'WAGO: Fright Bits', 'Ten one-of-one Halloween monsters hiding in the WAGO Wheel.', w, 'draft', 5,
            timestamptz '2026-10-31 00:00:00 America/New_York', cutoff, 'silhouette', false)
    on conflict (slug) do nothing;
  select id into col from collectible_collections where slug = 'fright-bits';

  for r in select * from (values
    (1,  'crashberry',       'WAGO: Crashberry',       'Juice Box Vampire', 'A berry-themed little monster with a market-crashing bite.',  'crashberry.png'),
    (2,  'dusty-trails',     'WAGO: Dusty Trails',     'Mummy',             'Fresh out of the ancient hiking trails.',                      'dusty-trails.png'),
    (3,  'count-canopy',     'WAGO: Count Canopy',     'Vampire',           'Lurking beneath the treetops after sunset.',                   'count-canopy.png'),
    (4,  'rotwood',          'WAGO: Rotwood',          'Zombie',            'The forest’s most stubborn undead wanderer.',             'rotwood.png'),
    (5,  'howlwood',         'WAGO: Howlwood',         'Werewolf',          'When the full moon rises, the wilderness answers.',            'howlwood.png'),
    (6,  'moonbloom',        'WAGO: Moonbloom',        'Wizard',            'Casting spells under the stars.',                              'moonbloom.png'),
    (7,  'bonebranch',       'WAGO: Bonebranch',       'Skeleton',          'All bones, no leaves.',                                        'bonebranch.png'),
    (8,  'captain-driftwood','WAGO: Captain Driftwood','Pirate',            'Hunting treasure across forgotten shores.',                    'captain-driftwood.png'),
    (9,  'patchroot',        'WAGO: Patchroot',        'Scarecrow',         'Guardian of the autumn fields.',                               'patchroot.png'),
    (10, 'mistwalker',       'WAGO: Mistwalker',       'Ghost',             'A mysterious spirit drifting through foggy trails.',           'mistwalker.png')
  ) as t(n, slug, name, chr, descr, file)
  loop
    select id into kid from collectibles where slug = r.slug;
    if kid is null then
      insert into wheel_prizes(wheel_id, name, description, reward_type, reward_config, rarity, weight, inventory_total, inventory_remaining,
                               image_url, segment, active, sort_order, available_until)
        values (w, r.name, r.descr, 'collectible', jsonb_build_object('collection', 'fright-bits', 'slug', r.slug), 'rare', 1,
                1, 1, '/images/wago/fright-bits/' || r.file, 0, false, 900 + r.n, cutoff)
        returning id into pid;
      insert into collectibles(collection_id, number, slug, name, character, description, rarity, image_url, status, reserve_order, prize_id)
        values (col, r.n, r.slug, r.name, r.chr, r.descr, 'rare', '/images/wago/fright-bits/' || r.file, 'reserve', r.n, pid)
        returning id into kid;
      update wheel_prizes set collectible_id = kid where id = pid;
    end if;
  end loop;
end $$;
