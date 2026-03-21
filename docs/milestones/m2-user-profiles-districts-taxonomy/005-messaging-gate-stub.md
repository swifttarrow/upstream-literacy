# Task 005: Messaging Gate Stub

## Goal

Add a reusable check and stub response: when a user with `profile_completed_at = NULL` attempts a messaging-related action, return 403 with a clear message.

## Deliverables

- [ ] Utility or middleware: `requireProfileCompleted(req, reply)` — if `req.user.profile_completed_at` is null, reply 403 with body explaining profile must be completed
- [ ] Document where this gate will be applied (Phase 5: create conversation, send message)
- [ ] Optional: `GET /conversations` stub that returns 403 when profile incomplete

## Notes

- Soft gate: browsing discovery allowed; messaging requires district + primary problem (profile_completed_at)
- Response body: e.g. `{ error: "profile_incomplete", message: "Complete your profile to message peers" }`

## Verification

```bash
# User with profile_completed_at = null
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/conversations
# Expect 403 + descriptive body
```
