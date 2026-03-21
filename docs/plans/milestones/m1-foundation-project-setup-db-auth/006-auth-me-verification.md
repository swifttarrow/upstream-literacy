# Task 006: Auth Me & Verification

## Goal

Implement `GET /auth/me` and add automated tests (or verification) that the full auth flow works end-to-end.

## Deliverables

- [ ] `GET /auth/me`: returns current user from JWT/subject; exclude `password_hash`; 401 if unauthenticated
- [ ] Integration or API test: register → login → GET /auth/me returns correct user
- [ ] Verify unauthenticated access to protected route returns 401

## Notes

- Response shape: `{ id, email, full_name, ... }` without `password_hash`

## Verification

```bash
# Full flow
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"secret123"}' | jq -r '.token')
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/auth/me
# Expect 200 + user object
```
