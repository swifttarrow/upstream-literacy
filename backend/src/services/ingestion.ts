import { pool } from '../db/index.js';
import { createNotification } from './notifications.js';

export interface CreateJobOptions {
  candidateIds: string[];
  createdBy: string;
}

export interface JobRecord {
  id: string;
  status: string;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  total_count: number;
  succeeded_count: number;
  warning_count: number;
  failed_count: number;
  created_at: string;
}

/** Create a new ingestion job and its per-candidate records. Returns the job id. */
export async function createIngestionJob(opts: CreateJobOptions): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const jobResult = await client.query(
      `INSERT INTO district_ingestion_jobs (created_by, total_count, status)
       VALUES ($1, $2, 'queued')
       RETURNING id`,
      [opts.createdBy, opts.candidateIds.length]
    );
    const jobId = jobResult.rows[0].id;

    // Insert per-candidate records
    for (const candidateId of opts.candidateIds) {
      await client.query(
        `INSERT INTO district_ingestion_job_records (job_id, candidate_id, status)
         VALUES ($1, $2, 'pending')
         ON CONFLICT (job_id, candidate_id) DO NOTHING`,
        [jobId, candidateId]
      );
    }

    await client.query('COMMIT');
    return jobId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Mark job as running, set started_at */
export async function startIngestionJob(jobId: string): Promise<void> {
  await pool.query(
    `UPDATE district_ingestion_jobs
     SET status = 'running', started_at = now(), updated_at = now()
     WHERE id = $1`,
    [jobId]
  );
}

