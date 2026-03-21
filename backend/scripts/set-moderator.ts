#!/usr/bin/env tsx
/**
 * One-off: set platform_role = 'moderator' for a user by email.
 * Usage: npx tsx scripts/set-moderator.ts <email>
 */
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/set-moderator.ts <email>');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const result = await pool.query(
    `UPDATE users SET platform_role = 'moderator' WHERE email = $1 RETURNING id, email, platform_role`,
    [email]
  );
  if (result.rowCount === 0) {
    console.error(`No user found with email: ${email}`);
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
