# Task 001: Notification Creation Hooks

## Goal

Create notifications on new message, connection request, connection accepted, membership_status change. Insert into `notifications` table.

## Deliverables

- [ ] On new message: create notification for each other participant (type: new_message), include conversation_id, sender_id, message preview
- [ ] On connection request: create notification for target user (type: connection_request), include requester_id
- [ ] On connection accepted: create notification for requester (type: connection_accepted), include acceptor_id
- [ ] On membership_status change: create notification (type: membership_status), include details
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
