# Task 004: Ingestion Progress UI

## Goal

Display ingestion progress during active jobs: progress bar, per-record status, live refresh per PRD §§10.5, 11.3.

## Deliverables

- [x] Job detail view (modal or dedicated route): `/admin/ingestion/jobs/:jobId`
- [x] Progress bar: total, completed, succeeded, warnings, failed
- [x] Per-record list: district name, status (pending/running/succeeded/warning/failed)
- [x] Started at, elapsed time
- [x] Polling or websocket for live updates
- [x] Final job summary when complete
- [x] Retry failed button (wire to m14)

## Notes

- PRD §10.5: total/completed/remaining, succeeded/warning/failed, current record, timestamps
- PRD §11.3: job summary, progress bar, live record list, succeeded/warning/failed tabs
- `GET /admin/ingestion/jobs/:id` returns job + record outcomes

## Verification

- Start batch ingest; progress UI updates; completion shows summary; Retry failed available when failures exist
