-- One entry per user per collection slot (the Field Guide relies on this to stop double-submits).
-- If this errors with "could not create unique index" there are duplicate slot rows; run:
--   select lower(username), collection_slug, slot_number, count(*) from "FieldGuideEntries"
--   group by 1,2,3 having count(*) > 1;
-- and send me the result.
create unique index if not exists field_guide_entries_slot_uq
  on "FieldGuideEntries" (lower(username), collection_slug, slot_number);
