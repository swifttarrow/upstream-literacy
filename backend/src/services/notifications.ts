import { pool } from '../db/index.js';
import { NotificationType } from '../types.js';

// Map to hold active WebSocket connections by userId
export const wsConnections = new Map<string, Set<unknown>>();

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  payload: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, body || null, JSON.stringify(payload)]
  );

  const notification = result.rows[0];

  // Broadcast via WebSocket if user is online
  const userConnections = wsConnections.get(userId);
  if (userConnections && userConnections.size > 0) {
    const message = JSON.stringify({
      event: 'notification',
      data: notification,
    });
    userConnections.forEach((ws) => {
      try {
        const socket = ws as { send: (data: string) => void; readyState: number };
        if (socket.readyState === 1) {
          socket.send(message);
        }
      } catch {
        // ignore
      }
    });
  }

  return notification;
}
