# Task 002: Ingestion Job Model

## Goal

Define and implement the ingestion job model to track batch and single-district ingestion runs, per PRD §15.1–15.2.

## Deliverables

- [x] Migration or schema addition for `district_ingestion_jobs` (or equivalent)
- [x] Fields: id, status (Queued|Running|Completed|CompletedWithWarnings|Failed|PartiallyFailed), created_by, started_at, completed_at, total_count, succeeded_count, warning_count, failed_count
- [x] Record-level status table or JSON for per-district outcomes (Pending|Running|Succeeded|SucceededWithWarnings|Failed)
- [x] API or service to create job, update progress, finalize job

## Notes

- PRD §15.1: job statuses; §15.2: record-level statuses
- Jobs link to districts via job_id on ingestion events or separate job_records table
- Preserve idempotency per PRD §15.3 (NCES id, state+name)

## Verification

- Create job via API; insert record-level outcomes; query job with correct aggregates
