#!/usr/bin/env tsx
/**
 * One-off: set platform_role = 'admin' for a user by email or name.
 * Usage: npx tsx scripts/set-admin.ts <email-or-name>
 */
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const query = process.argv[2];
if (!query) {
  console.error('Usage: npx tsx scripts/set-admin.ts <email-or-name>');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  // Match by email (exact) or full_name (case-insensitive partial)
  const result = await pool.query(
    `UPDATE users SET platform_role = 'admin'
     WHERE email ILIKE $1 OR full_name ILIKE $2
     RETURNING id, email, full_name, platform_role`,
    [query, `%${query}%`]
  );
  if (result.rowCount === 0) {
    console.error(`No user found matching: ${query}`);
    process.exit(1);
  }
  console.log('Updated:', result.rows[0]);
}

main()
  .finally(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
