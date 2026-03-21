# Task 005: Session Middleware & Protected Routes

## Goal

Add JWT (or cookie) verification middleware and protect routes that require authentication. Ensure unauthenticated requests to protected routes return 401.

## Deliverables

- [ ] Auth middleware: verify JWT from `Authorization: Bearer <token>` or cookie; attach `user` or `userId` to request
- [ ] On invalid/missing token: return 401
- [ ] Optionally: `onRequest` or `preHandler` hook for Fastify
- [ ] At least one protected route (e.g. `GET /auth/me`) that uses this middleware

## Notes

- Use `jsonwebtoken` or Fastify JWT plugin
- Include `userId` (and optionally `email`, `platform_role`) in JWT payload
- Set appropriate expiry (e.g. 7d)

## Verification

```bash
# No token
curl http://localhost:3000/auth/me
# Expect 401

# Valid token
curl -H "Authorization: Bearer <token>" http://localhost:3000/auth/me
# Expect 200 + user
```
