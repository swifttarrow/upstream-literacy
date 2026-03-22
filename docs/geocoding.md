# District Candidate Coordinates

The map view in the Ingestion Console requires latitude/longitude coordinates for each district candidate.

## Primary Source: EDGE Geocode File at Upload

Coordinates are **populated at ingestion time** when moderators upload both the CCD district file and the [EDGE Public LEA Geocode](https://nces.ed.gov/programs/edge/geographic/schoollocations) file. The system joins them by LEAID and stores `latitude`, `longitude`, and `geocoded_at` for matched districts.

**Download:** [EDGE School Geocodes & Geoassignments](https://nces.ed.gov/programs/edge/geographic/schoollocations) → select "Public School District File" (ZIP); extract the CSV and upload it together with the CCD file.

## Fallback: Geocoding Script

For districts **not** in the EDGE file or with missing coordinates, run the optional fallback geocoding script, which calls the [Nominatim](https://nominatim.openstreetmap.org/) OpenStreetMap API.

### Running the Script

From the `backend/` directory:

```bash
npm run geocode:district-candidates
```

This will:
1. Query all `district_candidates` where `latitude IS NULL`
2. For each candidate, call Nominatim with `{name}, {state}, USA`
3. Write `latitude`, `longitude`, and `geocoded_at` on success
4. Log failures (district not found or API error) without stopping
5. Rate-limit to 1 request per second per Nominatim usage policy

The script is **idempotent**: re-running it will skip any candidate that already has coordinates.

### Options

```bash
# Preview without writing to the database
npm run geocode:district-candidates -- --dry-run

# Process at most N candidates (useful for testing)
npm run geocode:district-candidates -- --limit 10
```

### When to Re-Run

Re-run the script when:
- District candidates were ingested **without** an EDGE file (legacy data)
- A district in the CCD file was not found in the EDGE file
- A candidate's name or state was corrected and you want fresh coordinates

### Failures

Some districts may not be found by Nominatim (unusual names, no OSM data). These are logged with `-> No results found` and left with NULL coordinates. They will not appear on the map but are still visible in the Table view.

---

## Download Links

| File | Purpose | Link |
|------|---------|------|
| **CCD LEA directory** | District names, state, LEAID, enrollment, FRL, EL, etc. | [CCD Data Files](https://nces.ed.gov/ccd/files.asp) — select LEA level and school year |
| **EDGE Public LEA Geocode** | Latitude, longitude, LOCALE for each district | [EDGE School Geocodes](https://nces.ed.gov/programs/edge/geographic/schoollocations) — "Public School District File" |

**Note:** Select matching school years for both files (e.g., 2024–25 for both). EDGE direct download pattern: `https://nces.ed.gov/programs/edge/data/EDGE_GEOCODE_PUBLICLEA_XXXX.zip` where XXXX = 2425 (2024–25), 2324 (2023–24), etc.

## Troubleshooting: Many Districts Missing Coordinates

If most or all districts show "missing coordinates" after upload:

1. **Correct EDGE file** — Use **"Public School District File"** (`EDGE_GEOCODE_PUBLICLEA_*.zip`), **not** the Public School file. The School file has one row per school; the District file has one row per LEA (district office).

2. **EDGE ZIP contains shapefiles** — The NCES ZIP has `.shp`, `.dbf`, etc., not a CSV. You must either:
   - Export the shapefile to CSV (e.g. in QGIS: right‑click layer → Export → Save Features As → CSV), or
   - Download the [pre-built CSV from data.gov](https://catalog.data.gov/dataset/school-district-office-locations-current-d848f) (CSV resource).

3. **Matching school years** — Use CCD and EDGE from the same school year. LEAIDs can change between years.

4. **Re-upload after fix** — After correcting the EDGE file, upload both files again. Coordinates are populated at upload time.
