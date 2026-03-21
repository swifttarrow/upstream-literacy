# Task 001: Post-Ingestion Edit API

## Goal

Extend or implement API for moderators to edit district data after ingestion, with override provenance per PRD §§10.9, 15.4.

## Deliverables

- [ ] `PATCH /admin/districts/:id` or `POST /admin/districts/:id/overrides` (may extend m3 admin overrides)
- [ ] Editable fields: district_type_normalized, enrollment_bucket, frl_bucket, el_bucket, grade_bands, display_name, notes
- [ ] Preserve: original source values, edit timestamp, editor identity, reason (optional)
- [ ] Validation on save; return validation errors
- [ ] Revert endpoint: remove override for field, restore to source-backed value
- [ ] Auth: moderator/admin only

## Notes

- PRD §10.9: editable fields; preserve source, timestamp, editor, reason
- Existing `POST /admin/districts/:id/overrides` in m3; may need to align field set and add revert
- district_admin_overrides + district_effective_attribute_values per schema

## Verification

- PATCH updates effective values with provenance=override; GET district shows override; revert restores source value
