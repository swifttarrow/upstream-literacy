# Task 005: Batch Ingest Async Processing

## Goal

Process batch ingestion asynchronously so the UI is not blocked; update job status as records complete per PRD §§10.4, 10.5, 14.1.

## Deliverables

- [ ] Enqueue ingestion job via pg-boss (or equivalent)
- [ ] Worker processes districts; updates job record (succeeded/warning/failed counts)
- [ ] Record-level outcomes persisted for progress UI
- [ ] Single-district ingest may run synchronously for fast feedback
- [ ] Batch ingest always async; moderator can navigate away and return to job
- [ ] Idempotent per district (upsert, don't duplicate)

## Notes

- PRD §14.1: batch ingestion async without blocking UI
- Reuse existing district ingestion logic (district_ingestion_events, district_effective_attribute_values)
- Fetch NCES data per district; normalize; insert; handle errors per PRD §10.6

## Verification

- Batch of 10 districts: job starts immediately; worker processes; progress endpoint reflects updates; no UI freeze
