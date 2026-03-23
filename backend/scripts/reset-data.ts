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

const ADMIN_EMAIL = 'kevin.chang@challenger.gauntletai.com';
const ADMIN_PASSWORD = 'password';
const MOCK_USER_COUNT = 500;

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Jamie', 'Reese', 'Skyler', 'Dakota', 'Cameron', 'Parker', 'Sam', 'Maria',
  'James', 'Sarah', 'Michael', 'Jennifer', 'David', 'Emily', 'Robert', 'Lisa',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
];

const ROLES = [
  'Superintendent',
  'Assistant Superintendent',
  'Curriculum Director',
  'Principal',
  'Assistant Principal',
  'Instructional Coach',
  'Special Education Director',
  'Literacy Coordinator',
  'Math Coordinator',
  'Data Analyst',
  'Technology Director',
];

type SeededUser = {
  id: string;
  email: string;
  fullName: string;
  platformRole: 'admin' | 'member';
};

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function truncateAllTables(client: PoolClient): Promise<void> {
  const tablesResult = await client.query<{ tablename: string }>(
    `SELECT tablename
       FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename`
  );

  const tableNames = tablesResult.rows.map((row) => row.tablename);
  if (tableNames.length === 0) {
    return;
  }

  const joined = tableNames.map((name) => `${quoteIdent('public')}.${quoteIdent(name)}`).join(', ');
  await client.query(`TRUNCATE TABLE ${joined} RESTART IDENTITY CASCADE`);
  console.log(`Truncated ${tableNames.length} tables`);
}

async function seedProblemTaxonomy(client: PoolClient): Promise<string[]> {
  const problemIds: string[] = [];

  for (const category of PROBLEM_STATEMENT_CATEGORIES) {
    const categoryResult = await client.query<{ id: string }>(
      `INSERT INTO problem_categories (name, slug, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name,
             sort_order = EXCLUDED.sort_order
       RETURNING id`,
      [category.name, category.slug, category.sort_order]
    );

    const categoryId = categoryResult.rows[0].id;
    for (const statement of PROBLEM_STATEMENTS.filter(
      (item) => item.category_slug === category.slug
    )) {
      const statementResult = await client.query<{ id: string }>(
        `INSERT INTO problem_statements (category_id, code, label, description, status, sort_order)
         VALUES ($1, $2, $3, NULL, 'active', $4)
         ON CONFLICT (code) DO UPDATE
           SET category_id = EXCLUDED.category_id,
               label = EXCLUDED.label,
               description = EXCLUDED.description,
               status = 'active',
               sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [categoryId, statement.code, statement.label, statement.sort_order]
      );
      problemIds.push(statementResult.rows[0].id);
    }
  }

  console.log(`Seeded ${PROBLEM_STATEMENT_CATEGORIES.length} problem categories`);
  console.log(`Seeded ${problemIds.length} problem statements`);
  return problemIds;
}

async function seedAdminUser(client: PoolClient): Promise<SeededUser> {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const result = await client.query<{ id: string }>(
    `INSERT INTO users (
      email,
      password_hash,
      full_name,
      platform_role,
      membership_status,
      is_demo_profile,
      profile_completed_at
    )
    VALUES ($1, $2, $3, 'admin', 'approved', false, NULL)
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          platform_role = 'admin',
          membership_status = 'approved',
          is_demo_profile = false,
          profile_completed_at = NULL
     RETURNING id`,
    [ADMIN_EMAIL, passwordHash, 'Kevin Chang']
  );
  console.log(`Seeded admin user: ${ADMIN_EMAIL}`);
  return {
    id: result.rows[0].id,
    email: ADMIN_EMAIL,
    fullName: 'Kevin Chang',
    platformRole: 'admin',
  };
}

function buildMockUser(index: number) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const role = ROLES[index % ROLES.length];
  const sequence = String(index + 1).padStart(3, '0');

  return {
    email: `mock.user.${sequence}@example.edu`,
    fullName: `${firstName} ${lastName}`,
    professionalRole: role,
    bio: `${role} focused on improving outcomes through data-informed decisions.`,
  };
}

async function seedMockUsers(client: PoolClient, problemIds: string[]): Promise<SeededUser[]> {
  if (problemIds.length === 0) {
    throw new Error('No problem statements available for mock-user seeding');
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const seededUsers: SeededUser[] = [];

  for (let i = 0; i < MOCK_USER_COUNT; i++) {
    const user = buildMockUser(i);
    const userResult = await client.query<{ id: string }>(
      `INSERT INTO users (
        email,
        password_hash,
        full_name,
        professional_role,
        bio,
        platform_role,
        membership_status,
        is_demo_profile,
        profile_completed_at
      )
      VALUES ($1, $2, $3, $4, $5, 'member', 'approved', false, now())
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            professional_role = EXCLUDED.professional_role,
            bio = EXCLUDED.bio,
            platform_role = 'member',
            membership_status = 'approved',
            is_demo_profile = false,
            profile_completed_at = COALESCE(users.profile_completed_at, now())
      RETURNING id`,
      [user.email, passwordHash, user.fullName, user.professionalRole, user.bio]
    );

    const userId = userResult.rows[0].id;
    const primaryProblemId = problemIds[i % problemIds.length];
    const secondaryProblemIdOne = problemIds[(i + 7) % problemIds.length];
    const secondaryProblemIdTwo = problemIds[(i + 19) % problemIds.length];

    await client.query(
      `INSERT INTO user_problem_selections (user_id, problem_statement_id, is_primary)
       VALUES ($1, $2, true)
       ON CONFLICT (user_id, problem_statement_id) DO UPDATE SET is_primary = true`,
      [userId, primaryProblemId]
    );

    const secondaryIds = [secondaryProblemIdOne, secondaryProblemIdTwo].filter(
      (id) => id !== primaryProblemId
    );
    for (const problemId of secondaryIds) {
      await client.query(
        `INSERT INTO user_problem_selections (user_id, problem_statement_id, is_primary)
         VALUES ($1, $2, false)
         ON CONFLICT (user_id, problem_statement_id) DO NOTHING`,
        [userId, problemId]
      );
    }

    seededUsers.push({
      id: userId,
      email: user.email,
      fullName: user.fullName,
      platformRole: 'member',
    });
  }

  console.log(`Seeded ${MOCK_USER_COUNT} mock users`);
  return seededUsers;
}

function printSeededUsers(seededUsers: SeededUser[]): void {
  console.log(`Created users (${seededUsers.length}):`);
  for (const [index, user] of seededUsers.entries()) {
    const sequence = String(index + 1).padStart(3, '0');
    console.log(
      `${sequence}. ${user.fullName} <${user.email}> [${user.platformRole}] id=${user.id}`
    );
  }
}

async function resetData() {
  const client = await pool.connect();
  try {
    console.log('Resetting data (truncate + reseed)...');
    await client.query('BEGIN');

    await truncateAllTables(client);
    const problemIds = await seedProblemTaxonomy(client);
    const adminUser = await seedAdminUser(client);
    const mockUsers = await seedMockUsers(client, problemIds);
    const seededUsers = [adminUser, ...mockUsers];

    await client.query('COMMIT');
    console.log('Reset complete.');
    console.log(`Admin login: ${ADMIN_EMAIL}`);
    console.log(`Seeded user password: ${ADMIN_PASSWORD}`);
    printSeededUsers(seededUsers);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetData().catch((error) => {
  console.error('Reset failed:', error);
  process.exit(1);
});
