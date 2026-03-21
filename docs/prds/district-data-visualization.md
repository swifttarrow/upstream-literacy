# Spec — District Data Visualization (Map View)

## 1. Overview

Add an interactive map view to the ingestion console that displays district candidates as point markers, highlighting which districts have been ingested, which are pending, and which have failed. Moderators can see geographic coverage at a glance and quickly identify regions with gaps or concentration.

The map view complements the existing table-based ingestion dashboard:
- moderators can see district coverage spatially
- moderators can click markers to access district details or preview
- moderators can filter the map by status (ingested, not ingested, failed, etc.)
- the map integrates with the existing ingestion workflow and permissions

---

## 2. Problem

The ingestion dashboard shows districts in a list/table format. Moderators cannot easily:
- see which geographic regions have coverage vs. gaps
- understand spatial distribution of ingested vs. pending districts
- identify clusters of failed or warning districts by location

A map view would give moderators a spatial overview of ingestion progress and support data-driven decisions about where to focus ingestion efforts.

---

## 3. Goals

- Provide an interactive map showing all district candidates as markers
- Color-code markers by ingestion status (ingested, not ingested, in progress, failed, warnings)
- Allow moderators to click markers to navigate to district preview or detail
- Support status filtering so the map shows only selected statuses
- Ensure the map loads and performs well with ~100 districts (and scales to more)
- Keep the feature internal and moderator-facing (same permissions as ingestion console)

---

## 4. Non-Goals (MVP)

- District boundary polygons (choropleth or shape overlays)
- State-level aggregation only (no per-district markers)
- Geocoding at ingestion time (coordinates populated via one-time enrichment)
- Public or user-facing map
- Real-time geocoding (coordinates stored, not computed on demand)
- Mobile-optimized map UX

---

## 5. Users

### Primary User
- Moderator / internal operations user

### Secondary User
- Admin (may view map for coverage overview)

---

## 6. Key User Stories

### Moderator
- As a moderator, I want to see a map of district candidates so I can understand geographic coverage.
- As a moderator, I want to see which districts are ingested vs. not ingested on the map so I can prioritize regions.
- As a moderator, I want to click a district marker to open the district preview so I can quickly ingest or fix it.
- As a moderator, I want to filter the map by status so I can focus on failed or pending districts.
- As a moderator, I want the map to load quickly so I can use it routinely.

---

## 7. Scope

### In Scope
- Schema: add `latitude` and `longitude` to `district_candidates` (nullable)
- One-time geocoding enrichment script to populate coordinates for existing candidates
- API endpoint(s) to return district candidates with coordinates for map rendering
- Map component using a mapping library (Leaflet, Mapbox GL, or equivalent)
- Marker styling by status (ingested = green, not ingested = gray, failed = red, etc.)
- Click-through from marker to district preview/candidate detail
- Status filter controls (same semantics as ingestion dashboard filters)
- Integration into ingestion console (new tab, section, or page)

### Out of Scope
- Geocoding at ingestion time (handled by enrichment script; new candidates can be geocoded on next run)
- District boundary polygons
- Clustering for very large datasets (100 districts does not require clustering)
- Export or share map view

---

## 8. Data Requirements

### 8.1 Schema Changes

Add geographic coordinates to `district_candidates`:

| Column     | Type         | Null | Default | Notes                                      |
|------------|--------------|------|---------|--------------------------------------------|
| latitude   | numeric(9,6) | YES  | —       | WGS84 latitude; NULL if geocoding failed   |
| longitude  | numeric(9,6) | YES  | —       | WGS84 longitude; NULL if geocoding failed  |
| geocoded_at| timestamptz  | YES  | —       | When coordinates were last set             |

**Indexes:** `(latitude, longitude)` for spatial queries if needed (optional for MVP).

### 8.2 Geocoding Strategy

Coordinates must be populated before the map can display markers. Options (implement at least one):

1. **Nominatim (OpenStreetMap)** — free, rate-limited (1 req/sec typical). Geocode `{district name}, {state}, USA`.
2. **Google Geocoding API** — paid, higher accuracy. Use same query format.
3. **NCES / EdFacts** — if NCES provides district-level lat/long, use as primary source; fallback to geocoder.
4. **Static lookup table** — one-time manual or script-generated JSON/CSV for the 100 districts, loaded via migration script.

