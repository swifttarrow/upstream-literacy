import { FastifyInstance } from 'fastify';
import { checkDb } from '../db/index.js';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    const dbOk = await checkDb();
    if (!dbOk) {
      return reply.status(503).send({ status: 'error', db: 'down' });
    }
    return reply.send({ status: 'ok', db: 'ok' });
  });
}
