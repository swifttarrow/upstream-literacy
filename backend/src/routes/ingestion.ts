import crypto from 'crypto';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import csv from 'csv-parser';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireModerator } from '../middleware/requireModerator.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  createIngestionJob,
  getJobWithRecords,
  getRecentJobs,
  processIngestionJob,
} from '../services/ingestion.js';
import { sendIngestionJob } from '../jobs/ingestion-worker.js';
import { insertAuditLog } from '../services/audit.js';
import { getPresignedPutUrl, getObjectStream, isS3Configured } from '../lib/s3.js';

/** Parse a single CSV line respecting quoted fields (handles commas inside quotes). */
function parseCsvLine(line: string, delim = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === delim) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

// CSV parser: returns array of row objects keyed by header. Handles quoted fields, BOM, and tab delimiter.
function parseCsv(text: string): Record<string, string>[] {
  const cleaned = text.replace(/\uFEFF/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleaned.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = lines[0].includes('\t') && !lines[0].includes(',') ? '\t' : ',';
  const headers = parseCsvLine(lines[0], delim).map((h) => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line, delim);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

// Get value by trying multiple column name variants (case-insensitive, ignores underscores/dashes)
function getCol(row: Record<string, string>, ...names: string[]): string {
  const normalize = (s: string) => s.toUpperCase().replace(/[-_\s]/g, '');
  const normNames = new Set(names.map(normalize));
  for (const key of Object.keys(row)) {
    if (normNames.has(normalize(key))) return row[key] ?? '';
  }
  return '';
}

// Detect the LEAID column across NCES file variants (LEAID, LEA_ID, NCESID, etc.)
function detectLeaid(row: Record<string, string>): string | undefined {
  const val = getCol(row, 'LEAID', 'LEA_ID', 'NCESID', 'LEA_ID_NUM');
  return val && val.trim() ? val.trim() : undefined;
}

/** Normalize LEAID for consistent join: strip hyphens, pad to 7 digits. CCD and EDGE may use different formats. */
function normalizeLeaid(leaid: string): string {
  const digits = leaid.replace(/[^0-9]/g, '');
  return digits.padStart(7, '0').slice(0, 7);
}

/** Stream-parse CSV from R2 into array of rows. */
async function streamCsvToRows(stream: Readable): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  await pipeline(
    stream,
    csv(),
    new Writable({
      objectMode: true,
      write(row: Record<string, string>, _enc, cb) {
        rows.push(row);
        cb();
      },
    })
  );
  return rows;
}

/** Enrollment column names: CCD Directory has none; CCD Membership has LEA_ENR, TOTAL, STUDENT_COUNT, etc. */
const ENROLLMENT_COLS = ['LEA_ENR', 'MEMBER', 'ENROLLMENT', 'TOTAL', 'TOTMENROL', 'MEMBERSHIP', 'TOTAL_IND', 'STUDENT_COUNT'];
const EL_COLS = ['EL', 'ELL', 'LEP', 'ENGLISH_LEARNERS', 'EL_COUNT', 'SCH_ENR_EL'];
const FRL_TOTAL_COLS = ['FRL', 'FRL_COUNT', 'TOTAL_FRL', 'FRPL', 'NSLP'];
const FRL_FREE_COLS = ['FREE_LUNCH', 'FREE_LUNCH_COUNT', 'FRELCH', 'SCH_FREE_LUNCH'];
const FRL_REDUCED_COLS = ['REDUCED_LUNCH', 'REDUCED_LUNCH_COUNT', 'REDLCH', 'SCH_REDUCED_LUNCH'];

function getEnrollment(row: Record<string, string>): number | null {
  const str = getCol(row, ...ENROLLMENT_COLS);
  if (!str?.trim()) return null;
  const n = parseInt(str.replace(/,/g, ''), 10);
  return !isNaN(n) && n >= 0 ? n : null;
}

function getCountFromCols(row: Record<string, string>, names: string[]): number | null {
  const raw = getCol(row, ...names);
  if (!raw?.trim()) return null;
  const n = parseInt(raw.replace(/,/g, ''), 10);
  return !isNaN(n) && n >= 0 ? n : null;
}

interface MembershipMetrics {
  enrollmentMap: Map<string, number>;
  frlPctMap: Map<string, number>;
  elPctMap: Map<string, number>;
  rowsParsed: number;
}

function finalizeMembershipTotals(
  totals: Map<string, { enrollment: number; frl: number; el: number }>,
  rowsParsed: number
): MembershipMetrics {
  const enrollmentMap = new Map<string, number>();
  const frlPctMap = new Map<string, number>();
  const elPctMap = new Map<string, number>();

  for (const [leaid, t] of totals.entries()) {
    if (t.enrollment <= 0) continue;
    enrollmentMap.set(leaid, t.enrollment);
    if (t.frl > 0) frlPctMap.set(leaid, Math.min(100, (t.frl / t.enrollment) * 100));
    if (t.el > 0) elPctMap.set(leaid, Math.min(100, (t.el / t.enrollment) * 100));
  }

  return { enrollmentMap, frlPctMap, elPctMap, rowsParsed };
}

function applyMembershipRow(
  totals: Map<string, { enrollment: number; frl: number; el: number }>,
  row: Record<string, string>
): void {
  const leaid = detectLeaid(row);
  const enrollment = getEnrollment(row);
  if (!leaid || enrollment == null || enrollment <= 0) return;

  const norm = normalizeLeaid(leaid);
  const entry = totals.get(norm) ?? { enrollment: 0, frl: 0, el: 0 };
  entry.enrollment += enrollment;

  const el = getCountFromCols(row, EL_COLS);
  if (el != null) entry.el += el;

  const frlTotal = getCountFromCols(row, FRL_TOTAL_COLS);
  if (frlTotal != null) {
    entry.frl += frlTotal;
  } else {
    const free = getCountFromCols(row, FRL_FREE_COLS) ?? 0;
    const reduced = getCountFromCols(row, FRL_REDUCED_COLS) ?? 0;
    entry.frl += free + reduced;
  }

  totals.set(norm, entry);
}

function buildMembershipMetrics(rows: Record<string, string>[]): MembershipMetrics {
  const totals = new Map<string, { enrollment: number; frl: number; el: number }>();

  for (const row of rows) {
    applyMembershipRow(totals, row);
  }

  return finalizeMembershipTotals(totals, rows.length);
}

async function buildMembershipMetricsFromStream(stream: Readable): Promise<MembershipMetrics> {
  const totals = new Map<string, { enrollment: number; frl: number; el: number }>();
  let rowsParsed = 0;
  await pipeline(
    stream,
    csv(),
    new Writable({
      objectMode: true,
      write(row: Record<string, string>, _enc, cb) {
        rowsParsed++;
        try {
          applyMembershipRow(totals, row);
          cb();
        } catch (err) {
          cb(err as Error);
        }
      },
    })
  );
  return finalizeMembershipTotals(totals, rowsParsed);
}

const KNOWN_LAT_COLS = ['LAT', 'LATY', 'LATITUDE', 'Y', 'POINT_Y', 'LAT1516', 'LAT1617', 'LAT1718', 'LAT1819'];
const KNOWN_LON_COLS = ['LON', 'LONY', 'LONGITUDE', 'X', 'POINT_X', 'LON1516', 'LON1617', 'LON1718', 'LON1819'];
const KNOWN_LOCALE_COLS = ['LOCALE', 'LOCALE_CD', 'LOCALE17', 'LOCALE15', 'LCITY15'];

/** District size from enrollment: Small <2,500, Medium 2,500–10,000, Large 10,000–25,000, XL 25,000+ */
function deriveDistrictSizeFromEnrollment(enrollment: number | null): string {
  if (enrollment == null || enrollment < 0) return 'unknown';
  if (enrollment < 2500) return 'small';
  if (enrollment < 10000) return 'medium';
  if (enrollment < 25000) return 'large';
  return 'xl';
}

/** NCES urban-centric locale: 11-13 City, 21-23 Suburb, 31-33 Town, 41-43 Rural */
function deriveLocaleFromCode(code: string | null): {
  locale_code: string | null;
  locale_type: string | null;
  locale_subtype: string | null;
  locale_size: string | null;
} {
  if (!code?.trim()) {
    return { locale_code: null, locale_type: null, locale_subtype: null, locale_size: null };
  }
  const num = parseInt(code.replace(/\D/g, ''), 10);
  if (isNaN(num) || num < 11 || num > 43) {
    return { locale_code: code.trim(), locale_type: null, locale_subtype: null, locale_size: null };
  }
  const tens = Math.floor(num / 10);
  const ones = num % 10;
  const typeMap: Record<number, string> = { 1: 'City', 2: 'Suburb', 3: 'Town', 4: 'Rural' };
  const locale_type = typeMap[tens] ?? null;
  const subtypeByOnes: Record<number, string> = {
    1: 'Large', 2: 'Midsize', 3: 'Small',
  };
  const subtypeByOnesTownRural: Record<number, string> = {
    1: 'Fringe', 2: 'Distant', 3: 'Remote',
  };
  const locale_subtype =
    tens <= 2 ? subtypeByOnes[ones] ?? null : subtypeByOnesTownRural[ones] ?? null;
  const sizeMap: Record<number, string> = { 1: 'Large', 2: 'Medium', 3: 'Small' };
  const locale_size =
    tens <= 2 && ones >= 1 && ones <= 3 ? sizeMap[ones] ?? null : null;
  return {
    locale_code: String(num).padStart(2, '0'),
    locale_type,
    locale_subtype,
    locale_size: locale_size ?? null,
  };
}

/** Get lat/lon from row. If known columns fail, auto-detect by scanning for numeric values in valid ranges. */
function getLatLon(
  row: Record<string, string>,
  edgeColumns: string[],
  sampleRows: Record<string, string>[]
): { lat: string; lon: string } | null {
  const latStr = getCol(row, ...KNOWN_LAT_COLS);
  const lonStr = getCol(row, ...KNOWN_LON_COLS);
  if (latStr && lonStr) return { lat: latStr, lon: lonStr };

  // Auto-detect: find columns with values in lat (-90 to 90) and lon (-180 to 180) ranges.
  // Prefer columns whose names suggest coordinates; avoid ID-like columns (LEAID, FIPS, etc.).
  const skipCols = new Set(['LEAID', 'LEA_ID', 'NCESID', 'STFIP', 'OPSTFIPS', 'CNTY', 'OBJECTID']);
  const rowsToCheck = [row, ...sampleRows].slice(0, 5);
  let bestLat: { col: string; score: number } | null = null;
  let bestLon: { col: string; score: number } | null = null;

  for (const col of edgeColumns) {
    const key = col.toUpperCase().replace(/[-_\s]/g, '');
    if (skipCols.has(col) || skipCols.has(key)) continue;
    const vals = rowsToCheck.map((r) => parseFloat(String(r[col] ?? '').trim()));
    if (vals.length === 0 || vals.some((v) => isNaN(v))) continue;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const hasDecimals = vals.some((v) => v !== Math.floor(v));
    const nameScore = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('lat') || n === 'y') return 2;
      if (n.includes('lon') || n === 'x') return 2;
      return hasDecimals ? 1 : 0; // Prefer columns with decimals (coords) over integers (IDs)
    };
    if (min >= -90 && max <= 90 && (!bestLat || nameScore(col) > bestLat.score)) {
      bestLat = { col, score: nameScore(col) };
    }
    if (min >= -180 && max <= 180 && (!bestLon || nameScore(col) > bestLon.score)) {
      bestLon = { col, score: nameScore(col) };
    }
  }
  if (bestLat && bestLon && bestLat.col !== bestLon.col) {
    return { lat: String(row[bestLat.col] ?? '').trim(), lon: String(row[bestLon.col] ?? '').trim() };
  }
  return null;
}

