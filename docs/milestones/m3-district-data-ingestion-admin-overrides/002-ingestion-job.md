# Task 002: Ingestion Job

## Goal

Build a job/script that parses a district data source, normalizes attributes, inserts `district_ingestion_events`, and merges into `district_effective_attribute_values`.

## Deliverables

- [ ] Ingestion script (e.g. `scripts/ingest-districts.ts`) that reads source (CSV/JSON), normalizes per attribute definitions
- [ ] Insert into `district_ingestion_events` with source metadata
- [ ] Compute/upsert `district_effective_attribute_values` from latest events
- [ ] Handle new districts (create in `districts` if needed)
- [ ] `npm run ingest:districts` or similar

## Notes

- Append-only ingestion; effective values derived from events + overrides
- Consider transaction for atomicity per run

## Verification

```bash
npm run ingest:districts
# Check district_ingestion_events and district_effective_attribute_values populated
```
