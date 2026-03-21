-- Problem categories and statements (admin-managed taxonomy)

CREATE TABLE problem_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES problem_categories (id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE problem_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES problem_categories (id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  status taxonomy_status NOT NULL DEFAULT 'active',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_problem_statements_category_status ON problem_statements (category_id, status);
