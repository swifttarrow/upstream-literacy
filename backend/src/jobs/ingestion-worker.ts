/**
 * pg-boss worker for ingestion jobs.
 * Enqueue via sendIngestionJob(); worker processes in background for durability.
 */
import PgBoss from 'pg-boss';
import { processIngestionJob } from '../services/ingestion.js';

const QUEUE_NAME = 'ingestion-job';

export interface IngestionJobPayload {
  jobId: string;
}

let boss: PgBoss | null = null;

export async function startIngestionWorker(databaseUrl: string): Promise<PgBoss> {
  boss = new PgBoss({ connectionString: databaseUrl });
  await boss.start();

  await boss.work<IngestionJobPayload>(QUEUE_NAME, async (jobs) => {
    for (const job of jobs) {
      const { jobId } = job.data;
      await processIngestionJob(jobId);
    }
  });

  return boss;
}

export async function sendIngestionJob(jobId: string): Promise<string | null> {
  if (!boss) return null;
  const id = await boss.send(QUEUE_NAME, { jobId });
  return id ?? null;
}

export async function stopIngestionWorker(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
