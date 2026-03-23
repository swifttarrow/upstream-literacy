# Task 002: District Edit Screen

## Goal

Build the district edit UI with source (read-only), editable normalized values, missing-data indicators, and save/revert controls per PRD §§10.4, 10.9, 11.2, 11.4.

## Deliverables

- [x] Route: `/admin/ingestion/districts/:id/edit` or `/admin/districts/:id/edit`
- [x] Header: district name, state, NCES id, NCES year (when multi-year data), missing data indicator (if applicable)
- [x] Source values section (read-only)
- [x] Editable normalized values: district type, enrollment bucket, grade bands, display name, notes
- [x] Missing fields section: field-level missing value indicators for districts with missing data
- [x] Override reason field (optional)
- [x] Validation messages on save
- [x] Save and Revert controls
- [x] Clear distinction: source-backed vs override (visual indicator)
- [x] Revert per-field or revert all overrides

## Notes

- PRD §11.2, §11.4: header with NCES year and missing data indicator; source (read-only), editable normalized values, missing fields, override reason, validation, save/revert
- Do not display completeness score; use missing-data flag and field-level indicators instead
- Reuse form patterns from profile or admin taxonomy
- Load district with attributes; PATCH on save; handle validation errors

## Verification

- Moderator edits district; save persists; override shown distinctly; revert restores source; validation errors display
