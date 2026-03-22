-- M11/M13: Add enrollment and nces_year to district_candidates for CCD upload
-- enrollment from NCES CCD MEMBER column, nces_year from upload context (e.g. 2023-24)

ALTER TABLE district_candidates ADD COLUMN IF NOT EXISTS enrollment int;
ALTER TABLE district_candidates ADD COLUMN IF NOT EXISTS nces_year text;
