# Task 003: Admin Overrides API

## Goal

Implement `POST/PATCH /admin/districts/:id/overrides` for admins to override district attribute values. Insert/update `district_admin_overrides` and recompute effective values.

## Deliverables

- [ ] `POST /admin/districts/:id/overrides`: body `{ attribute_definition_id, value }`; insert override; recompute effective
- [ ] `PATCH /admin/districts/:id/overrides/:override_id`: update override; recompute
- [ ] Admin RBAC check
- [ ] Recompute logic: effective value = override if present, else latest from ingestion
- [ ] Zod validation for override body

## Notes

- `district_admin_overrides` stores overrides per district, attribute
- Effective values table must be updated after override changes

## Verification

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"attribute_definition_id":"...","value":"..."}' \
  http://localhost:3000/admin/districts/:id/overrides
# GET /districts/:id should show overridden value
```
