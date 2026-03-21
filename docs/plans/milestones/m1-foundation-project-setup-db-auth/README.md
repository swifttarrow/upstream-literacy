# Milestone 1: Foundation — Project Setup, DB, Auth

## Overview

Bootstrap the monolith: project structure, database migrations, connection pool, and authentication (registration, login, sessions). No domain logic beyond identity.

**Source:** [Implementation Plan](../../../implementation-plan.md#phase-1-foundation--project-setup-db-auth)

## Dependencies

- [x] None (first milestone)

## Changes Required

| Area | Changes |
|------|---------|
| **Root** | `package.json`, `tsconfig.json`, `.env.example`, Makefile or npm scripts |
| **Migrations** | Script to run `schema/*.sql` in order against Postgres; idempotent where safe |
| **DB** | Connection module (e.g. `pg` or `drizzle`); health check |
| **Auth** | Registration (email + password), login, session (JWT or cookie); bcrypt for `password_hash` |
| **API** | Minimal routes: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`; middleware for protected routes |
| **Validation** | Zod schemas for auth inputs |

## Success Criteria

### Automated Verification

- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] Migration script runs without error on fresh DB
- [x] `POST /auth/register` + `POST /auth/login` → valid session; `GET /auth/me` returns user (no password_hash)
- [x] Unauthenticated access to protected route returns 401

### Manual Verification

- [x] User can register and log in via API
- [x] Session persists and validates correctly
- [x] Invalid credentials return 4xx

## Tasks

- [001-project-scaffold](./001-project-scaffold.md)
- [002-migration-script](./002-migration-script.md)
- [003-db-connection-health](./003-db-connection-health.md)
- [004-auth-routes-register-login](./004-auth-routes-register-login.md)
- [005-session-middleware-protected-routes](./005-session-middleware-protected-routes.md)
- [006-auth-me-verification](./006-auth-me-verification.md)