The enrichment script shall:
- Process all `district_candidates` with `latitude IS NULL` or `geocoded_at IS NULL`
- Respect rate limits (e.g., 1 req/sec for Nominatim)
- Store `latitude`, `longitude`, `geocoded_at` on success
- Log failures; leave NULL for retry
- Be idempotent and rerunnable

### 8.3 Data Quality

- Districts without coordinates: do not display on map; optionally show count in UI ("X districts missing coordinates").
- Duplicate or ambiguous geocodes: prefer first valid result; consider adding `geocode_confidence` later if needed.

---

## 9. Functional Requirements

## 9.1 Map View

The system shall provide an interactive map view within the ingestion console.

The map shall:
- Display the continental U.S. (or configurable bounding box) as the default view
- Render district candidates with valid `(latitude, longitude)` as point markers
- Color-code markers by ingestion status:
  - Ingested: green
  - Ingested with warnings: orange
  - Not ingested: gray
  - Ready to ingest: blue
  - In progress: yellow
  - Failed: red
- Support zoom and pan
- Support marker click to open district preview (navigate to existing candidate detail page)
- Show district name (and optionally state) in a tooltip or popup on hover/click

## 9.2 Filtering

The map shall support filtering consistent with the ingestion dashboard:
- Filter by status (multi-select or single)
- Filter by state
- Filter by search (district name)

Filtered results shall update the visible markers. Districts that do not match the filter shall be hidden from the map.

## 9.3 Integration with Ingestion Console

The map view shall be accessible from the ingestion console:
- Option A: Tab or link alongside the table view (e.g., "Table" | "Map")
- Option B: Dedicated route under `/admin/ingestion/map`
- Option C: Collapsible panel or section above/below the table

The chosen approach should keep navigation simple and consistent with existing ingestion UI patterns.

## 9.4 API

The system shall expose one or more endpoints to support the map:

**Required:**
- Return district candidates with `id`, `name`, `state`, `status`, `latitude`, `longitude` for map rendering
- Support the same filter parameters as the existing candidates list (`search`, `state`, `status`)
- Exclude or clearly identify candidates with missing coordinates

**Option 1:** Extend `GET /admin/ingestion/candidates` with optional `include_coordinates=true` and `limit` high enough to return all candidates for map use (e.g., 500).

**Option 2:** New `GET /admin/ingestion/map-data` returning only fields needed for the map (id, name, state, status, lat, lng) with no pagination, for all candidates matching filters.

## 9.5 Geocoding Enrichment

The system shall provide a script or command to populate coordinates:
- `npm run geocode:district-candidates` or equivalent
- Script shall process candidates missing coordinates
- Script shall be idempotent and safe to rerun
- Script shall log progress and failures

---

## 10. Technical Requirements

## 10.1 Map Library

| Layer        | Technology Options                                  |
|--------------|------------------------------------------------------|
| Map rendering| Leaflet + react-leaflet, Mapbox GL JS, MapLibre GL  |
| Base tiles   | OpenStreetMap (free), Mapbox (API key), Stadia Maps  |
| GeoJSON      | Optional; markers can be rendered from lat/lng array |

**Recommendation:** Leaflet + react-leaflet for simplicity and no API key requirement with OSM tiles. Use whatever helps you ship.

## 10.2 Frontend

- Map component shall be a client component (`'use client'`) due to interactivity
- Map shall load asynchronously; show loading state until data and map are ready
- Markers shall be rendered from API response; no client-side geocoding

## 10.3 Performance Targets

| Metric                    | Target                          |
|---------------------------|----------------------------------|
| Map initial load          | < 3s (including tile fetch)      |
| API response (map data)   | < 500ms for 100 districts        |
| Marker render             | < 500ms after data received      |
| Geocoding script          | < 5 min for 100 districts (rate-limited) |

## 10.4 Permissions

