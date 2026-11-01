-- Crashberry is a red chart candlestick, not a juice box. Fixes the character label only (name and description are unchanged).
-- Safe to run before or after the seed, and to re-run.
update public.collectibles set character = 'Candlestick Vampire' where slug = 'crashberry';
