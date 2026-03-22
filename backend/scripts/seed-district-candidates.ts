import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

interface CandidateRecord {
  nces_district_id: string;
  name: string;
  state: string;
  district_size: string;
}

async function seedDistrictCandidates() {
  const dataPath = path.resolve(__dirname, '../src/data/district-candidates.json');
  const candidates: CandidateRecord[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const client = await pool.connect();
  try {
    console.log(`Seeding ${candidates.length} district candidates...`);

    let inserted = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      const result = await client.query(
        `INSERT INTO district_candidates (nces_district_id, name, state, district_size)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (nces_district_id) DO NOTHING
         RETURNING id`,
        [candidate.nces_district_id, candidate.name, candidate.state, candidate.district_size]
      );

      if (result.rows.length > 0) {
        inserted++;
      } else {
        skipped++;
      }
    }

    const total = await client.query('SELECT COUNT(*) FROM district_candidates');
    console.log(`Done. Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
    console.log(`Total district_candidates rows: ${total.rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDistrictCandidates().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
