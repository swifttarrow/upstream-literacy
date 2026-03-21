# Task 003: Map Data API

## Goal

Add `GET /admin/ingestion/map-data` endpoint that returns district candidates with coordinates for map rendering, with the same filters as the candidates list.

## Deliverables

- [x] New route `GET /admin/ingestion/map-data` in `backend/src/routes/ingestion.ts`
- [x] Query params: `search`, `state`, `status` (same semantics as candidates)
- [x] Response: `{ districts: [{ id, name, state, status, latitude, longitude }] }`
- [x] Exclude rows where `latitude IS NULL` OR `longitude IS NULL`
- [x] No pagination; limit 500
- [x] Auth: `authenticate`, `requireModerator` (same as ingestion routes)
- [x] Validation: Zod schema for query params

## Notes

- PRD §9.4: Option 2 — dedicated endpoint returning only map fields
- Implementation plan Phase 11.2
- Reuse filter logic from candidates endpoint where possible
- Performance target: < 500ms for 100 districts

## Verification

- `GET /admin/ingestion/map-data` returns 200 with districts array
- Filters reduce result set: `?state=CA`, `?status=ingested`, `?search=Los Angeles`
- Unauthenticated returns 401; non-moderator returns 403
- Only districts with valid coordinates included
- Response time < 500ms under test
