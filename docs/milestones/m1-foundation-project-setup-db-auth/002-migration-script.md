# Task 002: Migration Script

## Goal

Create a script that runs `schema/*.sql` files in order against a Postgres database, with idempotent behavior where safe.

## Deliverables

- [ ] Migration runner (e.g. `scripts/migrate.ts` or `scripts/migrate.js`) that executes `schema/01_extensions_enums.sql` through `schema/12_ingestion_console.sql`
- [ ] Include `schema/07_user_connections.sql` after `06_user_problem_selections.sql` (per db-schema.md)
- [ ] Script reads `DATABASE_URL` from env
- [ ] Idempotent where safe (e.g. `CREATE TABLE IF NOT EXISTS` or skip-if-exists logic for extensions)
- [ ] `npm run migrate` or equivalent script in package.json

## Notes

- Schema files: `01_extensions_enums.sql` → `12_ingestion_console.sql` (see `schema/` directory)
- Must run in order; schema has dependencies
- Consider transaction wrapping; some statements (e.g. `CREATE TYPE`) may not be transactional

## Verification

```bash
# With fresh Postgres
npm run migrate
# Run again; should not fail (idempotent)
npm run migrate
```
