# Task 003: Messages CRUD & Websocket

## Goal

Implement `POST /conversations/:id/messages` and `GET /conversations/:id/messages` (paginated). Add websocket server: connect with auth, subscribe to conversation channels, broadcast new messages to participants.

## Deliverables

- [ ] `POST /conversations/:id/messages`: body `{ body }`; insert message; verify requester is participant
- [ ] `GET /conversations/:id/messages`: paginated (cursor or offset); exclude soft-deleted
- [ ] Websocket: @fastify/websocket or ws; authenticate connection (JWT in query or first message)
- [ ] Subscribe to room per conversation id; on new message, broadcast to room participants
- [ ] After POST message, emit via websocket to participants
- [ ] Zod for message body

## Notes

- Messages table: body, conversation_id, sender_id, created_at, deleted_at (soft delete)
- Websocket rooms: one per conversation; join on subscribe

## Verification

```bash
# POST message; GET messages returns it
# Two clients: send message from one; other receives via websocket
```
