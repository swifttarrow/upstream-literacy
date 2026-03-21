# Task 005: Audit Logging

## Goal

Insert audit_log_entries for each moderation action. Include actor, action, entity, metadata. Queryable for compliance.

## Deliverables

- [ ] On each moderation action: insert into audit_log_entries
- [ ] Fields: actor_id (moderator user_id), action_type, entity_type, entity_id, metadata (JSON: report_id, details)
- [ ] Timestamp (created_at)
- [ ] `GET /moderation/audit-log` (admin only): filter by actor, action, date range; paginated
- [ ] Ensure all actions (dismiss, resolve, warn, suspend, delete_message, close_conversation) are logged

## Notes

- Schema: audit_log_entries per db-schema.md
- Immutable; append-only

## Verification

```bash
# Take moderation action; query audit_log_entries
# GET /moderation/audit-log returns entry
```
