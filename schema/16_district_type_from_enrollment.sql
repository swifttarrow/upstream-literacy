-- Recalculate district_size from enrollment (was previously district_type from locale)
-- small: <2,500; medium: 2,500-10,000; large: 10,000-25,000; xl: 25,000+; unknown: no enrollment
-- Run before 17_rename_district_type_to_district_size.sql

UPDATE district_candidates
SET district_type = CASE
  WHEN enrollment IS NULL OR enrollment < 0 THEN 'unknown'
  WHEN enrollment < 2500 THEN 'small'
  WHEN enrollment < 10000 THEN 'medium'
  WHEN enrollment < 25000 THEN 'large'
  ELSE 'xl'
END;
