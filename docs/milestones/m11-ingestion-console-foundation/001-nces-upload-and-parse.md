# Task 001: NCES Upload and Parse

## Goal

Replace the 100-district seed approach with an NCES CCD file upload. Moderators upload the latest NCES district CSV; the system parses it, validates format, and creates an ingestion job to process all districts automatically.

## Deliverables

- [ ] Upload endpoint: `POST /admin/ingestion/upload` — accepts multipart/form-data CSV file
- [ ] Parse CCD district CSV format (validate columns, handle encoding)
- [ ] On valid upload: create ingestion job; enqueue async processing of all rows
- [ ] On invalid upload: return 400 with parse/validation errors
- [ ] Link or docs for where to download latest CCD from nces.ed.gov

## Notes

- PRD §§10.1, 8: NCES CCD format; upload triggers auto-ingest
- CCD files vary (directory vs universe); support at least one standard format
- Idempotency: same NCES id across uploads—overwrite or merge per config
- Large files (thousands of rows) must process async (pg-boss)

## Verification

```bash
# Upload valid CCD CSV
curl -X POST -F "file=@ccd-districts.csv" /api/admin/ingestion/upload
# Expect 202 + job_id; job processes districts async

# Upload invalid file
curl -X POST -F "file=@bad.csv" /api/admin/ingestion/upload
# Expect 400 with validation errors
```

## Supersedes

- 001-seed-100-districts-nces-mappings.md (deprecated; no more pre-seeded district list)
