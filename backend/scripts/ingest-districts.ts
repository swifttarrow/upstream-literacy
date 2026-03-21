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

// Sample district fixture data
const SAMPLE_DISTRICTS = [
  {
    name: 'Springfield Unified School District',
    slug: 'springfield-unified',
    country_code: 'US',
    state_region: 'IL',
    city: 'Springfield',
    external_ref: 'NCES-1700001',
    attributes: {
      enrollment_bucket: 'large',
      state: 'Illinois',
      frl_pct: 58.3,
      el_pct: 12.1,
      grade_bands: 'K-12',
      district_type: 'urban',
    },
  },
  {
    name: 'Riverside Rural Cooperative',
    slug: 'riverside-rural',
    country_code: 'US',
    state_region: 'TX',
    city: 'Riverside',
    external_ref: 'NCES-4800002',
    attributes: {
      enrollment_bucket: 'small',
      state: 'Texas',
      frl_pct: 71.2,
      el_pct: 28.5,
      grade_bands: 'K-12',
      district_type: 'rural',
    },
  },
  {
    name: 'Metro Heights School District',
    slug: 'metro-heights',
    country_code: 'US',
    state_region: 'CA',
    city: 'Los Angeles',
    external_ref: 'NCES-0600003',
    attributes: {
      enrollment_bucket: 'xlarge',
      state: 'California',
      frl_pct: 45.6,
      el_pct: 22.3,
      grade_bands: 'K-12',
      district_type: 'urban',
    },
  },
  {
    name: 'Lakewood Suburban Schools',
    slug: 'lakewood-suburban',
    country_code: 'US',
    state_region: 'OH',
    city: 'Lakewood',
    external_ref: 'NCES-3900004',
    attributes: {
      enrollment_bucket: 'medium',
      state: 'Ohio',
      frl_pct: 34.8,
      el_pct: 8.7,
      grade_bands: 'K-12',
      district_type: 'suburban',
    },
  },
  {
    name: 'Mountain View Charter Network',
    slug: 'mountain-view-charter',
    country_code: 'US',
    state_region: 'CO',
    city: 'Denver',
    external_ref: 'NCES-0800005',
    attributes: {
      enrollment_bucket: 'medium',
      state: 'Colorado',
      frl_pct: 52.1,
      el_pct: 15.4,
      grade_bands: 'K-8',
      district_type: 'charter',
    },
  },
];

async function ingestDistricts() {
  const client = await pool.connect();
  try {
    console.log('Ingesting districts...');

    // Get attribute definitions
    const defsResult = await client.query(
      'SELECT id, key FROM district_attribute_definitions'
    );
    const defMap = new Map<string, string>(defsResult.rows.map((r) => [r.key, r.id]));

    if (defMap.size === 0) {
      console.warn('No attribute definitions found. Run seed:attributes first.');
    }

    for (const district of SAMPLE_DISTRICTS) {
      // Upsert district
      const districtResult = await client.query(
        `INSERT INTO districts (name, slug, country_code, state_region, city, external_ref)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name,
               state_region = EXCLUDED.state_region,
               city = EXCLUDED.city,
               updated_at = now()
         RETURNING id`,
        [
          district.name,
          district.slug,
          district.country_code,
          district.state_region,
          district.city,
          district.external_ref,
        ]
      );

      const districtId = districtResult.rows[0].id;
      console.log(`  District: ${district.name} (${districtId})`);

      // Insert ingestion event
      const ingestionResult = await client.query(
        `INSERT INTO district_ingestion_events
         (district_id, source_label, normalized_attributes, raw_payload)
         VALUES ($1, 'sample_fixture_v1', $2, $3)
         RETURNING id`,
        [
          districtId,
          JSON.stringify(district.attributes),
          JSON.stringify({ source: 'seed_script', district }),
        ]
      );

      const ingestionEventId = ingestionResult.rows[0].id;

      // Upsert effective attribute values
      for (const [key, value] of Object.entries(district.attributes)) {
        const definitionId = defMap.get(key);
        if (!definitionId) {
          console.warn(`    No definition for key: ${key}`);
          continue;
        }

        const isNumber = typeof value === 'number';
        await client.query(
          `INSERT INTO district_effective_attribute_values
           (district_id, definition_id, value_text, value_number, provenance, last_ingestion_event_id, updated_at)
           VALUES ($1, $2, $3, $4, 'ingest', $5, now())
           ON CONFLICT (district_id, definition_id) DO UPDATE
             SET value_text = EXCLUDED.value_text,
                 value_number = EXCLUDED.value_number,
                 provenance = 'ingest',
                 last_ingestion_event_id = EXCLUDED.last_ingestion_event_id,
                 updated_at = now()`,
          [
            districtId,
            definitionId,
            isNumber ? null : String(value),
            isNumber ? value : null,
            ingestionEventId,
          ]
        );
      }

      console.log(`    Ingested ${Object.keys(district.attributes).length} attributes`);
    }

    console.log('District ingestion complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

ingestDistricts().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
