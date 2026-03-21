-- Districts (core identity, geography)

CREATE TABLE districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  country_code char(2),
  state_region text,
  city text,
  external_ref text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_districts_state_region ON districts (state_region);
CREATE INDEX idx_districts_country_state ON districts (country_code, state_region);
