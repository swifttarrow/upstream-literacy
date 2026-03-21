# Task 001: Participants List API

## Goal

Implement `GET /conversations/:id/participants` to list active participants. Verify requester is a participant.

## Deliverables

- [ ] `GET /conversations/:id/participants`: return participants with left_at IS NULL
- [ ] Include: user id, full_name, professional_role, district summary
- [ ] 403 if requester not a participant
- [ ] 404 if conversation not found

## Notes

- conversation_participants table; filter left_at IS NULL

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/conversations/:id/participants
# Returns list of active participants
```
