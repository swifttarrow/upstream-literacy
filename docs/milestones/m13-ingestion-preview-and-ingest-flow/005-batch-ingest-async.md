# Task 005: Batch Ingest Async Processing

## Goal

Process batch ingestion asynchronously so the UI is not blocked; update job status as records complete per PRD §§10.4, 10.5, 14.1.

## Deliverables

- [x] Enqueue ingestion job via pg-boss (or equivalent)
- [x] Worker processes districts; updates job record (succeeded/warning/failed counts)
- [x] Record-level outcomes persisted for progress UI
- [x] Single-district ingest may run synchronously for fast feedback
- [x] Batch ingest always async; moderator can navigate away and return to job
- [x] Idempotent per district (upsert, don't duplicate)

## Notes

- PRD §14.1: batch ingestion async without blocking UI
- Reuse existing district ingestion logic (district_ingestion_events, district_effective_attribute_values)
- Parse uploaded CCD and EDGE CSVs; join by LEAID; normalize each row; insert with coordinates from EDGE; compute completeness; handle errors per PRD §10.6

## Verification

- Batch of 10 districts: job starts immediately; worker processes; progress endpoint reflects updates; no UI freeze
