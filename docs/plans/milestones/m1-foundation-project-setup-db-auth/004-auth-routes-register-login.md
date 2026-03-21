# Task 004: Auth Routes — Register & Login

## Goal

Implement `POST /auth/register` and `POST /auth/login` with bcrypt password hashing, Zod validation, and user creation/lookup.

## Deliverables

- [ ] `POST /auth/register`: body `{ email, password, full_name }`; validate with Zod; hash password with bcrypt; insert into `users`; return user (exclude `password_hash`)
- [ ] `POST /auth/login`: body `{ email, password }`; validate; find user by email; verify password with bcrypt; return session token (JWT) or set cookie
- [ ] Zod schemas for register and login inputs
- [ ] Handle duplicate email on register (409 Conflict)
- [ ] Handle invalid credentials on login (401)

## Notes

- Schema: `users` has `email` (citext), `password_hash`, `full_name`
- Set `membership_status` (e.g. `pending` or `approved` per product decision)
- Do not return `password_hash` in any response

## Verification

```bash
# Register
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"secret123","full_name":"Test User"}'
# Expect 201 + user object

# Login
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"secret123"}'
# Expect 200 + token or Set-Cookie
```
