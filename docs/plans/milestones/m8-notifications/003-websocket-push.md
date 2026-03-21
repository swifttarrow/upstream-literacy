# Task 003: Websocket Push

## Goal

Push notifications via websocket when user is connected. Subscribe user to personal notification channel; emit new notification on create.

## Deliverables

- [ ] On websocket connect: subscribe user to channel (e.g. `user:${userId}:notifications`)
- [ ] When creating notification: if user has active ws connection, emit notification to their channel
- [ ] Payload: notification object (id, type, payload, created_at)
- [ ] Frontend can listen and update UI in real time
- [ ] When no ws: user polls or gets on next GET /notifications

## Notes

- Reuse existing websocket infra from M5
- Single-instance: in-memory room; multi-instance would need Redis adapter later

## Verification

```bash
# Two clients: User A sends message to User B
# User B (ws connected) receives notification event immediately
```
