# Task 001: Schema Migration — Geocode Columns

## Goal

Add `latitude`, `longitude`, and `geocoded_at` columns to `district_candidates` to store WGS84 coordinates for map markers.

## Deliverables

- [ ] New migration file `schema/12_district_candidates_geocode.sql`
- [ ] `ALTER TABLE district_candidates ADD COLUMN latitude numeric(9,6)` (nullable)
- [ ] `ALTER TABLE district_candidates ADD COLUMN longitude numeric(9,6)` (nullable)
- [ ] `ALTER TABLE district_candidates ADD COLUMN geocoded_at timestamptz` (nullable)
- [ ] Migration runs after `11_ingestion_console.sql` (existing runner uses numeric order)

## Notes

- PRD §8.1: latitude, longitude nullable (WGS84); geocoded_at for when coordinates were set
- Implementation plan Phase 11.1
- Use `numeric(9,6)` for ~1m precision; sufficient for district-level markers
- No index required for MVP (optional `(latitude, longitude)` for spatial queries later)

## Verification

- Run migration script; `district_candidates` has new columns
- Existing rows have NULL for lat/lng/geocoded_at
- `SELECT latitude, longitude, geocoded_at FROM district_candidates LIMIT 1` returns columns
