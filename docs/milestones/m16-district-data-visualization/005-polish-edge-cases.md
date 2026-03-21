# Task 005: Polish & Edge Cases

## Goal

Add legend, improve loading/empty/error states, and document the geocoding script.

## Deliverables

- [x] Legend: status → color mapping visible on map or sidebar (matches dashboard badge colors)
- [x] Empty state: "No districts with coordinates" or "Run geocoding script" when all candidates lack coordinates
- [x] Error handling: API failure shows user-friendly message; retry or link to docs
- [x] Loading state: skeleton or spinner until map and data ready
- [x] Documentation: `docs/geocoding.md` describing how to run `npm run geocode:district-candidates` and when to re-run

## Notes

- PRD §11.1: legend, "X districts missing coordinates"
- Implementation plan Phase 11.4
- Status colors: ingested=green, ingested_with_warnings=orange, not_ingested=gray, ready_to_ingest=blue, in_progress=yellow, failed=red
- Doc could live in `docs/` or inline in script or package.json

## Verification

- Legend visible and matches ingestion dashboard badge colors
- Empty state shows when no districts have coordinates
- API failure (e.g. network error) shows message; no silent fail
- Geocoding script documented; developer can find and run it
