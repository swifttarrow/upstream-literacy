/**
 * Geocode district candidates using Nominatim (OpenStreetMap).
 *
 * Usage:
 *   npm run geocode:district-candidates            # geocode all missing coordinates
 *   npm run geocode:district-candidates -- --limit 10   # process at most 10 records
 *   npm run geocode:district-candidates -- --dry-run    # preview without writing
 *
 * Follows OSM Nominatim usage policy: 1 request/second, User-Agent required.
 * Idempotent: skips rows that already have latitude set.
 */

import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'upstream-literacy/1.0 (district-geocoder; contact@upstream-literacy.dev)';
const RATE_LIMIT_MS = 1100; // slightly over 1 second to stay well within policy

interface Candidate {
  id: string;
  name: string;
  state: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

function parseArgs(): { limit: number | null; dryRun: boolean } {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { limit, dryRun };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(name: string, state: string): Promise<{ lat: number; lon: number } | null> {
  const query = `${name}, ${state}, USA`;
  const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Nominatim HTTP ${response.status}: ${response.statusText}`);
  }

  const results = (await response.json()) as NominatimResult[];

  if (!results || results.length === 0) {
    return null;
  }

  const lat = parseFloat(results[0].lat);
  const lon = parseFloat(results[0].lon);

  // Validate ranges
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  return { lat, lon };
}

async function run() {
  const { limit, dryRun } = parseArgs();

  if (dryRun) {
    console.log('[dry-run] No database writes will be performed.');
  }

  const client = await pool.connect();
  let candidates: Candidate[];

  try {
    let query = `
      SELECT id, name, state
      FROM district_candidates
      WHERE latitude IS NULL
      ORDER BY name
    `;
    if (limit !== null) {
      query += ` LIMIT ${limit}`;
    }

    const result = await client.query(query);
    candidates = result.rows;
  } finally {
    client.release();
  }

  console.log(`Found ${candidates.length} candidates without coordinates.`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    console.log(`[${i + 1}/${candidates.length}] ${candidate.name}, ${candidate.state}`);

    try {
      const coords = await geocode(candidate.name, candidate.state);

      if (!coords) {
        console.warn(`  -> No results found`);
        failed++;
      } else {
        console.log(`  -> lat=${coords.lat}, lon=${coords.lon}`);

        if (!dryRun) {
          await pool.query(
            `UPDATE district_candidates
             SET latitude = $1, longitude = $2, geocoded_at = now(), updated_at = now()
             WHERE id = $3`,
            [coords.lat, coords.lon, candidate.id]
          );
        }

        succeeded++;
      }
    } catch (err) {
      console.error(`  -> Error: ${(err as Error).message}`);
      failed++;
    }

    // Rate limit: wait before next request (skip after last one)
    if (i < candidates.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  await pool.end();

  console.log(`\nDone. Succeeded: ${succeeded}, Failed/not found: ${failed}`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
