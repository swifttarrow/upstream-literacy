# Milestone 2: User Profiles, Districts, Taxonomy

## Overview

Implement profile CRUD, district lookup, and problem taxonomy. Enables profile completion (district + primary problem) for soft gating. No discovery or messaging yet.

**Source:** [Implementation Plan](../../../implementation-plan.md#phase-2-user-profiles-districts-taxonomy)

## Dependencies

- [ ] Milestone 1 (Foundation — Project Setup, DB, Auth)

## Changes Required

| Area | Changes |
|------|---------|
| **Users** | `GET/PATCH /users/me` (profile); enforce `profile_completed_at` when district + primary problem set |
| **Districts** | `GET /districts` (list with filters); `GET /districts/:id`; read from `districts` + `district_effective_attribute_values` |
| **Taxonomy** | `GET /problem-categories`, `GET /problem-statements` (by category, status=active); read-only for members |
| **Admin** | `POST/PATCH` taxonomy (category, problem) for `platform_role = admin`; RBAC checks |
| **Validation** | Zod schemas for profile, district filters, taxonomy |

## Success Criteria

### Automated Verification

- [ ] `make test` / `npm test` passes
- [ ] `make lint` passes
- [ ] Profile update with district + primary problem sets `profile_completed_at`
- [ ] District and taxonomy endpoints return expected shapes

### Manual Verification

- [ ] User can complete profile (district, role, bio, primary + secondary problems)
- [ ] Districts display with attributes and source/timestamp
- [ ] Admin can manage problem categories and statements
- [ ] Soft gate: messaging blocked until profile completed (stub 403 response)

## Tasks

- [001-users-me-profile-crud](./001-users-me-profile-crud.md)
- [002-districts-list-and-detail](./002-districts-list-and-detail.md)
- [003-taxonomy-endpoints](./003-taxonomy-endpoints.md)
- [004-admin-taxonomy-crud](./004-admin-taxonomy-crud.md)
- [005-messaging-gate-stub](./005-messaging-gate-stub.md)
