# Task 008: Moderation Admin UI

## Goal

Build moderator/admin UI: report queue, review report, take action (dismiss, resolve, warn, suspend, delete message, close conversation). Visible only to moderator/admin role.

## Deliverables

- [ ] Moderation route: protected; require moderator or admin role
- [ ] Reports queue: GET /moderation/reports; filter by status
- [ ] Report detail: target info, reporter, reason, details
- [ ] For reported message/conversation: show content (per content visibility rule)
- [ ] Action buttons: dismiss, resolve, warn, suspend, delete message, close conversation
- [ ] POST /moderation/actions with selected action
- [ ] Report content flow: user can report from message/conversation (flag icon, modal with reason)
- [ ] Align with Report Content / Moderation design

## Notes

- Content visibility: moderator sees message body only for reported conversations
- Audit log view optional (GET /moderation/audit-log)

## Verification

- User reports message; moderator sees in queue
- Moderator suspends user; user cannot log in
- Report modal: select reason, submit; report created
