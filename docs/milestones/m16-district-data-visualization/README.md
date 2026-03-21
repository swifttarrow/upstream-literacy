# Milestone 16: District Data Visualization (Map View)

## Overview

Add an interactive map view to the ingestion console per [district-data-visualization PRD](../../prds/district-data-visualization.md) and [Implementation Plan Phase 11](../../implementation-plan.md). Moderators see ingested districts as point markers (color-coded by completeness/status), filter by completeness/status/state/search, and click through to district detail.

**End state:** "Table" | "Map" tab in ingestion console; markers colored by completeness/status; filters update markers; click → district detail; districts without coordinates excluded with count shown. Geocoding via `npm run geocode:district-candidates`.

**Source:** [Implementation Plan Phase 11](../../implementation-plan.md), [District Data Visualization PRD](../../prds/district-data-visualization.md)

## Dependencies

- [x] Milestone 15 (Ingestion Editing and Audit) — ingestion console must exist
- [x] Milestone 11–15 (Ingestion Console) — district_candidates table, moderator auth

## Changes Required

| Area | Changes |
|------|---------|
| **Schema** | Add `latitude`, `longitude`, `geocoded_at` to `district_candidates` via `schema/12_district_candidates_geocode.sql` |
| **Geocoding** | Script using Nominatim; 1 req/sec; idempotent; `npm run geocode:district-candidates` |
| **API** | `GET /admin/ingestion/map-data` — filters: search, state, status/completeness; returns districts with coordinates; exclude NULL lat/lng |
| **Map** | Leaflet + react-leaflet; `IngestionMap.tsx`; Table \| Map tabs; markers by completeness/status |
| **Polish** | Legend, loading/empty/error states, geocoding docs |

## Success Criteria

### Automated Verification
- [ ] Migration runs without error
- [ ] Geocoding script processes candidates; idempotent
- [ ] `GET /admin/ingestion/map-data` returns 200; filters work; < 500ms for 100 districts
- [x] `npm run build` succeeds

### Manual Verification
- [ ] Map displays markers; colors match completeness/status (green/orange/gray/blue/yellow/red)
- [ ] Zoom, pan, click marker → district detail
- [ ] Filters update visible markers
- [ ] Map loads in < 3s
- [ ] Districts without coordinates excluded; count shown when any
- [ ] Legend, empty/error states handled; geocoding script documented

## Tasks

- [001-schema-migration-geocode-columns](./001-schema-migration-geocode-columns.md)
- [002-geocoding-script](./002-geocoding-script.md)
- [003-map-data-api](./003-map-data-api.md)
- [004-map-component-integration](./004-map-component-integration.md)
- [005-polish-edge-cases](./005-polish-edge-cases.md)
