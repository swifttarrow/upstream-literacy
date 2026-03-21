# Task 002: Moderator Reports Queue

## Goal

Implement `GET /moderation/reports` for moderators to list reports. Filter by status. Require platform_role = moderator or admin.

## Deliverables

- [ ] `GET /moderation/reports`: query params status (open, in_review, resolved, dismissed)
- [ ] Require moderator or admin role; 403 otherwise
- [ ] Return reports with target info, reporter, reason, created_at
- [ ] For conversation/message targets: include IDs; do NOT include message body unless conversation is reported (content visibility rule)
- [ ] Pagination
- [ ] Order by created_at desc by default

## Notes

- PRD: content visibility only for reported conversations
- Metadata (who, when, target) visible for all

## Verification

```bash
# As moderator: GET /moderation/reports
# As member: 403
```
