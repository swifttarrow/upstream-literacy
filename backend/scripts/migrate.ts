import * as fs from 'fs';
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

const SCHEMA_DIR = path.resolve(__dirname, '../../schema');

const SQL_FILE_ORDER = [
  '01_extensions_enums.sql',
  '02_districts.sql',
  '03_users.sql',
  '04_district_attributes.sql',
  '05_taxonomy.sql',
  '06_user_problem_selections.sql',
  '06b_user_connections.sql',
  '07_conversations_messages.sql',
  '08_moderation.sql',
  '09_audit_notifications_ai.sql',
  '10_triggers.sql',
  '11_ingestion_console.sql',
];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');

    for (const filename of SQL_FILE_ORDER) {
      const filepath = path.join(SCHEMA_DIR, filename);
      if (!fs.existsSync(filepath)) {
        console.warn(`  SKIP: ${filename} (file not found)`);
        continue;
      }

      const sql = fs.readFileSync(filepath, 'utf-8');
      console.log(`  Running: ${filename}`);

      // Split on statement boundaries and run each statement
      // This handles the fact that some statements can't be in transactions
      const statements = splitSql(sql);

      for (const stmt of statements) {
        // Strip leading comment/blank lines so "-- comment\nCREATE TABLE..." is not skipped
        const trimmed = stmt
          .trim()
          .split('\n')
          .filter((line) => {
            const t = line.trim();
            return t && !t.startsWith('--');
          })
          .join('\n')
          .trim();
        if (!trimmed) continue;
        try {
          await client.query(trimmed);
        } catch (err: unknown) {
          const error = err as { code?: string; message?: string };
          // Ignore "already exists" errors for idempotency
          if (
            error.code === '42710' || // duplicate_object (type already exists)
            error.code === '42P07' || // duplicate_table
            error.code === '42701' || // duplicate_column
            error.code === '42P16' || // invalid_table_definition
            (error.message && error.message.includes('already exists'))
          ) {
            // Idempotent: skip
            continue;
          }
          throw err;
        }
      }

      console.log(`  OK: ${filename}`);
    }

    console.log('Migration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Split SQL text into individual statements.
 * Handles dollar-quoted strings (used in PL/pgSQL functions).
 */
function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  let inDollarQuote = false;
  let dollarTag = '';

  while (i < sql.length) {
    // Check for dollar-quote start/end
    if (!inDollarQuote && sql[i] === '$') {
      const tagEnd = sql.indexOf('$', i + 1);
      if (tagEnd !== -1) {
        const tag = sql.slice(i, tagEnd + 1);
        if (/^\$[A-Za-z0-9_]*\$$/.test(tag)) {
          inDollarQuote = true;
          dollarTag = tag;
          current += sql.slice(i, tagEnd + 1);
          i = tagEnd + 1;
          continue;
        }
      }
    } else if (inDollarQuote && sql[i] === '$') {
      const tagEnd = sql.indexOf('$', i + 1);
      if (tagEnd !== -1) {
        const tag = sql.slice(i, tagEnd + 1);
        if (tag === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
          current += sql.slice(i, tagEnd + 1);
          i = tagEnd + 1;
          continue;
        }
      }
    }

    if (!inDollarQuote && sql[i] === ';') {
      current += ';';
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = '';
      i++;
    } else {
      current += sql[i];
      i++;
    }
  }

  const trimmed = current.trim();
  if (trimmed) {
    statements.push(trimmed);
  }

  return statements;
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
