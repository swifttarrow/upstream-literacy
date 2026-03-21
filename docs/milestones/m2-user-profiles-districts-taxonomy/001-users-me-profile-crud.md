# Task 001: Users Me — Profile CRUD

## Goal

Implement `GET /users/me` and `PATCH /users/me` for profile read/update, and set `profile_completed_at` when district + primary problem are both set.

## Deliverables

- [ ] `GET /users/me`: return full profile (district, professional_role, bio, problem selections) for authenticated user
- [ ] `PATCH /users/me`: accept `{ full_name?, professional_role?, bio?, district_id?, primary_problem_id?, secondary_problem_ids? }`; validate with Zod
- [ ] On update: if `district_id` and primary problem (in `user_problem_selections` with `is_primary = true`) are set, set `users.profile_completed_at = now()`
- [ ] Zod schemas for patch body

## Notes

- `user_problem_selections` links user to problem_statements; one row with `is_primary = true`, others with `is_primary = false`
- FK: `district_id` → districts(id)

## Verification

```bash
# Update profile with district + primary problem
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"district_id":"...","primary_problem_id":"..."}' http://localhost:3000/users/me
# GET /users/me should show profile_completed_at set
```
