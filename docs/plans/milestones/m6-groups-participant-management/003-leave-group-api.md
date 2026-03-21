# Task 003: Leave Group API

## Goal

Implement `DELETE /conversations/:id/participants/me` (or equivalent) to leave a group. Set left_at; do not delete; user no longer receives messages.

## Deliverables

- [ ] `DELETE /conversations/:id/participants/me`: set left_at = now() for requester's participant row
- [ ] Verify requester is participant
- [ ] Only for group conversations (direct: optionally block or handle)
- [ ] Remove user from websocket room for this conversation
- [ ] History preserved; messages remain

## Notes

- Do not delete conversation_participants row
- Websocket: unsubscribe from room on leave

## Verification

```bash
# User leaves; GET participants no longer includes them
# User does not receive new messages for that conversation
```
