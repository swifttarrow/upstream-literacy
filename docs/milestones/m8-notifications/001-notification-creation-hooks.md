# Task 001: Notification Creation Hooks

## Goal

Create notifications on new message, connection request, and connection accepted. Insert into `notifications` table. No admin approval flow—membership_status is approved on registration, so no membership_status change notification is needed.

## Deliverables

- [x] On new message: create notification for each other participant (type: new_message), include conversation_id, sender_id, message preview
- [x] On connection request: create notification for target user (type: connection_request), include requester_id
- [x] On connection accepted: create notification for requester (type: connection_accepted), include acceptor_id
- [ ] Helper or service: createNotification(userId, type, payload)
- [ ] Ensure idempotent where appropriate (e.g. don't duplicate for same event)

## Notes

- Schema: notifications has user_id, type, payload (JSONB), read_at
- Wire into existing flows (message send, connection accept, etc.)

## Verification

```bash
# Send message; query notifications for recipient
# Accept connection; query notifications for requester
```