const candidateFilterSchema = z.object({
  search: z.string().optional(),
  state: z.string().optional(),
  status: z.string().optional(),
  district_size: z.enum(['small', 'medium', 'large', 'xl']).optional(),
  locale_type: z.enum(['City', 'Suburb', 'Town', 'Rural']).optional(),
  locale_subtype: z.enum(['Large', 'Midsize', 'Small', 'Fringe', 'Distant', 'Remote']).optional(),
  nces_year: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const mapFilterSchema = z.object({
  search: z.string().optional(),
  state: z.string().optional(),
  status: z.string().optional(),
  district_size: z.enum(['small', 'medium', 'large', 'xl']).optional(),
  locale_type: z.enum(['City', 'Suburb', 'Town', 'Rural']).optional(),
  locale_subtype: z.enum(['Large', 'Midsize', 'Small', 'Fringe', 'Distant', 'Remote']).optional(),
  nces_year: z.string().optional(),
});

const triggerSchema = z.object({
  district_ids: z.array(z.string().uuid()).min(1).max(100),
  confirm: z.boolean().optional(),
});

// Data quality rules: fields required for ingestion readiness
const REQUIRED_FIELDS = ['name', 'state', 'nces_district_id'];
const RECOMMENDED_FIELDS = ['district_size'];

function assessDataQuality(candidate: Record<string, unknown>): {
  status: 'ready' | 'warning' | 'blocked';
  missing_required: string[];
  missing_recommended: string[];
} {
  const missingRequired = REQUIRED_FIELDS.filter((f) => !candidate[f]);
  const missingRecommended = RECOMMENDED_FIELDS.filter((f) => !candidate[f]);

  if (missingRequired.length > 0) {
    return { status: 'blocked', missing_required: missingRequired, missing_recommended: missingRecommended };
  }
  if (missingRecommended.length > 0) {
    return { status: 'warning', missing_required: [], missing_recommended: missingRecommended };
  }
  return { status: 'ready', missing_required: [], missing_recommended: [] };
}

export default async function ingestionRoutes(fastify: FastifyInstance) {
  // GET /admin/ingestion/candidates
  fastify.get(
    '/admin/ingestion/candidates',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const parsed = candidateFilterSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { search, state, status, district_size, locale_type, locale_subtype, nces_year, page, limit } = parsed.data;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (search) {
        conditions.push(`dc.name ILIKE $${idx++}`);
        values.push(`%${search}%`);
      }
      if (state) {
        conditions.push(`dc.state ILIKE $${idx++}`);
        values.push(`%${state}%`);
      }
      if (status) {
        conditions.push(`dc.status = $${idx++}`);
        values.push(status);
      }
      if (district_size) {
        conditions.push(`dc.district_size = $${idx++}`);
        values.push(district_size);
      }
      if (locale_type) {
        conditions.push(`dc.locale_type = $${idx++}`);
        values.push(locale_type);
      }
      if (locale_subtype) {
        conditions.push(`dc.locale_subtype = $${idx++}`);
        values.push(locale_subtype);
      }
      if (nces_year) {
        conditions.push(`dc.nces_year = $${idx++}`);
        values.push(nces_year);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM district_candidates dc ${where}`,
        values
      );
      const total = parseInt(countResult.rows[0].count);

      values.push(limit, offset);
      const result = await pool.query(
        `SELECT dc.id, dc.nces_district_id, dc.name, dc.state, dc.district_size,
                dc.locale_code, dc.locale_type, dc.locale_subtype, dc.locale_size,
                dc.status, dc.missing_data_indicator, dc.last_refresh_at,
                dc.frl_pct, dc.el_pct,
                dc.district_id, dc.enrollment, dc.nces_year, dc.created_at,
                (dc.latitude IS NULL OR dc.longitude IS NULL) AS missing_coordinates
         FROM district_candidates dc
         ${where}
         ORDER BY dc.name
         LIMIT $${idx++} OFFSET $${idx++}`,
        values
      );

      return reply.send({
        candidates: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }
  );

  // GET /admin/ingestion/summary
  fastify.get(
    '/admin/ingestion/summary',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { nces_year } = (request.query as { nces_year?: string }) || {};

      const result = nces_year
        ? await pool.query(
            `SELECT
               COUNT(*) FILTER (WHERE status = 'not_ingested') AS not_ingested,
               COUNT(*) FILTER (WHERE status = 'ready_to_ingest') AS ready_to_ingest,
               COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
               COUNT(*) FILTER (WHERE status = 'ingested') AS ingested,
               COUNT(*) FILTER (WHERE status = 'ingested_with_warnings') AS ingested_with_warnings,
               COUNT(*) FILTER (WHERE status = 'failed') AS failed,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS with_coordinates,
               COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS without_coordinates
             FROM district_candidates
             WHERE nces_year = $1`,
            [nces_year]
          )
        : await pool.query(
            `SELECT
               COUNT(*) FILTER (WHERE status = 'not_ingested') AS not_ingested,
               COUNT(*) FILTER (WHERE status = 'ready_to_ingest') AS ready_to_ingest,
               COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
               COUNT(*) FILTER (WHERE status = 'ingested') AS ingested,
               COUNT(*) FILTER (WHERE status = 'ingested_with_warnings') AS ingested_with_warnings,
               COUNT(*) FILTER (WHERE status = 'failed') AS failed,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS with_coordinates,
               COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS without_coordinates
             FROM district_candidates`
          );

      const yearsResult = await pool.query(
        `SELECT DISTINCT nces_year FROM district_candidates WHERE nces_year IS NOT NULL ORDER BY nces_year DESC`
      );
      const nces_years = yearsResult.rows.map((r) => r.nces_year as string);

      const jobs = await getRecentJobs(5);

      return reply.send({ summary: result.rows[0], recent_jobs: jobs, nces_years });
    }
  );

  // GET /admin/ingestion/map-data
  fastify.get(
    '/admin/ingestion/map-data',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const parsed = mapFilterSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { search, state, status, district_size, locale_type, locale_subtype, nces_year } = parsed.data;

      const conditions: string[] = ['dc.latitude IS NOT NULL', 'dc.longitude IS NOT NULL'];
      const values: unknown[] = [];
      let idx = 1;

      if (search) {
        conditions.push(`dc.name ILIKE $${idx++}`);
        values.push(`%${search}%`);
      }
      if (state) {
        conditions.push(`dc.state ILIKE $${idx++}`);
        values.push(`%${state}%`);
      }
      if (status) {
        conditions.push(`dc.status = $${idx++}`);
        values.push(status);
      }
      if (district_size) {
        conditions.push(`dc.district_size = $${idx++}`);
        values.push(district_size);
      }
      if (locale_type) {
        conditions.push(`dc.locale_type = $${idx++}`);
        values.push(locale_type);
      }
      if (locale_subtype) {
        conditions.push(`dc.locale_subtype = $${idx++}`);
        values.push(locale_subtype);
      }
      if (nces_year) {
        conditions.push(`dc.nces_year = $${idx++}`);
        values.push(nces_year);
      }

      const where = `WHERE ${conditions.join(' AND ')}`;

      // Count total matching (with coords) for accurate "missing" display
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM district_candidates dc ${where}`,
        values.slice(0, idx - 1)
      );
      const totalWithCoordinates = parseInt(countResult.rows[0].count);

      values.push(500);
      const result = await pool.query(
        `SELECT dc.id, dc.name, dc.state, dc.status, dc.latitude, dc.longitude
         FROM district_candidates dc
         ${where}
         ORDER BY dc.name
         LIMIT $${idx++}`,
        values
      );

      return reply.send({ districts: result.rows, total_with_coordinates: totalWithCoordinates });
    }
  );

  // GET /admin/ingestion/jobs
  fastify.get(
    '/admin/ingestion/jobs',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { limit = '20' } = request.query as { limit?: string };
      const jobs = await getRecentJobs(Math.min(parseInt(limit), 50));
      return reply.send({ jobs });
    }
  );

  // GET /admin/ingestion/jobs/:jobId
  fastify.get(
    '/admin/ingestion/jobs/:jobId',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      const data = await getJobWithRecords(jobId);
      if (!data) return reply.status(404).send({ error: 'job_not_found' });
      return reply.send(data);
    }
  );

  // GET /admin/ingestion/candidates/:id/preview
  fastify.get(
    '/admin/ingestion/candidates/:id/preview',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.jwtUser!.userId;

      const candidateResult = await pool.query(
        'SELECT * FROM district_candidates WHERE id = $1',
        [id]
      );
      if (candidateResult.rows.length === 0) {
        return reply.status(404).send({ error: 'candidate_not_found' });
      }
      const candidate = candidateResult.rows[0];

      // If already ingested, fetch existing district attributes
      let existingAttributes: unknown[] = [];
      if (candidate.district_id) {
        const attrsResult = await pool.query(
          `SELECT dav.value_text, dav.value_number, dav.provenance, dav.updated_at,
                  dad.key, dad.label, dad.value_type
           FROM district_effective_attribute_values dav
           JOIN district_attribute_definitions dad ON dad.id = dav.definition_id
           WHERE dav.district_id = $1
           ORDER BY dad.sort_order`,
          [candidate.district_id]
        );
        existingAttributes = attrsResult.rows;
      }

      const quality = assessDataQuality(candidate);
      const missingCoordinates =
        candidate.latitude == null || candidate.longitude == null;
      const missingFields = [
        ...quality.missing_required,
        ...quality.missing_recommended,
        ...(missingCoordinates ? ['coordinates'] : []),
      ];

      // Log preview audit
      await insertAuditLog(userId, 'ingestion_preview_viewed', 'district_candidate', id, {
        candidate_name: candidate.name,
      });

      return reply.send({
        candidate: {
          ...candidate,
          missing_coordinates: missingCoordinates,
        },
        quality,
        existing_attributes: existingAttributes,
        source_metadata: {
          source: 'nces_seed',
          nces_district_id: candidate.nces_district_id,
          last_refresh_at: candidate.last_refresh_at,
        },
        normalized: {
          name: candidate.name,
          state: candidate.state,
          district_size: candidate.district_size,
          nces_district_id: candidate.nces_district_id,
        },
        missing_fields: missingFields,
      });
    }
  );

  // POST /admin/ingestion/trigger
  fastify.post(
    '/admin/ingestion/trigger',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const parsed = triggerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { district_ids, confirm } = parsed.data;
      const userId = request.jwtUser!.userId;

      // Batch (>10) requires confirm:true
      if (district_ids.length > 10 && !confirm) {
        return reply.status(400).send({
          error: 'confirmation_required',
          message: `Batch ingestion of ${district_ids.length} districts requires confirm: true`,
        });
      }

      // Check no district is already in_progress
      const inProgressResult = await pool.query(
        `SELECT dc.id, dc.name FROM district_candidates dc
         WHERE dc.id = ANY($1::uuid[]) AND dc.status = 'in_progress'`,
        [district_ids]
      );
      if (inProgressResult.rows.length > 0) {
        const names = inProgressResult.rows.map((r) => r.name).join(', ');
        return reply.status(409).send({
          error: 'already_in_progress',
          message: `Ingestion already active for: ${names}`,
          districts: inProgressResult.rows,
        });
      }

      // Verify all candidate ids exist
      const candidatesResult = await pool.query(
        'SELECT id FROM district_candidates WHERE id = ANY($1::uuid[])',
        [district_ids]
      );
      if (candidatesResult.rows.length !== district_ids.length) {
        return reply.status(400).send({ error: 'invalid_candidate_ids' });
      }

      // Create job
      const jobId = await createIngestionJob({ candidateIds: district_ids, createdBy: userId });

      // Mark candidates as in_progress
      await pool.query(
        `UPDATE district_candidates SET status = 'in_progress', updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [district_ids]
      );

      // Audit
      await insertAuditLog(userId, 'ingestion_started', 'district_ingestion_job', jobId, {
        district_ids,
        total_count: district_ids.length,
      });

      // Enqueue via pg-boss for durability; fallback to direct processing if worker not started
      const queued = await sendIngestionJob(jobId);
      if (!queued) {
        processIngestionJob(jobId).catch((err) => {
          console.error(`Ingestion job ${jobId} failed:`, err);
        });
      }

      return reply.status(201).send({ job_id: jobId, total_count: district_ids.length });
    }
  );

  // POST /admin/ingestion/jobs/:jobId/retry
  fastify.post(
    '/admin/ingestion/jobs/:jobId/retry',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      const userId = request.jwtUser!.userId;
      const { district_ids } = (request.body as { district_ids?: string[] }) ?? {};

      // Get eligible failed records
      let eligibleQuery = `
        SELECT r.candidate_id FROM district_ingestion_job_records r
        WHERE r.job_id = $1 AND r.status = 'failed' AND r.retry_eligible = true`;
      const queryValues: unknown[] = [jobId];
      if (district_ids && district_ids.length > 0) {
        eligibleQuery += ` AND r.candidate_id = ANY($2::uuid[])`;
        queryValues.push(district_ids);
      }

      const eligibleResult = await pool.query(eligibleQuery, queryValues);
      if (eligibleResult.rows.length === 0) {
        return reply.status(400).send({ error: 'no_eligible_records', message: 'No retry-eligible failed records found' });
      }

      const candidateIds = eligibleResult.rows.map((r) => r.candidate_id);
      const retryJobId = await createIngestionJob({ candidateIds, createdBy: userId });

      await pool.query(
        `UPDATE district_candidates SET status = 'in_progress', updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [candidateIds]
      );

      await insertAuditLog(userId, 'ingestion_retried', 'district_ingestion_job', retryJobId, {
        parent_job_id: jobId,
        retry_count: candidateIds.length,
      });

      const queued = await sendIngestionJob(retryJobId);
      if (!queued) {
        processIngestionJob(retryJobId).catch((err) => {
          console.error(`Retry job ${retryJobId} failed:`, err);
        });
      }

      return reply.status(201).send({ job_id: retryJobId, total_count: candidateIds.length });
    }
  );

  // PATCH /admin/ingestion/districts/:districtId — post-ingestion edit (create overrides)
  const editSchema = z.object({
    fields: z.array(
      z.object({
        key: z.string(),
        value_text: z.string().optional().nullable(),
        value_number: z.number().optional().nullable(),
      })
    ).min(1),
    reason: z.string().optional(),
  });

  fastify.patch(
    '/admin/ingestion/districts/:districtId',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { districtId } = request.params as { districtId: string };
      const parsed = editSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }
      const { fields, reason } = parsed.data;
      const userId = request.jwtUser!.userId;

      const districtCheck = await pool.query('SELECT id FROM districts WHERE id = $1', [districtId]);
      if (districtCheck.rows.length === 0) {
        return reply.status(404).send({ error: 'district_not_found' });
      }

      // Fetch definition IDs for requested keys
      const keys = fields.map((f) => f.key);
      const defsResult = await pool.query(
        'SELECT id, key FROM district_attribute_definitions WHERE key = ANY($1::text[])',
        [keys]
      );
      const defMap = new Map<string, string>(defsResult.rows.map((r) => [r.key, r.id]));

      const missing = keys.filter((k) => !defMap.has(k));
      if (missing.length > 0) {
        return reply.status(400).send({ error: 'unknown_fields', fields: missing });
      }

      const client = await pool.connect();
      const overrides = [];
      try {
        await client.query('BEGIN');
        for (const field of fields) {
          const definitionId = defMap.get(field.key)!;
          const overrideResult = await client.query(
            `INSERT INTO district_admin_overrides
             (district_id, definition_id, value_text, value_number, admin_user_id, reason)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [districtId, definitionId, field.value_text ?? null, field.value_number ?? null, userId, reason ?? null]
          );
          const override = overrideResult.rows[0];
          overrides.push(override);

          await client.query(
            `INSERT INTO district_effective_attribute_values
             (district_id, definition_id, value_text, value_number, provenance, last_override_id, updated_at)
             VALUES ($1, $2, $3, $4, 'override', $5, now())
             ON CONFLICT (district_id, definition_id)
             DO UPDATE SET
               value_text = EXCLUDED.value_text,
               value_number = EXCLUDED.value_number,
               provenance = 'override',
               last_override_id = EXCLUDED.last_override_id,
               updated_at = now()`,
            [districtId, definitionId, field.value_text ?? null, field.value_number ?? null, override.id]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      await insertAuditLog(userId, 'district_edited', 'district', districtId, {
        fields: fields.map((f) => f.key),
        reason,
      });

      return reply.send({ overrides });
    }
  );

  // DELETE /admin/ingestion/districts/:districtId/overrides/:fieldKey — revert to source value
  fastify.delete(
    '/admin/ingestion/districts/:districtId/overrides/:fieldKey',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { districtId, fieldKey } = request.params as { districtId: string; fieldKey: string };
      const userId = request.jwtUser!.userId;

      const defResult = await pool.query(
        'SELECT id FROM district_attribute_definitions WHERE key = $1',
        [fieldKey]
      );
      if (defResult.rows.length === 0) {
        return reply.status(404).send({ error: 'field_not_found' });
      }
      const definitionId = defResult.rows[0].id;

      // Find the most recent ingest event for this district to restore
      const ingestResult = await pool.query(
        `SELECT die.id, die.normalized_attributes
         FROM district_ingestion_events die
         WHERE die.district_id = $1
         ORDER BY die.ingested_at DESC
         LIMIT 1`,
        [districtId]
      );

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        if (ingestResult.rows.length > 0) {
          const event = ingestResult.rows[0];
          const attrs = event.normalized_attributes as Record<string, unknown>;
          const sourceValue = attrs[fieldKey];
          const isNum = typeof sourceValue === 'number';

          await client.query(
            `UPDATE district_effective_attribute_values
             SET value_text = $1,
                 value_number = $2,
                 provenance = 'ingest',
                 last_ingestion_event_id = $3,
                 last_override_id = NULL,
                 updated_at = now()
             WHERE district_id = $4 AND definition_id = $5`,
            [
              isNum ? null : sourceValue != null ? String(sourceValue) : null,
              isNum ? sourceValue : null,
              event.id,
              districtId,
              definitionId,
            ]
          );
        } else {
          // No ingest event; delete effective value entirely
          await client.query(
            'DELETE FROM district_effective_attribute_values WHERE district_id = $1 AND definition_id = $2',
            [districtId, definitionId]
          );
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      await insertAuditLog(userId, 'override_reverted', 'district', districtId, { field_key: fieldKey });

      return reply.send({ reverted: true, field_key: fieldKey });
    }
  );

  // GET /admin/ingestion/audit
  fastify.get(
    '/admin/ingestion/audit',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { district_id, actor_id, from, to, limit = '50' } = request.query as Record<string, string>;

      const conditions: string[] = [`a.entity_type IN ('district_candidate', 'district_ingestion_job', 'district')`];
      const values: unknown[] = [];
      let idx = 1;

      if (district_id) {
        conditions.push(`a.entity_id = $${idx++}`);
        values.push(district_id);
      }
      if (actor_id) {
        conditions.push(`a.actor_user_id = $${idx++}`);
        values.push(actor_id);
      }
      if (from) {
        conditions.push(`a.created_at >= $${idx++}`);
        values.push(from);
      }
      if (to) {
        conditions.push(`a.created_at <= $${idx++}`);
        values.push(to);
      }

      values.push(Math.min(parseInt(limit), 200));
      const result = await pool.query(
        `SELECT a.*, u.full_name AS actor_name
         FROM audit_log_entries a
         LEFT JOIN users u ON u.id = a.actor_user_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY a.created_at DESC
         LIMIT $${idx++}`,
        values
      );

      return reply.send({ audit_entries: result.rows });
    }
  );

  // POST /admin/ingestion/upload-url — get presigned URL for direct S3/R2 upload (all files go through R2)
  const uploadUrlSchema = z.object({
    purpose: z.enum(['ccd', 'edge', 'district_enrollment', 'school_membership']),
    filename: z.string().min(1),
  });
  fastify.post(
    '/admin/ingestion/upload-url',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      if (!isS3Configured()) {
        return reply.status(503).send({
          error: 's3_not_configured',
          message: 'Cloud storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (and S3_ENDPOINT for R2).',
        });
      }
      const parsed = uploadUrlSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }
      const { purpose, filename } = parsed.data;
      const ext = filename.toLowerCase().endsWith('.csv') ? '' : '.csv';
      const key = `ingestion/${purpose}/${crypto.randomUUID()}${ext}`;
      const uploadUrl = await getPresignedPutUrl(key, { contentType: 'text/csv', expiresIn: 3600 });
      if (!uploadUrl) {
        return reply.status(500).send({ error: 'presign_failed', message: 'Failed to generate upload URL' });
      }
      return reply.send({ uploadUrl, objectKey: key, expiresIn: 3600 });
    }
  );

  // POST /admin/ingestion/process-membership — stream parse district enrollment file and update candidates
  const processMembershipSchema = z.object({
    objectKey: z.string().min(1).refine(
      (v) => v.startsWith('ingestion/district_enrollment/') || v.startsWith('ingestion/membership/'),
      { message: 'objectKey must be under ingestion/district_enrollment/' }
    ),
  });
  fastify.post(
    '/admin/ingestion/process-membership',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const parsed = processMembershipSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }
      const { objectKey } = parsed.data;
      const stream = await getObjectStream(objectKey);
      if (!stream) {
        return reply.status(400).send({
          error: 's3_not_configured_or_missing',
          message: 'S3 is not configured or the file was not found. Ensure the upload completed successfully.',
        });
      }
      const errors: string[] = [];
      let rowCount = 0;
      let enrollmentMap = new Map<string, number>();
      try {
        const metrics = await buildMembershipMetricsFromStream(stream);
        rowCount = metrics.rowsParsed;
        enrollmentMap = metrics.enrollmentMap;
      } catch (err) {
        return reply.status(500).send({
          error: 'parse_error',
          message: (err as Error).message,
          rows_parsed: rowCount,
        });
      }
      if (enrollmentMap.size === 0) {
        return reply.status(400).send({
          error: 'no_enrollment_data',
          message: `Parsed ${rowCount} rows but found no LEAID+enrollment pairs. Check file format (expect LEAID/LEA_ID and LEA_ENR/MEMBER/TOTAL).`,
        });
      }
      const BATCH_SIZE = 500;
      const entries = [...enrollmentMap.entries()];
      let updated = 0;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const sets = batch.map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`).join(', ');
        const values = batch.flatMap(([leaid, enr]) => [leaid, enr]);
        const result = await pool.query(
          `UPDATE district_candidates dc SET
             enrollment = v.enr,
             district_size = CASE
               WHEN v.enr IS NULL OR v.enr < 0 THEN 'unknown'
               WHEN v.enr < 2500 THEN 'small'
               WHEN v.enr < 10000 THEN 'medium'
               WHEN v.enr < 25000 THEN 'large'
               ELSE 'xl'
             END,
             updated_at = now()
           FROM (VALUES ${sets}) AS v(nces_district_id, enr)
           WHERE dc.nces_district_id = v.nces_district_id`,
          values
        );
        updated += result.rowCount ?? 0;
      }
      await insertAuditLog(userId, 'membership_processed', 'ingestion', objectKey, {
        rows_parsed: rowCount,
        enrollment_extracted: enrollmentMap.size,
        districts_updated: updated,
      });
      return reply.send({
        rows_parsed: rowCount,
        enrollment_extracted: enrollmentMap.size,
        districts_updated: updated,
        parse_errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      });
    }
  );

  // POST /admin/ingestion/process-upload — full ingestion from R2 using 4 files
  const processUploadSchema = z.object({
    ccd_object_key: z.string().min(1).startsWith('ingestion/ccd/'),
    edge_object_key: z.string().min(1).startsWith('ingestion/edge/'),
    district_enrollment_object_key: z.string().min(1).startsWith('ingestion/district_enrollment/'),
    school_membership_object_key: z.string().min(1).startsWith('ingestion/school_membership/'),
    nces_year: z.string().optional(),
  });
  fastify.post(
    '/admin/ingestion/process-upload',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const parsed = processUploadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }
      const {
        ccd_object_key,
        edge_object_key,
        district_enrollment_object_key,
        school_membership_object_key,
        nces_year,
      } = parsed.data;
      if (!isS3Configured()) {
        return reply.status(503).send({
          error: 's3_not_configured',
          message: 'Cloud storage is not configured. Ensure S3/R2 env vars are set.',
        });
      }
      const ccdStream = await getObjectStream(ccd_object_key);
      const edgeStream = await getObjectStream(edge_object_key);
      if (!ccdStream || !edgeStream) {
        return reply.status(400).send({
          error: 'files_not_found',
          message: 'CCD or EDGE file not found in storage. Ensure uploads completed successfully.',
        });
      }
      let ccdRows: Record<string, string>[];
      let edgeRows: Record<string, string>[];
      try {
        [ccdRows, edgeRows] = await Promise.all([
          streamCsvToRows(ccdStream),
          streamCsvToRows(edgeStream),
        ]);
      } catch (err) {
        return reply.status(500).send({
          error: 'parse_error',
          message: (err as Error).message,
        });
      }
      let enrollmentMap = new Map<string, number>();
      let frlPctMap = new Map<string, number>();
      let elPctMap = new Map<string, number>();
      const districtEnrollmentStream = await getObjectStream(district_enrollment_object_key);
      const schoolMembershipStream = await getObjectStream(school_membership_object_key);
      if (!districtEnrollmentStream || !schoolMembershipStream) {
        return reply.status(400).send({
          error: 'membership_files_not_found',
          message: 'District enrollment or school membership file not found in storage. Ensure uploads completed successfully.',
        });
      }
      try {
        const [districtMetrics, schoolMetrics] = await Promise.all([
          buildMembershipMetricsFromStream(districtEnrollmentStream),
          buildMembershipMetricsFromStream(schoolMembershipStream),
        ]);
        enrollmentMap = districtMetrics.enrollmentMap;
        frlPctMap = schoolMetrics.frlPctMap;
        elPctMap = schoolMetrics.elPctMap;
      } catch (err) {
        return reply.status(500).send({
          error: 'membership_parse_error',
          message: (err as Error).message,
        });
      }
      if (ccdRows.length === 0) {
        return reply.status(400).send({ error: 'ccd_parse_error', message: 'CCD file is empty or has no data rows' });
      }
      if (!detectLeaid(ccdRows[0])) {
        const cols = ccdRows[0] ? Object.keys(ccdRows[0]).join(', ') : 'none';
        return reply.status(400).send({
          error: 'ccd_missing_leaid',
          message: `CCD file must contain a LEAID column. Found columns: ${cols}`,
        });
      }
      if (edgeRows.length === 0) {
        return reply.status(400).send({ error: 'edge_parse_error', message: 'EDGE file is empty or has no data rows' });
      }
      if (!detectLeaid(edgeRows[0])) {
        return reply.status(400).send({ error: 'edge_missing_leaid', message: 'EDGE file must contain a LEAID column' });
      }
      const edgeColumns = edgeRows[0] ? Object.keys(edgeRows[0]) : [];
      const edgeMap = new Map<string, { lat?: number; lon?: number; localeCode: string | null }>();
      for (const row of edgeRows) {
        const leaid = detectLeaid(row);
        if (!leaid) continue;
        const norm = normalizeLeaid(leaid);
        const coords = getLatLon(row, edgeColumns, edgeRows.slice(1, 6));
        const localeCode = getCol(row, ...KNOWN_LOCALE_COLS)?.trim() || null;
        const entry = edgeMap.get(norm) ?? { localeCode };
        if (coords) {
          const lat = parseFloat(coords.lat);
          const lon = parseFloat(coords.lon);
          if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            entry.lat = lat;
            entry.lon = lon;
          }
        }
        entry.localeCode = localeCode ?? entry.localeCode;
        edgeMap.set(norm, entry);
      }
      const coordsExtracted = [...edgeMap.values()].filter((e) => e.lat != null && e.lon != null).length;
      if (coordsExtracted === 0) {
        return reply.status(400).send({
          error: 'edge_no_coordinates',
          message: 'EDGE file had no rows with valid coordinates. Use the Public School District file (EDGE_GEOCODE_PUBLICLEA).',
        });
      }
      const candidateIds: string[] = [];
      const errors: string[] = [];
      const BATCH_SIZE = 200;
      interface RowToInsert {
        paddedLeaid: string;
        name: string;
        state: string;
        districtSize: string;
        enrollment: number | null;
        ncesYear: string | null;
        lat: number | null;
        lon: number | null;
        geocodedAt: Date | null;
        localeCode: string | null;
        localeType: string | null;
        localeSubtype: string | null;
        localeSize: string | null;
        frlPct: number | null;
        elPct: number | null;
      }
      const rowsToInsert: RowToInsert[] = [];
      for (const row of ccdRows) {
        const leaid = detectLeaid(row);
        if (!leaid) continue;
        const paddedLeaid = normalizeLeaid(leaid);
        const name = getCol(row, 'LEA_NAME', 'LEANM', 'NAME', 'DISTNAME', 'LNAME', 'SCH_NAME') || '';
        const state = getCol(row, 'ST', 'STABR', 'STABBR', 'STATE', 'LEASTATE', 'STATEABB') || '';
        const enrollment = enrollmentMap.get(paddedLeaid) ?? getEnrollment(row) ?? null;
        if (!name || !state) {
          errors.push(`Row with LEAID=${paddedLeaid} missing name or state — skipped`);
          continue;
        }
        const edgeData = edgeMap.get(paddedLeaid);
        const locale = deriveLocaleFromCode(edgeData?.localeCode ?? null);
        rowsToInsert.push({
          paddedLeaid,
          name,
          state: state.toUpperCase(),
          districtSize: deriveDistrictSizeFromEnrollment(isNaN(enrollment as number) ? null : enrollment),
          enrollment: isNaN(enrollment as number) ? null : enrollment,
          ncesYear: nces_year ?? null,
          lat: edgeData?.lat ?? null,
          lon: edgeData?.lon ?? null,
          geocodedAt: edgeData?.lat != null ? new Date() : null,
          localeCode: locale.locale_code,
          localeType: locale.locale_type,
          localeSubtype: locale.locale_subtype,
          localeSize: locale.locale_size,
          frlPct: frlPctMap.get(paddedLeaid) ?? null,
          elPct: elPctMap.get(paddedLeaid) ?? null,
        });
      }
      const COLS_PER_ROW = 15;
      for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
        const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
        const values: unknown[] = [];
        const placeholders: string[] = [];
        batch.forEach((r, idx) => {
          const base = idx * COLS_PER_ROW + 1;
          placeholders.push(
            `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, now(), now())`
          );
          values.push(
            r.paddedLeaid, r.name, r.state, r.districtSize, r.enrollment, r.frlPct, r.elPct, r.ncesYear,
            r.lat, r.lon, r.geocodedAt, r.localeCode, r.localeType, r.localeSubtype, r.localeSize,
          );
        });
        try {
          const result = await pool.query(
            `INSERT INTO district_candidates
               (nces_district_id, name, state, district_size, enrollment, frl_pct, el_pct, nces_year,
                latitude, longitude, geocoded_at, locale_code, locale_type, locale_subtype, locale_size,
                last_refresh_at, updated_at)
             VALUES ${placeholders.join(', ')}
             ON CONFLICT (nces_district_id) DO UPDATE SET
               name = EXCLUDED.name, state = EXCLUDED.state, district_size = EXCLUDED.district_size,
               enrollment = EXCLUDED.enrollment, frl_pct = EXCLUDED.frl_pct, el_pct = EXCLUDED.el_pct,
               nces_year = EXCLUDED.nces_year,
               latitude = COALESCE(EXCLUDED.latitude, district_candidates.latitude),
               longitude = COALESCE(EXCLUDED.longitude, district_candidates.longitude),
               geocoded_at = COALESCE(EXCLUDED.geocoded_at, district_candidates.geocoded_at),
               locale_code = COALESCE(EXCLUDED.locale_code, district_candidates.locale_code),
               locale_type = COALESCE(EXCLUDED.locale_type, district_candidates.locale_type),
               locale_subtype = COALESCE(EXCLUDED.locale_subtype, district_candidates.locale_subtype),
               locale_size = COALESCE(EXCLUDED.locale_size, district_candidates.locale_size),
               last_refresh_at = now(), updated_at = now()
             RETURNING id`,
            values
          );
          candidateIds.push(...result.rows.map((row: { id: string }) => row.id));
        } catch (err) {
          batch.forEach((r) => errors.push(`Failed to upsert LEAID=${r.paddedLeaid}: ${(err as Error).message}`));
        }
      }
      if (candidateIds.length === 0) {
        return reply.status(400).send({
          error: 'no_valid_rows',
          message: 'No valid district rows could be processed from the CCD file.',
          parse_errors: errors.length > 0 ? errors : undefined,
        });
      }
      const jobId = await createIngestionJob({ candidateIds, createdBy: userId });
      await pool.query(
        `UPDATE district_candidates SET status = 'in_progress', updated_at = now() WHERE id = ANY($1::uuid[])`,
        [candidateIds]
      );
      await insertAuditLog(userId, 'ingestion_started', 'district_ingestion_job', jobId, {
        source: 'r2_upload',
        ccd_key: ccd_object_key,
        edge_key: edge_object_key,
        district_enrollment_key: district_enrollment_object_key,
        school_membership_key: school_membership_object_key,
        nces_year: nces_year,
        district_count: candidateIds.length,
      });
      const queued = await sendIngestionJob(jobId);
      if (!queued) {
        processIngestionJob(jobId).catch((err) => console.error(`Ingestion job ${jobId} failed:`, err));
      }
      const withCoords = rowsToInsert.filter((r) => r.lat != null).length;
      return reply.status(202).send({
        job_id: jobId,
        total_count: candidateIds.length,
        coordinates_diagnostic: {
          with_coordinates: withCoords,
          without_coordinates: rowsToInsert.length - withCoords,
        },
        enrollment_diagnostic: {
          with_enrollment: rowsToInsert.filter((r) => r.enrollment != null).length,
          from_district_enrollment_file: enrollmentMap.size > 0,
        },
        school_lunch_diagnostic: {
          with_frl_pct: rowsToInsert.filter((r) => r.frlPct != null).length,
        },
        el_diagnostic: {
          with_el_pct: rowsToInsert.filter((r) => r.elPct != null).length,
        },
        parse_errors: errors.length > 0 ? errors : undefined,
      });
    }
  );

  // POST /admin/ingestion/upload/validate — parse files and return diagnostics without inserting
  fastify.post(
    '/admin/ingestion/upload/validate',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts = (request as any).parts() as AsyncIterable<any>;
      const files: Record<string, { name: string; content: string }> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk as Buffer);
          files[part.fieldname] = {
            name: part.filename ?? part.fieldname,
            content: Buffer.concat(chunks).toString('utf8'),
          };
        }
      }
      if (!files.ccd_file || !files.edge_file) {
        return reply.status(400).send({ error: 'Both ccd_file and edge_file are required' });
      }
      const ccdRows = parseCsv(files.ccd_file.content);
      const edgeRows = parseCsv(files.edge_file.content);
      let districtEnrollmentCount = 0;
      let schoolFrlPctCount = 0;
      let schoolElPctCount = 0;
      if (files.district_enrollment_file?.content) {
        const memRows = parseCsv(files.district_enrollment_file.content);
        const metrics = buildMembershipMetrics(memRows);
        districtEnrollmentCount = metrics.enrollmentMap.size;
      }
      if (files.school_membership_file?.content) {
        const schoolRows = parseCsv(files.school_membership_file.content);
        const schoolMetrics = buildMembershipMetrics(schoolRows);
        schoolFrlPctCount = schoolMetrics.frlPctMap.size;
        schoolElPctCount = schoolMetrics.elPctMap.size;
      }
      const ccdCols = ccdRows[0] ? Object.keys(ccdRows[0]) : [];
      const edgeCols = edgeRows[0] ? Object.keys(edgeRows[0]) : [];
      const edgeMap = new Map<string, { lat: number; lon: number; localeCode: string | null }>();
      let localeExtracted = 0;
      for (const row of edgeRows) {
        const leaid = detectLeaid(row);
        const coords = getLatLon(row, edgeCols, edgeRows.slice(1, 6));
        const localeCode = getCol(row, ...KNOWN_LOCALE_COLS)?.trim() || null;
        if (localeCode) localeExtracted++;
        if (leaid && coords) {
          const lat = parseFloat(coords.lat);
          const lon = parseFloat(coords.lon);
          if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            edgeMap.set(normalizeLeaid(leaid), { lat, lon, localeCode });
          }
        }
      }
      let matched = 0;
      const ccdLeaids = new Set<string>();
      for (const row of ccdRows) {
        const leaid = detectLeaid(row);
        if (!leaid) continue;
        const norm = normalizeLeaid(leaid);
        ccdLeaids.add(norm);
        if (edgeMap.has(norm)) matched++;
      }
      const sampleCcdLeaid = ccdRows[0] ? detectLeaid(ccdRows[0]) : null;
      const sampleEdgeLeaid = edgeRows[0] ? detectLeaid(edgeRows[0]) : null;
      return reply.send({
        ccd: { rows: ccdRows.length, columns: ccdCols, sample_leaid: sampleCcdLeaid, sample_normalized: sampleCcdLeaid ? normalizeLeaid(sampleCcdLeaid) : null },
        district_enrollment: files.district_enrollment_file
          ? {
              rows: parseCsv(files.district_enrollment_file.content).length,
              enrollment_extracted: districtEnrollmentCount,
            }
          : null,
        school_membership_metrics: files.school_membership_file
          ? { frl_pct_extracted: schoolFrlPctCount, el_pct_extracted: schoolElPctCount }
          : null,
        edge: {
          rows: edgeRows.length,
          columns: edgeCols,
          coords_extracted: edgeMap.size,
          locale_extracted: localeExtracted,
          sample_leaid: sampleEdgeLeaid,
          sample_normalized: sampleEdgeLeaid ? normalizeLeaid(sampleEdgeLeaid) : null,
          sample_first_row: edgeRows[0] ? Object.fromEntries(Object.entries(edgeRows[0]).slice(0, 15)) : null,
        },
        match: {
          ccd_unique_leaids: ccdLeaids.size,
          matched_by_leaid: matched,
          unmatched: ccdLeaids.size - matched,
        },
      });
    }
  );

  // POST /admin/ingestion/upload — dual NCES CCD + EDGE file upload
  fastify.post(
    '/admin/ingestion/upload',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;

      // Collect multipart parts (cast needed: @fastify/multipart augments at root workspace level)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts = (request as any).parts() as AsyncIterable<any>;
      const files: Record<string, { name: string; content: string }> = {};
      const fields: Record<string, string> = {};

      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk as Buffer);
          }
          files[part.fieldname] = {
            name: part.filename ?? part.fieldname,
            content: Buffer.concat(chunks).toString('utf8'),
          };
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }

      if (!files.ccd_file) {
        return reply.status(400).send({ error: 'ccd_file_required', message: 'ccd_file is required' });
      }
      if (!files.edge_file) {
        return reply.status(400).send({ error: 'edge_file_required', message: 'edge_file is required' });
      }

      // Build LEAID → enrollment from required district enrollment file (LEA Membership C052)
      let enrollmentMap = new Map<string, number>();
      let frlPctMap = new Map<string, number>();
      let elPctMap = new Map<string, number>();
      if (!files.district_enrollment_file) {
        return reply.status(400).send({
          error: 'district_enrollment_file_required',
          message: 'district_enrollment_file is required',
        });
      }
      if (!files.school_membership_file) {
        return reply.status(400).send({
          error: 'school_membership_file_required',
          message: 'school_membership_file is required',
        });
      }
      const districtMembershipRows = parseCsv(files.district_enrollment_file.content);
      const districtMetrics = buildMembershipMetrics(districtMembershipRows);
      enrollmentMap = districtMetrics.enrollmentMap;
      const schoolMembershipRows = parseCsv(files.school_membership_file.content);
      const schoolMetrics = buildMembershipMetrics(schoolMembershipRows);
      frlPctMap = schoolMetrics.frlPctMap;
      elPctMap = schoolMetrics.elPctMap;

      // Parse CCD CSV
      const ccdRows = parseCsv(files.ccd_file.content);
      if (ccdRows.length === 0) {
        return reply.status(400).send({ error: 'ccd_parse_error', message: 'CCD file is empty or has no data rows' });
      }
      // Validate CCD has LEAID-like column
      if (!detectLeaid(ccdRows[0])) {
        const cols = ccdRows[0] ? Object.keys(ccdRows[0]).join(', ') : 'none';
        return reply.status(400).send({
          error: 'ccd_missing_leaid',
          message: `CCD file must contain a LEAID column (or LEA_ID). Found columns: ${cols}`,
        });
      }

      // Parse EDGE CSV
      const edgeRows = parseCsv(files.edge_file.content);
      if (edgeRows.length === 0) {
        return reply.status(400).send({ error: 'edge_parse_error', message: 'EDGE file is empty or has no data rows' });
      }
      if (!detectLeaid(edgeRows[0])) {
        return reply.status(400).send({ error: 'edge_missing_leaid', message: 'EDGE file must contain a LEAID column' });
      }

      // Build LEAID → { lat, lon, localeCode } from EDGE (LOCALE is in geocode file)
      const edgeColumns = edgeRows[0] ? Object.keys(edgeRows[0]) : [];
      const edgeMap = new Map<string, { lat?: number; lon?: number; localeCode: string | null }>();
      for (const row of edgeRows) {
        const leaid = detectLeaid(row);
        if (!leaid) continue;
        const norm = normalizeLeaid(leaid);
        const coords = getLatLon(row, edgeColumns, edgeRows.slice(1, 6));
        const localeCode = getCol(row, ...KNOWN_LOCALE_COLS)?.trim() || null;
        const entry = edgeMap.get(norm) ?? { localeCode };
        if (coords) {
          const lat = parseFloat(coords.lat);
          const lon = parseFloat(coords.lon);
          if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            entry.lat = lat;
            entry.lon = lon;
          }
        }
        entry.localeCode = localeCode ?? entry.localeCode;
        edgeMap.set(norm, entry);
      }

      const coordsExtracted = [...edgeMap.values()].filter((e) => e.lat != null && e.lon != null).length;
      if (coordsExtracted === 0) {
        const edgeCols = edgeRows[0] ? Object.keys(edgeRows[0]).join(', ') : 'none';
        return reply.status(400).send({
          error: 'edge_no_coordinates',
          message:
            'EDGE file had no rows with valid coordinates. Ensure you use the Public School District file (EDGE_GEOCODE_PUBLICLEA), not the School file. The file must contain latitude/longitude columns (e.g. LAT/LON, Latitude/Longitude, or X/Y).',
          diagnostic: {
            edge_rows: edgeRows.length,
            edge_columns: edgeCols,
            first_edge_row_keys: edgeColumns.slice(0, 20),
          },
        });
      }

      // Optional nces_year from fields or inferred from filename
      const ncesYear = fields.nces_year ?? null;

      // Upsert district_candidates from CCD rows (batched for performance)
      const candidateIds: string[] = [];
      const errors: string[] = [];
      const BATCH_SIZE = 200;

      interface RowToInsert {
        paddedLeaid: string;
        name: string;
        state: string;
        districtSize: string;
        enrollment: number | null;
        frlPct: number | null;
        elPct: number | null;
        ncesYear: string | null;
        lat: number | null;
        lon: number | null;
        geocodedAt: Date | null;
        localeCode: string | null;
        localeType: string | null;
        localeSubtype: string | null;
        localeSize: string | null;
      }

      const rowsToInsert: RowToInsert[] = [];
      for (const row of ccdRows) {
        const leaid = detectLeaid(row);
        if (!leaid) continue;
        const paddedLeaid = normalizeLeaid(leaid);

        const name =
          getCol(row, 'LEA_NAME', 'LEANM', 'NAME', 'DISTNAME', 'LNAME', 'SCH_NAME') || '';
        const state =
          getCol(row, 'ST', 'STABR', 'STABBR', 'STATE', 'LEASTATE', 'STATEABB') || '';
        // Prefer enrollment from Membership file (Directory file has none); fallback to CCD row
        const enrollment =
          enrollmentMap.get(paddedLeaid) ?? getEnrollment(row) ?? null;

        if (!name || !state) {
          errors.push(`Row with LEAID=${paddedLeaid} missing name or state — skipped`);
          continue;
        }

        const edgeData = edgeMap.get(paddedLeaid);
        const locale = deriveLocaleFromCode(edgeData?.localeCode ?? null);
        rowsToInsert.push({
          paddedLeaid,
          name,
          state: state.toUpperCase(),
          districtSize: deriveDistrictSizeFromEnrollment(isNaN(enrollment as number) ? null : enrollment),
          enrollment: isNaN(enrollment as number) ? null : enrollment,
          frlPct: frlPctMap.get(paddedLeaid) ?? null,
          elPct: elPctMap.get(paddedLeaid) ?? null,
          ncesYear,
          lat: edgeData?.lat ?? null,
          lon: edgeData?.lon ?? null,
          geocodedAt: edgeData?.lat != null ? new Date() : null,
          localeCode: locale.locale_code,
          localeType: locale.locale_type,
          localeSubtype: locale.locale_subtype,
          localeSize: locale.locale_size,
        });
      }

      for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
        const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
        const values: unknown[] = [];
        const placeholders: string[] = [];
        const COLS_PER_ROW = 15;
        batch.forEach((r, idx) => {
          const base = idx * COLS_PER_ROW + 1;
          placeholders.push(
            `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, now(), now())`
          );
          values.push(
            r.paddedLeaid,
            r.name,
            r.state,
            r.districtSize,
            r.enrollment,
            r.frlPct,
            r.elPct,
            r.ncesYear,
            r.lat,
            r.lon,
            r.geocodedAt,
            r.localeCode,
            r.localeType,
            r.localeSubtype,
            r.localeSize
          );
        });
        try {
          const result = await pool.query(
            `INSERT INTO district_candidates
               (nces_district_id, name, state, district_size, enrollment, frl_pct, el_pct, nces_year,
                latitude, longitude, geocoded_at, locale_code, locale_type, locale_subtype, locale_size,
                last_refresh_at, updated_at)
             VALUES ${placeholders.join(', ')}
             ON CONFLICT (nces_district_id) DO UPDATE SET
               name = EXCLUDED.name,
               state = EXCLUDED.state,
               district_size = EXCLUDED.district_size,
               enrollment = EXCLUDED.enrollment,
               frl_pct = EXCLUDED.frl_pct,
               el_pct = EXCLUDED.el_pct,
               nces_year = EXCLUDED.nces_year,
               latitude = COALESCE(EXCLUDED.latitude, district_candidates.latitude),
               longitude = COALESCE(EXCLUDED.longitude, district_candidates.longitude),
               geocoded_at = COALESCE(EXCLUDED.geocoded_at, district_candidates.geocoded_at),
               locale_code = COALESCE(EXCLUDED.locale_code, district_candidates.locale_code),
               locale_type = COALESCE(EXCLUDED.locale_type, district_candidates.locale_type),
               locale_subtype = COALESCE(EXCLUDED.locale_subtype, district_candidates.locale_subtype),
               locale_size = COALESCE(EXCLUDED.locale_size, district_candidates.locale_size),
               last_refresh_at = now(),
               updated_at = now()
             RETURNING id`,
            values
          );
          candidateIds.push(...result.rows.map((row) => row.id));
        } catch (err) {
          batch.forEach((r) => {
            errors.push(`Failed to upsert LEAID=${r.paddedLeaid}: ${(err as Error).message}`);
          });
        }
      }

      if (candidateIds.length === 0) {
        const sampleColumns =
          ccdRows[0] && Object.keys(ccdRows[0]).length > 0
            ? ` Found columns: ${Object.keys(ccdRows[0]).slice(0, 15).join(', ')}${Object.keys(ccdRows[0]).length > 15 ? '...' : ''}`
            : '';
        const hint =
          errors.length === 0 && rowsToInsert.length === 0
            ? ` No rows had a valid LEAID. CCD files must have a column named LEAID (or LEA_ID).${sampleColumns}`
            : '';
        return reply.status(400).send({
          error: 'no_valid_rows',
          message: `No valid district rows could be processed from the CCD file.${hint}`,
          parse_errors: errors.length > 0 ? errors : undefined,
        });
      }

      // Create ingestion job
      const jobId = await createIngestionJob({ candidateIds, createdBy: userId });

      // Mark candidates as in_progress
      await pool.query(
        `UPDATE district_candidates SET status = 'in_progress', updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [candidateIds]
      );

      // Audit
      await insertAuditLog(userId, 'ingestion_started', 'district_ingestion_job', jobId, {
        source: 'nces_upload',
        ccd_filename: files.ccd_file.name,
        edge_filename: files.edge_file.name,
        nces_year: ncesYear,
        district_count: candidateIds.length,
      });

      // Enqueue async
      const queued = await sendIngestionJob(jobId);
      if (!queued) {
        processIngestionJob(jobId).catch((err) => {
          console.error(`Ingestion job ${jobId} failed:`, err);
        });
      }

      const withCoords = rowsToInsert.filter((r) => r.lat != null).length;
      const withoutCoords = rowsToInsert.filter((r) => r.lat == null).length;
      const withEnrollment = rowsToInsert.filter((r) => r.enrollment != null).length;

      return reply.status(202).send({
        job_id: jobId,
        total_count: candidateIds.length,
        coordinates_diagnostic: {
          edge_rows_parsed: edgeRows.length,
          edge_coords_extracted: coordsExtracted,
          ccd_districts_processed: rowsToInsert.length,
          with_coordinates: withCoords,
          without_coordinates: withoutCoords,
        },
        enrollment_diagnostic: {
          with_enrollment: withEnrollment,
          without_enrollment: rowsToInsert.length - withEnrollment,
          from_district_enrollment_file: enrollmentMap.size > 0,
        },
        school_lunch_diagnostic: {
          with_frl_pct: rowsToInsert.filter((r) => r.frlPct != null).length,
        },
        el_diagnostic: {
          with_el_pct: rowsToInsert.filter((r) => r.elPct != null).length,
        },
        parse_errors: errors.length > 0 ? errors : undefined,
      });
    }
  );
}
