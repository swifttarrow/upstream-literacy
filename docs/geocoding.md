# District Candidate Geocoding

The map view in the Ingestion Console requires latitude/longitude coordinates for each district candidate. These are populated by the geocoding script, which calls the [Nominatim](https://nominatim.openstreetmap.org/) OpenStreetMap API.

## Running the Script

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

## Options

```bash
# Preview without writing to the database
npm run geocode:district-candidates -- --dry-run

# Process at most N candidates (useful for testing)
npm run geocode:district-candidates -- --limit 10
```

## When to Re-Run

Re-run the script whenever:
- New district candidates are added (e.g. after `npm run seed:district-candidates`)
- A candidate's name or state is corrected and you want fresh coordinates

## Failures

Some districts may not be found by Nominatim (unusual names, no OSM data). These are logged with `-> No results found` and left with NULL coordinates. They will not appear on the map but are still visible in the Table view.
