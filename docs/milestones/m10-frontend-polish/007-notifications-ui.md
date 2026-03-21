# Task 007: Notifications UI

## Goal

Build notifications: bell icon with unread count, dropdown or page with list, mark read. Real-time updates when connected.

## Deliverables

- [ ] Bell icon in nav; badge with unread count (GET /notifications/unread-count or from list)
- [ ] Notifications list: GET /notifications; display by type (connection request, accepted, new message, group invite)
- [ ] Mark read: PATCH /notifications/:id/read
- [ ] Mark all read action
- [ ] Click notification: navigate to relevant page (e.g. connections for request, conversation for message)
- [ ] Websocket: receive new notification; update badge and list
- [ ] Align with Notifications design

## Notes

- Type-specific icons and copy per design
- Load more for pagination

## Verification

- Receive connection request; bell shows 1; open; mark read; badge updates
- New message; notification appears in list when connected
