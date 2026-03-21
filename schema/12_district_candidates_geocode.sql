-- M16: Add geocode columns to district_candidates for map visualization

ALTER TABLE district_candidates
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;
