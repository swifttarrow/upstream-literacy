# Task 002: Invite Participants API

## Goal

Implement `POST /conversations/:id/participants` to add connected users to a group. Enforce: invite only connected users; 8-participant cap.

## Deliverables

- [ ] `POST /conversations/:id/participants`: body `{ user_ids: [...] }`
- [ ] Verify conversation is group type
- [ ] Verify requester is participant
- [ ] For each user_id: must be connected to requester
- [ ] Count existing active participants + new; reject if total > 8
- [ ] Insert conversation_participants for new users
- [ ] Return updated participant list
- [ ] Zod validation

## Notes

- Skip users already in conversation
- DB trigger backs up 8-participant limit

## Verification

```bash
# Add 2 connected users to group of 6: success
# Add 3 when 7 exist: 400
# Add non-connected user: 403
```
