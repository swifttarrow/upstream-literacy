# Task 004: Shared Problem Metadata

## Goal

Add optional `shared_problem_statement_id` to group conversations for contextual prompts in compose UX. Expose in API for messaging UI.

## Deliverables

- [ ] Add shared_problem_statement_id to conversation metadata (column or JSON if needed; check schema)
- [ ] PATCH /conversations/:id: allow setting shared_problem_statement_id (participants only)
- [ ] GET conversation detail includes shared_problem_statement_id when set
- [ ] Optional: derive from participant problem selections when creating group
- [ ] Document for frontend: use in "Shared problem: X" banner

## Notes

- PRD: contextual prompts (shared problem) in messaging
- Schema may need column; check docs/db-schema.md

## Verification

```bash
# Create group; set shared problem; GET returns it
# Frontend can show "Shared problem: Reading proficiency" banner
```
