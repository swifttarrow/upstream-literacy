-- Add locale fields from EDGE geocode file (LOCALE column)
-- locale_code = raw NCES locale code (11-43)
-- locale_type = City, Suburb, Town, Rural
-- locale_subtype = Large, Midsize, Small (city/suburb) or Fringe, Distant, Remote (town/rural)
-- locale_size = Large, Medium, Small (inferred from subtype for city/suburb), or null for town/rural

ALTER TABLE district_candidates ADD COLUMN IF NOT EXISTS locale_code text;
ALTER TABLE district_candidates ADD COLUMN IF NOT EXISTS locale_type text;
ALTER TABLE district_candidates ADD COLUMN IF NOT EXISTS locale_subtype text;
ALTER TABLE district_candidates ADD COLUMN IF NOT EXISTS locale_size text;
