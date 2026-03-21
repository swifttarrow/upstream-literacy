# Task 002: District Preview Screen

## Goal

Build the district preview UI with source vs normalized cards, missing/warning indicators, and Ingest/Cancel actions per PRD §§10.3, 11.2.

## Deliverables

- [ ] Route: `/admin/ingestion/candidates/:id` or `/admin/ingestion/preview/:id`
- [ ] Header: district name, state, NCES id, status
- [ ] Source data card (read-only)
- [ ] Normalized data card
- [ ] Missing fields / warnings card
- [ ] Source metadata card
- [ ] Action bar: Ingest, Cancel (optional: Edit Before Ingest)
- [ ] Clear distinction: source-provided vs normalized vs missing vs override

## Notes

- PRD §11.2: sections for source data, normalized data, missing/warnings, source metadata
- Preview loads from GET .../preview API
- Ingest button triggers single-district ingest (wire to m13 task 003)

## Verification

- Moderator opens preview; sees all sections; Ingest triggers ingestion flow; Cancel returns to dashboard
