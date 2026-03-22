# Milestone 15: Post-Ingestion Editing and Audit

## Overview

Enable moderators to edit district data after ingestion, maintain audit logs for ingestion operations, and support re-ingestion/refresh per PRD §§10.9–10.11, 11.4. District detail shows missing-data flag and field-level missing indicators (not completeness score). NCES year displayed when applicable (multi-year uploads).

**Source:** [District Data Ingestion PRD](../../prds/district-data-ingestion.md) §§10.9–10.11, 11.4

## Dependencies

- [x] Milestone 14 (Ingestion Errors and Data Quality)

## Changes Required

| Area | Changes |
|------|---------|
| **Post-ingestion edit** | UI to edit normalized fields; preserve source, timestamp, editor, reason; revert override |
| **District detail display** | Show missing-data flag and field-level missing value indicators (not completeness score); NCES year in header when multi-year data exists |
| **Edit API** | PATCH district overrides; validation on save; extend existing admin overrides if applicable |
| **Audit logging** | Log ingestion started/completed, district edited, override applied/reverted |
| **Re-ingestion** | Allow re-run for ingested district; show current vs incoming preview; warn before overwrite; preserve history; respect NCES year context |

## Success Criteria

### Automated Verification
- [x] Edit API updates district_effective_attribute_values with override provenance
- [x] Audit log captures required actions with actor, action, district, timestamp
- [x] Re-ingestion preserves district_ingestion_events history

### Manual Verification
- [x] Moderator can edit ingested district; changes persist with override distinction
- [x] Moderator can revert override to source value
- [x] Audit trail queryable for district operations
- [x] Re-ingestion shows diff preview; confirm overwrites; history preserved

## Tasks

- [001-post-ingestion-edit-api](./001-post-ingestion-edit-api.md)
- [002-district-edit-screen](./002-district-edit-screen.md)
- [003-ingestion-audit-logging](./003-ingestion-audit-logging.md)
- [004-re-ingestion-flow](./004-re-ingestion-flow.md)
