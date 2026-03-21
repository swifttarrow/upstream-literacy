# Milestone 7: Moderation — Reports, Review, Suspension

## Overview

Implement reporting and moderator workflows: report user/message/conversation; review; dismiss, resolve, warn, suspend. Audit logging for actions.

**Source:** [Implementation Plan](../../../implementation-plan.md#phase-7-moderation--reports-review-suspension)

## Dependencies

- [x] Milestone 5 (Conversations & Real-Time Messaging)

## Changes Required

| Area | Changes |
|------|---------|
| **Reports** | POST /reports (target_type + target IDs, reason_code, details); auth required |
| **Moderator** | GET /reports (filter by status); POST /moderation/actions (dismiss, resolve, warn, suspend, delete message, close conversation) |
| **Suspension** | Set users.suspended_until; block login and messaging for suspended users |
| **Audit** | Insert audit_log_entries for moderation actions |
| **Content visibility** | Moderator reads messages.body only for reported conversations |

## Success Criteria

### Automated Verification

- [x] Report creates row in reports with correct target_type/target_id
- [x] Moderation action updates report, user, or message as expected
- [x] Suspended user cannot log in or send messages
- [x] Audit log entries created for each action

### Manual Verification

- [x] User can report content
- [x] Moderator can review and take action
- [x] Suspended user sees appropriate messaging
- [x] Audit trail queryable for compliance

## Tasks

- [001-reports-api](./001-reports-api.md)
- [002-moderator-reports-queue](./002-moderator-reports-queue.md)
- [003-moderation-actions-api](./003-moderation-actions-api.md)
- [004-suspension-login-messaging-block](./004-suspension-login-messaging-block.md)
- [005-audit-logging](./005-audit-logging.md)
