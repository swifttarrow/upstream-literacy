-- User connections (LinkedIn-style: request to connect, accept, then can message)

CREATE TABLE user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  requested_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT chk_user_connection_order CHECK (user_a_id < user_b_id),
  CONSTRAINT chk_requester_is_participant CHECK (
    requested_by_user_id = user_a_id OR requested_by_user_id = user_b_id
  ),
  UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX idx_user_connections_user_a ON user_connections (user_a_id);
CREATE INDEX idx_user_connections_user_b ON user_connections (user_b_id);
CREATE INDEX idx_user_connections_status ON user_connections (status);
CREATE INDEX idx_user_connections_requested_by ON user_connections (requested_by_user_id);
