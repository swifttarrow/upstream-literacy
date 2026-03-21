# Task 001: Seed Attribute Definitions

## Goal

Seed `district_attribute_definitions` with the MVP set of attributes per db-schema.md: type, enrollment, state, FRL, EL, grade bands.

## Deliverables

- [ ] Seed script or migration that inserts rows into `district_attribute_definitions`
- [ ] Attribute keys/types as defined in schema (e.g. enrollment_bucket, state, frl_pct, el_pct, grade_bands)
- [ ] Idempotent (upsert or skip if exists)
- [ ] `npm run seed:attributes` or similar

## Notes

- See `docs/db-schema.md` for attribute definition structure
- Bucketed/normalized values per PRD

## Verification

```bash
npm run seed:attributes
# Query district_attribute_definitions; expect rows
```
