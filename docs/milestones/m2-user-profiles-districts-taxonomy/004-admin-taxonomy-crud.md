# Task 004: Admin Taxonomy CRUD

## Goal

Implement admin-only `POST/PATCH` for problem categories and problem statements. Enforce RBAC: `platform_role = admin`.

## Deliverables

- [ ] `POST /admin/problem-categories`, `PATCH /admin/problem-categories/:id`
- [ ] `POST /admin/problem-statements`, `PATCH /admin/problem-statements/:id`
- [ ] Admin middleware: require `platform_role = 'admin'`; return 403 otherwise
- [ ] Zod schemas for create/update bodies

## Notes

- Apply admin check after auth middleware
- Ensure `problem_statements` links to valid `problem_categories`

## Verification

```bash
# As admin
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Literacy","sort_order":1}' http://localhost:3000/admin/problem-categories

# As member — expect 403
curl -X POST -H "Authorization: Bearer $MEMBER_TOKEN" ... 
# Expect 403
```
