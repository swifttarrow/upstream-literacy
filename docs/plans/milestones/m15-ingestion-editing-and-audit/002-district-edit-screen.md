# Task 002: District Edit Screen

## Goal

Build the district edit UI with source (read-only), editable normalized values, and save/revert controls per PRD §§10.9, 11.4.

## Deliverables

- [ ] Route: `/admin/ingestion/districts/:id/edit` or `/admin/districts/:id/edit`
- [ ] Source values section (read-only)
- [ ] Editable normalized values: district type, enrollment bucket, FRL bucket, EL bucket, grade bands, display name, notes
- [ ] Override reason field (optional)
- [ ] Validation messages on save
- [ ] Save and Revert controls
- [ ] Clear distinction: source-backed vs override (visual indicator)
- [ ] Revert per-field or revert all overrides

## Notes

- PRD §11.4: source (read-only), editable normalized values, override reason, validation, save/revert
- Reuse form patterns from profile or admin taxonomy
- Load district with attributes; PATCH on save; handle validation errors

## Verification

- Moderator edits district; save persists; override shown distinctly; revert restores source; validation errors display
