# Task 004: Map Component & Integration

## Goal

Add Leaflet + react-leaflet, create the map component, and integrate it into the ingestion console as a "Table" | "Map" tab.

## Deliverables

- [x] Add dependencies: `leaflet`, `react-leaflet@4`, `@types/leaflet`
- [x] Create `frontend/src/components/IngestionMap.tsx` (client component, `'use client'`)
- [x] Fetch `GET /admin/ingestion/map-data` with filter params
- [x] Render MapContainer, TileLayer (OpenStreetMap), Markers from API data
- [x] Color markers by status: ingested=green, ingested_with_warnings=orange, not_ingested=gray, ready_to_ingest=blue, in_progress=yellow, failed=red
- [x] Popup on marker click: district name, state; link to `/admin/ingestion/candidates/[id]`
- [x] Update `frontend/src/app/admin/ingestion/page.tsx`: add "Table" | "Map" tabs
- [x] Reuse filter bar state (search, state, status) for map when Map tab active
- [x] Map min-height 400px; loading state until data and tiles load
- [x] Show "X districts missing coordinates" when any candidates excluded due to NULL lat/lng

## Notes

- PRD §9.1, §9.3, §11.1: markers by status; click → preview; tab integration
- Implementation plan Phase 11.3
- Default view: center continental US (lat 39.5, lng -98.5), zoom 4
- Use react-leaflet's `Marker` and `Popup`; consider `MapContainer` with `center` and `zoom` props

## Verification

- `npm run build` succeeds
- Switch to Map tab; map displays with markers
- Markers colored correctly; zoom and pan work
- Click marker → navigates to candidate preview
- Changing filters updates visible markers
- Map loads within 3s
- Districts without coordinates excluded; count shown when applicable
