# Task 002: Messaging Gate Enforcement

## Goal

Enforce messaging gate before create/message: requester has profile_completed_at; for direct, users are connected; for group, all participants are connected to requester. Apply requireProfileCompleted from M2.

## Deliverables

- [ ] Before POST /conversations: check profile_completed_at; 403 if null
- [ ] Before create: for direct, verify connected; for group, verify all in participant_ids are connected to requester
- [ ] Before POST messages: verify requester is participant; verify profile_completed_at
- [ ] Clear 403 message for gate failures
- [ ] Wire requireProfileCompleted middleware/hook where needed

## Notes

- Connected = user_connections row with status = accepted
- Group: max 8 participants (enforced in next task)

## Verification

```bash
# Profile incomplete: 403 on create conversation
# Not connected: 403 on create direct conversation
# Connected: 201
```
