# Task 005: Indexes & Performance

## Goal

Ensure indexes exist for matching and connections queries. Validate query latency < 2s under test load.

## Deliverables

- [ ] Index on `user_problem_selections(problem_statement_id)` if not present
- [ ] Index on `user_connections(user_a_id, user_b_id)` — verify in schema
- [ ] Index on `user_connections(status)` for pending lookups
- [ ] Add indexes for district/geography filters if needed
- [ ] Performance test or benchmark: matching query < 2s with representative data volume
- [ ] Document any query optimizations

## Notes

- NFR: match results < 2s
- Use EXPLAIN ANALYZE to verify query plans

## Verification

```bash
# With 100+ users, run discovery/matches; measure latency
# Target: p95 < 2000ms
```
