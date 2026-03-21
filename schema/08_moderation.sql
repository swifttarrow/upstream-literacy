-- Reports and moderation actions

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  target_type report_target_type NOT NULL,
  target_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  target_message_id uuid REFERENCES messages (id) ON DELETE SET NULL,
  target_conversation_id uuid REFERENCES conversations (id) ON DELETE SET NULL,
  reason_code text NOT NULL,
  details text,
  status report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT reports_target_user CHECK (
    target_type <> 'user'
    OR (target_user_id IS NOT NULL AND target_message_id IS NULL AND target_conversation_id IS NULL)
  ),
  CONSTRAINT reports_target_message CHECK (
    target_type <> 'message'
    OR (target_message_id IS NOT NULL AND target_user_id IS NULL AND target_conversation_id IS NULL)
  ),
  CONSTRAINT reports_target_conversation CHECK (
    target_type <> 'conversation'
    OR (target_conversation_id IS NOT NULL AND target_user_id IS NULL AND target_message_id IS NULL)
  ),
  CONSTRAINT reports_target_present CHECK (
    (target_type = 'user' AND target_user_id IS NOT NULL)
    OR (target_type = 'message' AND target_message_id IS NOT NULL)
    OR (target_type = 'conversation' AND target_conversation_id IS NOT NULL)
  )
);

CREATE INDEX idx_reports_status_created ON reports (status, created_at DESC);

CREATE TABLE moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES reports (id) ON DELETE SET NULL,
  moderator_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  action_type moderation_action_type NOT NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_moderation_actions_report ON moderation_actions (report_id);
