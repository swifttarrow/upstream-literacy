# Task 004: Connections CRUD API

## Goal

Implement connection request flow: send request, accept, reject. List connections (connected, pending sent, pending received).

## Deliverables

- [ ] `POST /connections/requests`: body `{ target_user_id }`; create pending user_connection; return 201
- [ ] `POST /connections/requests/:id/accept`: requester's ID from connection; set status = accepted, resolved_at = now()
- [ ] `POST /connections/requests/:id/reject`: set status (or remove); resolved_at
- [ ] `GET /connections`: query param `tab` = connected | pending_sent | pending_received; return list
- [ ] Validation: cannot send to self; cannot duplicate request; cannot request if already connected
- [ ] Zod schemas

## Notes

- Use (user_a_id, user_b_id) with user_a < user_b for lookups
- requested_by_user_id identifies who sent the request
- Accept/reject: only target user can accept/reject

## Verification

```bash
# User A sends request to User B
# User B: GET /connections?tab=pending_received — sees request
# User B: POST /connections/requests/:id/accept
# Both: GET /connections?tab=connected — see each other
```
