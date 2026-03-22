/**
 * Seed script: create N users with randomized district and problem statement associations.
 *
 * Usage:
 *   npm run seed:users           # creates 10 users (default)
 *   npm run seed:users -- 50     # creates 50 users
 *
 * Prerequisites:
 *   - Districts must exist (run ingest:districts first if needed)
 *   - Problem taxonomy will be seeded automatically if missing
 */

import * as path from 'path';
import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import {
  PROBLEM_STATEMENT_CATEGORIES,
  PROBLEM_STATEMENTS,
} from '../src/data/problem-statements.js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// Simple randomization arrays (no external deps)
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Jamie', 'Reese', 'Skyler', 'Dakota', 'Cameron', 'Parker', 'Sam', 'Jordan',
  'Maria', 'James', 'Sarah', 'Michael', 'Jennifer', 'David', 'Emily', 'Robert',
  'Lisa', 'William', 'Karen', 'Richard', 'Nancy', 'Thomas', 'Betty', 'Charles',
];
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
];
const ROLES = [
  'Superintendent', 'Assistant Superintendent', 'Curriculum Director',
  'Principal', 'Assistant Principal', 'Instructional Coach', 'Special Education Director',
  'Literacy Coordinator', 'Math Coordinator', 'Data Analyst', 'Technology Director',
];
const BIO_TEMPLATES = [
  'Focused on improving student outcomes in {role}.',
  'Former classroom teacher now in {role}. Passionate about evidence-based practices.',
  'Leading initiatives in curriculum alignment and professional development.',
  'Working to close achievement gaps and support struggling learners.',
  'Building partnerships with families and community organizations.',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle([...arr]).slice(0, Math.min(n, arr.length));
}

async function ensureTaxonomy(client: PoolClient): Promise<Map<string, string>> {
  const problemIds = new Map<string, string>();

  for (const cat of PROBLEM_STATEMENT_CATEGORIES) {
    const catResult = await client.query(
      `INSERT INTO problem_categories (name, slug, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
       RETURNING id`,
      [cat.name, cat.slug, cat.sort_order]
    );
    const categoryId = catResult.rows[0].id;

    for (const prob of PROBLEM_STATEMENTS.filter((p) => p.category_slug === cat.slug)) {
      const probResult = await client.query(
        `INSERT INTO problem_statements (category_id, code, label, description, status, sort_order)
         VALUES ($1, $2, $3, NULL, 'active', $4)
         ON CONFLICT (code) DO UPDATE SET category_id = EXCLUDED.category_id, label = EXCLUDED.label, status = 'active'
         RETURNING id`,
        [categoryId, prob.code, prob.label, prob.sort_order]
      );
      problemIds.set(prob.code, probResult.rows[0].id);
    }
  }
  return problemIds;
}

async function seedUsers(count: number) {
  const client = await pool.connect();
  try {
    console.log(`Seeding ${count} users with randomized district and problem associations...`);

    // Ensure taxonomy exists
    const problemIds = await ensureTaxonomy(client);
    const problemIdList = [...problemIds.values()];
    if (problemIdList.length === 0) {
      console.error('No problem statements found. Taxonomy seed failed.');
      process.exit(1);
    }
    console.log(`  Taxonomy: ${problemIdList.length} problem statements`);

    // Fetch districts
    const districtResult = await client.query<{ id: string }>('SELECT id FROM districts');
    const districtIds = districtResult.rows.map((r) => r.id);
    if (districtIds.length === 0) {
      console.warn('  No districts found. Users will be created without district_id.');
    } else {
      console.log(`  Districts: ${districtIds.length} available`);
    }

    const defaultPassword = await bcrypt.hash('seed-password-123', 10);

    for (let i = 0; i < count; i++) {
      // Generate unique email (include index + random to avoid collisions)
      const first = pick(FIRST_NAMES).toLowerCase();
      const last = pick(LAST_NAMES).toLowerCase();
      const unique = `${i}-${Math.random().toString(36).slice(2, 8)}`;
      const email = `seed.${first}.${last}.${unique}@example.edu`;

      const fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      const professionalRole = pick(ROLES);
      const bio = pick(BIO_TEMPLATES).replace('{role}', professionalRole);

      // Random district (or null if none)
      const districtId = districtIds.length > 0 ? pick(districtIds) : null;

      // Random primary + 0-3 secondary problems
      const selectedProblems = pickN(problemIdList, 1 + Math.floor(Math.random() * 4));
      const primaryId = selectedProblems[0];
      const secondaryIds = selectedProblems.slice(1);

      const userResult = await client.query<{ id: string }>(
        `INSERT INTO users
         (email, password_hash, full_name, professional_role, bio, district_id,
          membership_status, is_demo_profile, profile_completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'approved', false, now())
         RETURNING id`,
        [email, defaultPassword, fullName, professionalRole, bio, districtId]
      );
      const userId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO user_problem_selections (user_id, problem_statement_id, is_primary)
         VALUES ($1, $2, true)`,
        [userId, primaryId]
      );
      for (const probId of secondaryIds) {
        await client.query(
          `INSERT INTO user_problem_selections (user_id, problem_statement_id, is_primary)
           VALUES ($1, $2, false)
           ON CONFLICT (user_id, problem_statement_id) DO NOTHING`,
          [userId, probId]
        );
      }

      console.log(`  Created: ${fullName} (${email}) — district: ${districtId ? 'yes' : 'none'}, problems: 1 primary + ${secondaryIds.length} secondary`);
    }

    console.log(`\nDone. Created ${count} users.`);
    console.log('Default password for all: seed-password-123');
  } finally {
    client.release();
    await pool.end();
  }
}

function parseCount(): number {
  const arg = process.argv.find((a) => /^\d+$/.test(a));
  if (arg) {
    const n = parseInt(arg, 10);
    if (n > 0 && n <= 10_000) return n;
    console.warn(`Invalid count "${arg}", using default 10`);
  }
  return 10;
}

const count = parseCount();
seedUsers(count).catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
