# Task 001: Auth Pages

## Goal

Build login and register pages. Handle session (JWT in cookie or storage). Redirect when authenticated.

## Deliverables

- [ ] Login page: email, password; call POST /auth/login; store token; redirect to app
- [ ] Register page: email, password, full_name; call POST /auth/register; then login or redirect
- [ ] Session: store JWT; include in Authorization header for API calls
- [ ] Protected route wrapper: redirect to login if unauthenticated
- [ ] Logout: clear token; redirect to login
- [ ] Error states: invalid credentials, duplicate email
- [ ] Align with designs in upstream-literacy-designs.pen

## Notes

- Next.js App Router
- Consider httpOnly cookie for token (more secure)

## Verification

- Register, login, navigate; refresh preserves session
- Logout; protected routes redirect to login
