# Task 002: Notifications API

## Goal

Implement `GET /notifications` (paginated, filter unread) and `PATCH /notifications/:id/read`. Support unread count.

## Deliverables

- [ ] `GET /notifications`: query params `unread_only`, `limit`, `cursor` (or offset)
- [ ] Return user's notifications; order by created_at desc
- [ ] Include: id, type, payload, read_at, created_at
- [ ] `PATCH /notifications/:id/read`: set read_at = now(); verify notification belongs to user
- [ ] `GET /notifications/unread-count` or include in GET response: count of unread
- [ ] Pagination with cursor or offset

## Notes

- User-scoped: only return notifications for authenticated user

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/notifications
curl -X PATCH -H "Authorization: Bearer $TOKEN" http://localhost:3000/notifications/:id/read
# Unread count decreases
```