- Map view shall require the same authentication and role checks as the ingestion console
- Moderator and admin roles shall have access
- Unauthenticated or non-moderator users shall be redirected (same behavior as ingestion dashboard)

---

## 11. UX / Screen-Level Spec

## 11.1 Map View Screen

### Key UI Components

- Map container (fills available width; min height ~400px)
- Filter bar (consistent with ingestion dashboard):
  - Search input
  - State dropdown
  - Status dropdown or multi-select
- Legend: status → color mapping
- Optional: "X districts missing coordinates" message if any
- Optional: "Run geocoding" or link to script docs if many missing

### Marker Interaction

- Hover: show tooltip with district name, state, status
- Click: navigate to `/admin/ingestion/candidates/{id}` (existing preview page)

### Default View

- Center: continental U.S. (e.g., lat 39.5, lng -98.5)
- Default zoom: 4 (state-level overview)
- All statuses shown unless filter applied

---

## 12. Build Strategy

**Priority order:**

1. **Schema migration** — Add `latitude`, `longitude`, `geocoded_at` to `district_candidates`
2. **Geocoding script** — Implement enrichment script; run for existing 100 districts
3. **API** — Add map-data endpoint or extend candidates endpoint with coordinates
4. **Map library** — Add Leaflet (or chosen lib) to frontend; create map component
5. **Marker rendering** — Connect API data to markers; implement status-based styling
6. **Filtering** — Wire filters to API and map update
7. **Navigation** — Add map tab/route and click-through to candidate detail
8. **Polish** — Legend, loading states, error handling for missing coordinates

**Critical guidance:**

- Start with a minimal map (single hardcoded marker) to validate library and tile loading
- Geocode in batches with delay to avoid rate limits
- Consider caching tile requests or using a CDN for base maps
- Test with a subset of districts first (e.g., 10) before full run

---

## 13. Non-Functional Requirements

## 13.1 Performance

- Map tiles shall load progressively; initial view should be usable within 3 seconds
- Marker rendering shall not block the main thread
- API shall return only fields needed for the map when possible

## 13.2 Security

- Map view shall require moderator/admin authentication
- API shall enforce same role checks as ingestion routes
- No sensitive data in marker popups (name, state, status only)

## 13.3 Usability

- Map shall be intuitively navigable (zoom, pan)
- Status colors shall be consistent with ingestion dashboard badges
- Filter behavior shall match table filters for consistency

## 13.4 Maintainability

- Geocoding script shall be documented and rerunnable
- Map component shall be modular and testable
- Coordinate fields shall be nullable to support partial geocoding

---

## 14. Success Metrics

- % of district candidates with valid coordinates
- Map load time (p50, p95)
- Moderator usage (e.g., map views per session)
- Click-through rate from map marker to district preview

---

## 15. Risks

- Geocoding may fail or return incorrect locations for some district names (e.g., "Orange County" ambiguities)
- Rate limits on free geocoding APIs may slow initial enrichment
- Map library bundle size may increase frontend payload
- Some districts may geocode to overlapping points (e.g., same city); consider marker clustering in a future iteration if needed

---

## 16. Open Questions

- Should new district candidates be geocoded automatically during ingestion, or only via periodic enrichment?
- Should we support manual lat/lng override for districts that geocode incorrectly?
- Is a single map view sufficient, or should we support multiple views (e.g., by district type)?
- Should the map replace or supplement the table view in the default dashboard layout?

---

## 17. Dependencies

- Existing ingestion console and `district_candidates` table
- Existing moderator authentication and role checks
- Candidate list/detail routes for click-through
- Node.js environment for geocoding script (backend or standalone)

---

## 18. Recommended MVP Decisions

- Add `latitude`, `longitude`, `geocoded_at` to `district_candidates` via migration
- Use Nominatim for geocoding (free, no API key); implement rate limiting and retries
- Use Leaflet + react-leaflet with OpenStreetMap tiles
- Add `GET /admin/ingestion/map-data` returning id, name, state, status, lat, lng for filtered candidates
- Integrate map as a tab or link in the ingestion console: "Table" | "Map"
- Districts without coordinates: exclude from map, show count in UI
- A simple map with working markers beats a complex map with broken geocoding.
