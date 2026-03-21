# Task 001: Verify User Connections Schema

## Goal

Ensure `user_connections` table is included in migration run and has required columns: user_a_id, user_b_id, status, requested_by_user_id, created_at, resolved_at. Unique on (user_a_id, user_b_id) with user_a < user_b.

## Deliverables

- [ ] Confirm `schema/06b_user_connections.sql` runs after 06 in migration script
- [ ] Verify indexes: user_a_id, user_b_id, status, requested_by_user_id
- [ ] Document schema for connection status enum (pending, accepted)
- [ ] If missing, add any required columns

## Notes

- Schema file: `schema/06b_user_connections.sql`
- CHECK: user_a_id < user_b_id for canonical ordering

## Verification

```bash
npm run migrate
# Query information_schema or \d user_connections; expect correct structure
```
