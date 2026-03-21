import { pool } from '../db/index.js';

export async function insertAuditLog(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log_entries (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorId, action, entityType, entityId, JSON.stringify(metadata)]
    );
  } catch (err) {
    // Audit log failures should not break main operations
    console.error('Failed to insert audit log:', err);
  }
}
