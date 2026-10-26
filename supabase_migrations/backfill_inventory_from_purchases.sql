-- Gives every approved Marketplace cosmetic/consumable purchase an "owned" inventory row if it is missing
-- (purchases made while the inventory write was failing). Safe to re-run.
insert into "UserInventory" (username, item_id, owned, equipped, purchased_at)
select distinct on (lower(p.username), p.item_id) lower(p.username), p.item_id, true, false, p.created_at
from "MarketplacePurchases" p
where p.status = 'approved'
  and p.item_id not like 'grove_banner_%'
  and not exists (select 1 from "UserInventory" i where lower(i.username) = lower(p.username) and i.item_id = p.item_id)
order by lower(p.username), p.item_id, p.created_at
on conflict (username, item_id) do nothing;
