-- Triggers: updated_at on mutable tables, group max 8 participants

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_districts_updated_at
  BEFORE UPDATE ON districts
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER tr_problem_statements_updated_at
  BEFORE UPDATE ON problem_statements
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER tr_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER tr_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE OR REPLACE FUNCTION enforce_group_max_eight_participants()
RETURNS TRIGGER AS $$
DECLARE
  active_count int;
  ctype conversation_type;
  adding_active boolean := false;
BEGIN
  SELECT c.type INTO ctype FROM conversations c WHERE c.id = NEW.conversation_id;
  IF ctype IS DISTINCT FROM 'group' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    adding_active := (NEW.left_at IS NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    adding_active := (OLD.left_at IS NOT NULL AND NEW.left_at IS NULL);
  ELSE
    RETURN NEW;
  END IF;

  IF NOT adding_active THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.left_at IS NULL;

  IF active_count >= 8 THEN
    RAISE EXCEPTION 'group conversations allow at most 8 active participants';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_conversation_participants_group_max
  BEFORE INSERT OR UPDATE ON conversation_participants
  FOR EACH ROW EXECUTE PROCEDURE enforce_group_max_eight_participants();
