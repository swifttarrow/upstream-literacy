-- User primary + secondary problem selections

CREATE TABLE user_problem_selections (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  problem_statement_id uuid NOT NULL REFERENCES problem_statements (id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_statement_id)
);

CREATE UNIQUE INDEX ux_user_problem_one_primary
  ON user_problem_selections (user_id)
  WHERE is_primary;

CREATE INDEX idx_user_problem_selections_problem ON user_problem_selections (problem_statement_id);
