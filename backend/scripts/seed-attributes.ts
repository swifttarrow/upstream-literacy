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

const ATTRIBUTE_DEFINITIONS = [
  { key: 'enrollment_bucket', label: 'Enrollment Size', value_type: 'text', sort_order: 1 },
  { key: 'state', label: 'State', value_type: 'text', sort_order: 2 },
  { key: 'frl_pct', label: 'Free/Reduced Lunch %', value_type: 'number', sort_order: 3 },
  { key: 'el_pct', label: 'English Learner %', value_type: 'number', sort_order: 4 },
  { key: 'grade_bands', label: 'Grade Bands', value_type: 'text', sort_order: 5 },
  { key: 'district_type', label: 'District Type', value_type: 'text', sort_order: 6 },
];

async function seedAttributes() {
  const client = await pool.connect();
  try {
    console.log('Seeding district_attribute_definitions...');

    for (const attr of ATTRIBUTE_DEFINITIONS) {
      await client.query(
        `INSERT INTO district_attribute_definitions (key, label, value_type, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE
           SET label = EXCLUDED.label,
               value_type = EXCLUDED.value_type,
               sort_order = EXCLUDED.sort_order`,
        [attr.key, attr.label, attr.value_type, attr.sort_order]
      );
      console.log(`  Upserted: ${attr.key}`);
    }

    console.log('Attribute seeding complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

seedAttributes().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
