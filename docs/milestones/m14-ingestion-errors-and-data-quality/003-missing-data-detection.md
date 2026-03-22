# Task 003: Missing Data Detection

## Goal

Detect and flag missing or incomplete data at field, record, and job level per PRD §§10.7, 12.

## Deliverables

- [x] Data quality rules: required for ingestion, required for matching readiness, optional but recommended (per PRD §12)
- [x] Classification: Ready, Warning, Blocked
- [x] Warning states: MissingOptionalData, MissingRequiredMatchingData, DerivedValueUsed, SourceMetadataIncomplete
- [x] Flag missing fields during preview and ingestion (district_size, enrollment, FRL, EL, grade_bands, source_timestamp)
- [x] Configurable rules for hard-stop vs warning-only (admin config or code)
- [x] Surface in preview UI, job summary, candidate list missing indicator

## Notes

- PRD §10.7: field/record/job level; notify when incomplete, cannot ingest, or completed with warnings
- PRD §12: required vs recommended fields; Ready/Warning/Blocked outcomes

## Verification

- District with missing FRL shows Warning; district missing name shows Blocked; preview and job reflect status
