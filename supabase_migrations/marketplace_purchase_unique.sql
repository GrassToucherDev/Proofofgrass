-- Make each on-chain payment usable exactly once (verify-purchase relies on this).
-- If this errors with "could not create unique index", there are duplicate signatures:
-- run  select transaction_signature, count(*) from "MarketplacePurchases" group by 1 having count(*) > 1;
-- and tell me the result.
create unique index if not exists marketplace_purchases_signature_uq
  on "MarketplacePurchases" (transaction_signature);
