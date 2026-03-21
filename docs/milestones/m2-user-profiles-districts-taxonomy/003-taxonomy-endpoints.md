# Task 003: Taxonomy Endpoints

## Goal

Implement read-only `GET /problem-categories` and `GET /problem-statements` for members to browse the problem taxonomy.

## Deliverables

- [ ] `GET /problem-categories`: return all categories (id, name, sort_order, etc.)
- [ ] `GET /problem-statements`: query params `category_id`, `status=active`; return problem statements for matching category
- [ ] Zod schemas for query params
- [ ] Only return active problem statements to members

## Notes

- Tables: `problem_categories`, `problem_statements`
- `problem_statements` has `category_id`, `status` (active/inactive)

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/problem-categories
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/problem-statements?category_id=...&status=active"
```
