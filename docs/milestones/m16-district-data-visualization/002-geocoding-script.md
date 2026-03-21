# Task 002: Geocoding Script

## Goal

Implement a script that populates `latitude`, `longitude`, and `geocoded_at` for district candidates using Nominatim (OpenStreetMap), with rate limiting and idempotency.

## Deliverables

- [ ] Script `backend/scripts/geocode-district-candidates.ts` (or .js)
- [ ] Fetch candidates where `latitude IS NULL` (or `geocoded_at IS NULL`)
- [ ] For each: call Nominatim `https://nominatim.openstreetmap.org/search?q={name}, {state}, USA&format=json`
- [ ] Set User-Agent header per [OSM usage policy](https://operations.osmfoundation.org/policies/nominatim/)
- [ ] 1 req/sec delay between requests
- [ ] Update row with `latitude`, `longitude`, `geocoded_at` on success; log failures
- [ ] Idempotent: rerun skips or safely updates
- [ ] `package.json` script: `"geocode:district-candidates": "tsx backend/scripts/geocode-district-candidates.ts"` (or equivalent)

## Notes

- PRD §8.2, §9.5: Nominatim recommended; rate limit; idempotent; log failures
- Implementation plan Phase 11.1
- Query format: `{district name}, {state}, USA` (e.g. "Los Angeles Unified School District, CA, USA")
- Take first result from Nominatim response; validate lat/lng in valid ranges
- Consider `--dry-run` or `--limit 10` flag for testing

## Verification

- Run script on 10 districts; verify coordinates reasonable (e.g. LA Unified in CA)
- Run full 100; most get coordinates; failures logged
- Rerun script; no duplicate errors; skips or safely updates
- `SELECT COUNT(*) FROM district_candidates WHERE latitude IS NOT NULL` increases after run