/** Update job aggregate counts and finalize status */
export async function finalizeIngestionJob(jobId: string): Promise<void> {
  // Recount from records
  const counts = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded,
       COUNT(*) FILTER (WHERE status = 'succeeded_with_warnings') AS warnings,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed,
       COUNT(*) AS total
     FROM district_ingestion_job_records
     WHERE job_id = $1`,
    [jobId]
  );
  const { succeeded, warnings, failed, total } = counts.rows[0];

  let status = 'completed';
  if (parseInt(failed) > 0 && parseInt(succeeded) + parseInt(warnings) === 0) {
    status = 'failed';
  } else if (parseInt(failed) > 0) {
    status = 'partially_failed';
  } else if (parseInt(warnings) > 0) {
    status = 'completed_with_warnings';
  }

  await pool.query(
    `UPDATE district_ingestion_jobs
     SET status = $1,
         succeeded_count = $2,
         warning_count = $3,
         failed_count = $4,
         total_count = $5,
         completed_at = now(),
         updated_at = now()
     WHERE id = $6`,
    [status, parseInt(succeeded), parseInt(warnings), parseInt(failed), parseInt(total), jobId]
  );

  // Notify job creator
  const jobResult = await pool.query(
    'SELECT created_by FROM district_ingestion_jobs WHERE id = $1',
    [jobId]
  );
  if (jobResult.rows.length > 0 && jobResult.rows[0].created_by) {
    const creatorId = jobResult.rows[0].created_by;
    const titleMap: Record<string, string> = {
      completed: 'Ingestion completed',
      completed_with_warnings: 'Ingestion completed with warnings',
      failed: 'Ingestion failed',
      partially_failed: 'Ingestion partially failed',
    };
    const bodyMap: Record<string, string> = {
      completed: `Successfully ingested ${parseInt(succeeded)} district(s).`,
      completed_with_warnings: `Ingested ${parseInt(succeeded) + parseInt(warnings)} district(s) with ${parseInt(warnings)} warning(s).`,
      failed: `Ingestion failed for all ${parseInt(failed)} district(s). Retry eligible errors can be retried.`,
      partially_failed: `Ingested ${parseInt(succeeded)} ok, ${parseInt(warnings)} warnings, ${parseInt(failed)} failed.`,
    };
    try {
      await createNotification(
        creatorId,
        'system',
        titleMap[status] || 'Ingestion job completed',
        bodyMap[status],
        { job_id: jobId, status }
      );
    } catch {
      // Non-critical
    }
  }
}

/** Update a single record's status within a job */
export async function updateJobRecord(
  jobId: string,
  candidateId: string,
  status: string,
  opts?: { errorType?: string; errorMessage?: string; retryEligible?: boolean; warningDetails?: object }
): Promise<void> {
  await pool.query(
    `UPDATE district_ingestion_job_records
     SET status = $1,
         error_type = $2,
         error_message = $3,
         retry_eligible = $4,
         warning_details = $5,
         updated_at = now()
     WHERE job_id = $6 AND candidate_id = $7`,
    [
      status,
      opts?.errorType ?? null,
      opts?.errorMessage ?? null,
      opts?.retryEligible ?? false,
      opts?.warningDetails ? JSON.stringify(opts.warningDetails) : null,
      jobId,
      candidateId,
    ]
  );
}

/** Fetch job with records for progress display */
export async function getJobWithRecords(jobId: string): Promise<{ job: JobRecord; records: unknown[] } | null> {
  const jobResult = await pool.query(
    'SELECT * FROM district_ingestion_jobs WHERE id = $1',
    [jobId]
  );
  if (jobResult.rows.length === 0) return null;

  const recordsResult = await pool.query(
    `SELECT r.*, dc.name AS district_name, dc.state, dc.nces_district_id
     FROM district_ingestion_job_records r
     JOIN district_candidates dc ON dc.id = r.candidate_id
     WHERE r.job_id = $1
     ORDER BY r.updated_at DESC`,
    [jobId]
  );

  return { job: jobResult.rows[0], records: recordsResult.rows };
}

/** Fetch recent jobs for the dashboard */
export async function getRecentJobs(limit = 10): Promise<JobRecord[]> {
  const result = await pool.query(
    `SELECT j.*, u.full_name AS created_by_name
     FROM district_ingestion_jobs j
     LEFT JOIN users u ON u.id = j.created_by
     ORDER BY j.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Process an ingestion job: normalize, upsert district, create ingestion event.
 * Called by pg-boss worker or directly for sync processing.
 */
export async function processIngestionJob(jobId: string): Promise<void> {
  await startIngestionJob(jobId);

  const recordsResult = await pool.query(
    `SELECT r.candidate_id, dc.*
     FROM district_ingestion_job_records r
     JOIN district_candidates dc ON dc.id = r.candidate_id
     WHERE r.job_id = $1 AND r.status = 'pending'`,
    [jobId]
  );
  const records = recordsResult.rows;

  const defsResult = await pool.query('SELECT id, key FROM district_attribute_definitions');
  const defMap = new Map<string, string>(defsResult.rows.map((r) => [r.key, r.id]));

  for (const record of records) {
    await updateJobRecord(jobId, record.candidate_id, 'running');
    await pool.query(
      `UPDATE district_candidates SET status = 'in_progress', updated_at = now() WHERE id = $1`,
      [record.candidate_id]
    );

    try {
      const warnings: string[] = [];
      const attributes: Record<string, string | number> = {
        state: record.state,
        district_type: record.district_type || 'unknown',
      };
      if (!record.district_type) {
        warnings.push('district_type missing — defaulted to unknown');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const slug = record.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        const districtResult = await client.query(
          `INSERT INTO districts (name, slug, country_code, state_region, external_ref)
           VALUES ($1, $2, 'US', $3, $4)
           ON CONFLICT (slug) DO UPDATE
             SET name = EXCLUDED.name,
                 state_region = EXCLUDED.state_region,
                 external_ref = EXCLUDED.external_ref,
                 updated_at = now()
           RETURNING id`,
          [record.name, slug, record.state, `NCES-${record.nces_district_id}`]
        );
        const districtId = districtResult.rows[0].id;

        const ingestionResult = await client.query(
          `INSERT INTO district_ingestion_events
           (district_id, source_label, normalized_attributes, raw_payload)
           VALUES ($1, 'nces_seed_v1', $2, $3)
           RETURNING id`,
          [
            districtId,
            JSON.stringify(attributes),
            JSON.stringify({ source: 'nces_seed', candidate: record }),
          ]
        );
        const ingestionEventId = ingestionResult.rows[0].id;

        for (const [key, value] of Object.entries(attributes)) {
          const definitionId = defMap.get(key);
          if (!definitionId) continue;
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
            [districtId, definitionId, isNumber ? null : String(value), isNumber ? value : null, ingestionEventId]
          );
        }

        await client.query(
          `UPDATE district_candidates
           SET district_id = $1,
               status = $2,
               missing_data_indicator = $3,
               last_refresh_at = now(),
               updated_at = now()
           WHERE id = $4`,
          [
            districtId,
            warnings.length > 0 ? 'ingested_with_warnings' : 'ingested',
            warnings.length > 0,
            record.candidate_id,
          ]
        );

        await client.query('COMMIT');

        const recordStatus = warnings.length > 0 ? 'succeeded_with_warnings' : 'succeeded';
        await updateJobRecord(jobId, record.candidate_id, recordStatus, {
          warningDetails: warnings.length > 0 ? { warnings } : undefined,
        });
      } catch (innerErr) {
        await client.query('ROLLBACK');
        throw innerErr;
      } finally {
        client.release();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await updateJobRecord(jobId, record.candidate_id, 'failed', {
        errorType: 'db_write_failure',
        errorMessage: message,
        retryEligible: true,
      });
      await pool.query(
        `INSERT INTO district_ingestion_errors (job_id, candidate_id, error_type, message, retry_eligible)
         VALUES ($1, $2, 'db_write_failure', $3, true)`,
        [jobId, record.candidate_id, message]
      );
      await pool.query(
        `UPDATE district_candidates SET status = 'failed', updated_at = now() WHERE id = $1`,
        [record.candidate_id]
      );
    }
  }

  await finalizeIngestionJob(jobId);
}
