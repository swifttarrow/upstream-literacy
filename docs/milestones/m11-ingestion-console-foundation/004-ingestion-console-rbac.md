# Task 004: Ingestion Console RBAC

## Goal

Enforce role-based access so only moderators and admins can access the ingestion console and related endpoints.

## Deliverables

- [x] Middleware or route guard: require `platform_role IN ('moderator', 'admin')` for `/admin/ingestion/*`
- [x] Reuse or extend existing `requireAdmin` if moderator should also pass (or add `requireModerator`)
- [x] Document permissions: moderator can view, upload NCES data, edit districts; admin has all + configure
- [x] 403 response with clear message for unauthorized roles

## Notes

- PRD §13: Moderator and Admin permissions
- Existing `requireAdmin` may need extension for moderator access to ingestion (admin-only for some actions)

## Verification

- Non-moderator user receives 403 on GET /admin/ingestion/candidates
- Moderator receives 200
