# Task 001: Error Capture and Storage

## Goal

Capture ingestion errors with structured fields and persist them for display and retry per PRD §10.6.

## Deliverables

- [x] Error record schema: district_name, district_id, error_type, message, timestamp, job_id, retry_eligible
- [x] Error types: source_record_not_found, nces_mismatch, validation_failure, duplicate_conflict, required_field_missing, normalization_failure, db_write_failure
- [x] Insert errors during ingestion worker when district processing fails
- [x] Link errors to job and district candidate
- [x] API or query to fetch errors by job_id, district_id

## Notes

- PRD §10.6: error types and fields
- May extend district_ingestion_jobs with error_details JSON or separate ingestion_errors table
- Retry_eligible: true for transient failures (e.g. timeout); false for validation/duplicate

## Verification

- Simulate failure during ingest; query errors; confirm fields populated correctly
