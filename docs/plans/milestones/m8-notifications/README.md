# Milestone 8: Notifications

## Overview

Notify users of new messages and status updates (e.g. membership approved). Store in `notifications`; deliver via websocket or polling; mark read.

**Source:** [Implementation Plan](../../../implementation-plan.md#phase-8-notifications)

## Dependencies

- [x] Milestone 5 (Conversations & Real-Time Messaging)
- [x] Milestone 4 (Connections)

## Changes Required

| Area | Changes |
|------|---------|
| **Create** | On new message: notification for other participants (type new_message) |
| **Create** | On connection request: notification for target (type connection_request) |
| **Create** | On connection accepted: notification for requester (type connection_accepted) |
| **Create** | On membership_status change: notification (type membership_status) |
| **API** | GET /notifications (paginated, filter unread); PATCH /notifications/:id/read |
| **Delivery** | Push via websocket when connected; else poll or next fetch |
| **Background** | Optional job to batch-create notifications for offline users |

## Success Criteria

### Automated Verification

- [x] New message creates notification for recipients
- [x] Connection request/accepted create notifications
- [x] Mark read updates read_at
- [x] Unread count accurate

### Manual Verification

- [x] User receives notification when message arrives
- [x] User sees unread count and can mark read
- [x] Notifications appear in real time when connected

## Tasks

- [001-notification-creation-hooks](./001-notification-creation-hooks.md)
- [002-notifications-api](./002-notifications-api.md)
- [003-websocket-push](./003-websocket-push.md)
- [004-background-batch-optional](./004-background-batch-optional.md)
