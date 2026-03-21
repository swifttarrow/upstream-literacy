# Task 002: District Candidate Table

## Goal

Display the district candidate list as a table with required columns and row-level actions per PRD §10.2.

## Deliverables

- [x] Table columns: district name, state, NCES identifier, ingestion status, missing data indicator, last source refresh
- [x] Status badges: Not Ingested, Ready to Ingest, In Progress, Ingested, Ingested with Warnings, Failed
- [x] Row click or action to open district preview
- [x] Pagination
- [x] Empty state when no results

## Notes

- PRD §10.2: each row shows name, state, NCES id, status, missing indicator
- Data from GET /admin/ingestion/candidates
- Use existing table/card patterns from discover or admin reports

## Verification

- Table renders 100 candidates (or filtered subset); status and missing indicators display correctly; click navigates to preview
