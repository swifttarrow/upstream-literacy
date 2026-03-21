-- District ingestion, definitions, overrides, and effective values

CREATE TABLE district_attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  value_type text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE district_ingestion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES districts (id) ON DELETE CASCADE,
  source_label text NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  normalized_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payload jsonb
);

CREATE INDEX idx_district_ingestion_district_time
  ON district_ingestion_events (district_id, ingested_at DESC);

CREATE TABLE district_admin_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES districts (id) ON DELETE CASCADE,
  definition_id uuid NOT NULL REFERENCES district_attribute_definitions (id) ON DELETE RESTRICT,
  value_text text,
  value_number numeric,
  value_json jsonb,
  admin_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_district_overrides_district ON district_admin_overrides (district_id);

CREATE TABLE district_effective_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES districts (id) ON DELETE CASCADE,
  definition_id uuid NOT NULL REFERENCES district_attribute_definitions (id) ON DELETE RESTRICT,
  value_text text,
  value_number numeric,
  value_json jsonb,
  provenance district_value_provenance NOT NULL,
  last_ingestion_event_id uuid REFERENCES district_ingestion_events (id) ON DELETE SET NULL,
  last_override_id uuid REFERENCES district_admin_overrides (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (district_id, definition_id)
);

CREATE INDEX idx_district_effective_definition ON district_effective_attribute_values (definition_id);
