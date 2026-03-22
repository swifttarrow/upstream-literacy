-- Backfill: mark already-ingested districts without coordinates as ingested_with_warnings
-- so they appear in the Warnings category and match the "167 districts missing coordinates" count

UPDATE district_candidates
SET status = 'ingested_with_warnings',
    missing_data_indicator = true,
    updated_at = now()
WHERE status = 'ingested'
  AND (latitude IS NULL OR longitude IS NULL);
