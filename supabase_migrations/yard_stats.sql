-- THE YARD: landing-page numbers that come only from real data. Safe to re-run.
--   groves_competing = Groves in an active Grove challenge or entered in a live Grove event
--   participants     = people currently competing (active 1v1, active Grove challenge rosters, live event entries)
--   proofs_week      = proofs posted in the last 7 days by those participants
create or replace function yard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare groves uuid[]; people text[]; n_proofs int;
begin
  select array_agg(distinct g) into groves from (
    select challenger_grove as g from grove_challenges where status = 'active' and ends_at > now()
    union select challenged_grove from grove_challenges where status = 'active' and ends_at > now()
    union select e.grove_id from yard_event_entries e join yard_events v on v.id = e.event_id
          where e.grove_id is not null and v.status = 'published' and v.starts_at <= now() and v.ends_at >= now()
  ) s where g is not null;

  select array_agg(distinct p) into people from (
    select lower(challenger) as p from "Challenges" where status = 'active' and ends_at > now()
    union select lower(challenged) from "Challenges" where status = 'active' and ends_at > now()
    union select unnest(roster_challenger) from grove_challenges where status = 'active' and ends_at > now()
    union select unnest(roster_challenged) from grove_challenges where status = 'active' and ends_at > now()
    union select lower(e.username) from yard_event_entries e join yard_events v on v.id = e.event_id
          where e.grove_id is null and v.status = 'published' and v.starts_at <= now() and v.ends_at >= now()
    union select unnest(e.roster) from yard_event_entries e join yard_events v on v.id = e.event_id
          where e.grove_id is not null and v.status = 'published' and v.starts_at <= now() and v.ends_at >= now()
  ) s where p is not null;

  select count(*) into n_proofs from "Submissions" x
   where x.created_at >= now() - interval '7 days' and x.status in ('pending','approved')
     and lower(x.username) = any (coalesce(people, '{}'::text[]));

  return jsonb_build_object('groves_competing', coalesce(cardinality(groves), 0),
                            'participants', coalesce(cardinality(people), 0),
                            'proofs_week', n_proofs);
end $$;

revoke all on function yard_stats() from public, anon, authenticated;
grant execute on function yard_stats() to service_role;
