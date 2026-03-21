# Task 003: Moderation Actions API

## Goal

Implement `POST /moderation/actions` for moderators to take action on reports: dismiss, resolve, warn, suspend, delete message, close conversation.

## Deliverables

- [ ] `POST /moderation/actions`: body `{ report_id, action: "dismiss"|"resolve"|"warn"|"suspend"|"delete_message"|"close_conversation", ... }`
- [ ] Update report status
- [ ] For suspend: set users.suspended_until
- [ ] For delete_message: soft-delete message
- [ ] For close_conversation: mark or archive as appropriate
- [ ] For warn: optional; log or notify user
- [ ] Require moderator/admin role
- [ ] Zod validation with action-specific payload
- [ ] Return 200 with updated state

## Notes

- Actions may require additional params (e.g. suspend: suspended_until duration)
- Idempotent where sensible

## Verification

```bash
# Moderator: POST moderation/actions with action=suspend
# User record has suspended_until set
```
