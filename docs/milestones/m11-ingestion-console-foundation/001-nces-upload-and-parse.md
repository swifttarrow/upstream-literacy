# Task 001: NCES Dual File Upload and Parse

## Goal

Replace the 100-district seed approach with a dual file upload. Moderators upload both (1) NCES CCD district CSV and (2) EDGE Public LEA Geocode CSV; the system parses both, validates format, joins by LEAID, and creates an ingestion job to process all districts with coordinates from EDGE.

## Deliverables

- [x] Upload endpoint: `POST /admin/ingestion/upload` — accepts multipart/form-data with **two required files**: `ccd_file` and `edge_file`
- [x] Parse CCD district CSV (validate columns: LEAID/NCES id, name, state, enrollment, etc.)
- [x] Parse EDGE geocode CSV (validate columns: LEAID, LAT, LON, LOCALE; extract from ZIP or accept pre-extracted CSV)
- [x] Build LEAID→(LAT, LON, LOCALE) map from EDGE; join when creating district_candidates from CCD rows; derive locale_code, locale_type, locale_subtype, locale_size, district_type from LOCALE
- [x] On valid upload: create ingestion job; enqueue async processing; populate latitude/longitude from EDGE where matched
- [x] On invalid upload: return 400 with parse/validation errors (indicate which file failed)
- [x] Links to download pages: [CCD Data Files](https://nces.ed.gov/ccd/files.asp), [EDGE School Geocodes](https://nces.ed.gov/programs/edge/geographic/schoollocations)

## Notes

- PRD §§10.1, 8: Dual upload (CCD + EDGE); coordinates from EDGE at ingestion
- CCD: LEA directory format; EDGE: Public School District File (extract CSV from ZIP)
- Join key: LEAID (NCES district identifier)
- Idempotency: same NCES id across uploads—overwrite or merge per config
- Large files (thousands of rows) must process async (pg-boss)
- Districts not in EDGE: leave latitude/longitude NULL; optional fallback geocoding script later

## Verification

```bash
# Upload valid CCD + EDGE
curl -X POST -F "ccd_file=@ccd-lea.csv" -F "edge_file=@EDGE_GEOCODE_PUBLICLEA_2425.csv" /api/admin/ingestion/upload
# Expect 202 + job_id; job processes districts async; coordinates populated from EDGE

# Upload with missing file
curl -X POST -F "ccd_file=@ccd-lea.csv" /api/admin/ingestion/upload
# Expect 400 (edge_file required)

# Upload invalid file
curl -X POST -F "ccd_file=@bad.csv" -F "edge_file=@edge.csv" /api/admin/ingestion/upload
# Expect 400 with validation errors
```

## Supersedes

- 001-seed-100-districts-nces-mappings.md (deprecated; no more pre-seeded district list)
