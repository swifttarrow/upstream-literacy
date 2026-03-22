# Task 005: Group Creation Validation

## Goal

Enforce max 8 participants on group creation. App-layer check before insert; DB trigger as backup. Reject when non-connected user in participant list.

## Deliverables

- [ ] Before creating group: validate participant_ids length <= 8
- [ ] Validate all participant_ids are connected to requester
- [ ] Confirm DB trigger exists in schema/11_triggers.sql for max 8 active participants
- [ ] Return 400 with clear message when validation fails
- [ ] Zod: max 8 items in participant_ids array

## Notes

- Schema trigger: check count of active (left_at IS NULL) participants
- Connected check already in gate enforcement

## Verification

```bash
# 9 participants: 400
# Non-connected user in list: 403
# 8 connected: 201
```
