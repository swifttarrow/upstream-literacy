# Task 003: Ingest Trigger API

## Goal

Implement the API for moderators to trigger single-district or batch ingestion, with job creation and idempotency per PRD §§10.4, 15.3.

## Deliverables

- [ ] `POST /admin/ingestion/trigger` with body: `{ district_ids: string[] }` or single `district_id`
- [ ] Create ingestion job record; queue districts for processing
- [ ] Prevent duplicate active ingestion for same district (return 409 or skip)
- [ ] Confirmation: require `confirm: true` for batch or ingest-all
- [ ] Return job_id for progress polling
- [ ] Auth: moderator for single/batch; admin for ingest-all (if gated)

## Notes

- PRD §10.4: single, batch, ingest-all; create job; prevent duplicate active
- PRD §15.3: idempotency via NCES id, state+name
- May use pg-boss to enqueue; or sync for single-district, async for batch

## Verification

- POST with district_ids creates job; duplicate request for same district in-flight returns appropriate response; job_id returned for polling
