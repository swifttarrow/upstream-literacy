-- Ingestion Console: district candidates, jobs, job records, errors

CREATE TABLE district_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nces_district_id text UNIQUE NOT NULL,
  name text NOT NULL,
  state text NOT NULL,
  district_size text NOT NULL, -- small|medium|large|xl|unknown (enrollment-based)
  status text NOT NULL DEFAULT 'not_ingested', -- not_ingested|ready_to_ingest|in_progress|ingested|ingested_with_warnings|failed
  district_id uuid REFERENCES districts (id) ON DELETE SET NULL, -- populated after ingestion
  missing_data_indicator boolean NOT NULL DEFAULT false,
  last_refresh_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Geocode (from EDGE file)
  latitude numeric(9,6),
  longitude numeric(9,6),
  geocoded_at timestamptz,
  -- NCES CCD
  enrollment int,
  nces_year text,
  -- Locale (from EDGE LOCALE column)
  locale_code text,
  locale_type text,
  locale_subtype text,
  locale_size text
);

CREATE INDEX idx_district_candidates_state ON district_candidates (state);
CREATE INDEX idx_district_candidates_status ON district_candidates (status);
CREATE INDEX idx_district_candidates_nces ON district_candidates (nces_district_id);

CREATE TABLE district_ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'queued', -- queued|running|completed|completed_with_warnings|failed|partially_failed
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  total_count int NOT NULL DEFAULT 0,
  succeeded_count int NOT NULL DEFAULT 0,
  warning_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_jobs_status ON district_ingestion_jobs (status, created_at DESC);
CREATE INDEX idx_ingestion_jobs_created_by ON district_ingestion_jobs (created_by);

CREATE TABLE district_ingestion_job_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES district_ingestion_jobs (id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES district_candidates (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending|running|succeeded|succeeded_with_warnings|failed
  error_type text,
  error_message text,
  retry_eligible boolean NOT NULL DEFAULT false,
  warning_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);

CREATE INDEX idx_ingestion_job_records_job ON district_ingestion_job_records (job_id, status);
CREATE INDEX idx_ingestion_job_records_candidate ON district_ingestion_job_records (candidate_id);

CREATE TABLE district_ingestion_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES district_ingestion_jobs (id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES district_candidates (id) ON DELETE CASCADE,
  district_id uuid REFERENCES districts (id) ON DELETE SET NULL,
  error_type text NOT NULL, -- source_record_not_found|nces_mismatch|validation_failure|duplicate_conflict|required_field_missing|normalization_failure|db_write_failure
  message text NOT NULL,
  retry_eligible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_errors_job ON district_ingestion_errors (job_id, created_at DESC);
CREATE INDEX idx_ingestion_errors_candidate ON district_ingestion_errors (candidate_id);

-- Backfill: mark already-ingested districts without coordinates as ingested_with_warnings
UPDATE district_candidates
SET status = 'ingested_with_warnings',
    missing_data_indicator = true,
    updated_at = now()
WHERE status = 'ingested'
  AND (latitude IS NULL OR longitude IS NULL);
