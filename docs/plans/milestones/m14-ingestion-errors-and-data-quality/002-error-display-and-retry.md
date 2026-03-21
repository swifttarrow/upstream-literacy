# Task 002: Error Display and Retry

## Goal

Display ingestion errors in the UI and allow moderators to retry eligible failures per PRD §10.6.

## Deliverables

- [ ] Error list in job detail view (failed tab or section)
- [ ] Each error shows: district name, id, error type, message, timestamp, retry eligibility
- [ ] Retry button per error or "Retry all eligible" for job
- [ ] `POST /admin/ingestion/jobs/:jobId/retry` with optional district_ids filter
- [ ] Retry creates new job or re-queues failed records; prevents retry of non-eligible
- [ ] Success feedback when retry completes

## Notes

- PRD §10.6: moderator can inspect error details, retry eligible failures, manually correct and re-run
- Retry may create a child job or append to same job; document behavior

## Verification

- Failed job shows errors; Retry eligible triggers re-processing; non-eligible errors not retried
