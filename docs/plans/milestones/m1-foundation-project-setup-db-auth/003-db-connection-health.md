# Task 003: DB Connection & Health Check

## Goal

Create a database connection module and a health-check endpoint or utility for verifying DB connectivity.

## Deliverables

- [ ] DB connection module (e.g. `src/db/index.ts`) using `pg` or Drizzle
- [ ] Connection pool configuration from `DATABASE_URL`
- [ ] Health check: `GET /health` or internal `checkDb()` that queries DB (e.g. `SELECT 1`)
- [ ] Graceful handling when DB unavailable (log, return 503 or similar)

## Notes

- Use `pg.Pool` or Drizzle's connection handling
- Health route can be unauthenticated for load balancer / infra checks

## Verification

```bash
# With DB running
curl http://localhost:3000/health
# Expect 200 with DB ok

# With DB down
# Expect 503 or non-200
```
