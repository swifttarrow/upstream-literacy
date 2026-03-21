# Task 002: District Preview Screen

## Goal

Build the district preview UI with source vs normalized cards, missing/warning indicators, and Ingest/Cancel actions per PRD §§10.3, 11.2.

## Deliverables

- [x] Route: `/admin/ingestion/candidates/:id` or `/admin/ingestion/preview/:id`
- [x] Header: district name, state, NCES id, completeness score
- [x] Source data card (read-only)
- [x] Normalized data card
- [x] Missing fields / warnings card
- [x] Source metadata card
- [x] Action bar: Ingest, Cancel (optional: Edit Before Ingest)
- [x] Clear distinction: source-provided vs normalized vs missing vs override

## Notes

- PRD §11.2: sections for source data, normalized data, missing/warnings, source metadata
- Preview loads from GET .../preview API
- Ingest button triggers single-district ingest (wire to m13 task 003)

## Verification

- Moderator opens preview; sees all sections; Ingest triggers ingestion flow; Cancel returns to dashboard
