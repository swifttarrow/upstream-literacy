import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';

import jwtPlugin from './plugins/jwt.js';
import { startIngestionWorker } from './jobs/ingestion-worker.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import districtsRoutes from './routes/districts.js';
import taxonomyRoutes from './routes/taxonomy.js';
import discoveryRoutes from './routes/discovery.js';
import connectionsRoutes from './routes/connections.js';
import conversationsRoutes from './routes/conversations.js';
import moderationRoutes from './routes/moderation.js';
import notificationsRoutes from './routes/notifications.js';
import ingestionRoutes from './routes/ingestion.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
    bodyLimit: 250 * 1024 * 1024, // 250 MB — NCES CCD + EDGE + Membership can be large
  });

  // Plugins
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  await fastify.register(fastifyWebsocket);
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 200 * 1024 * 1024, // 200 MB per file — full US CCD/EDGE can be 20–50 MB each
      files: 5, // ccd_file, edge_file, membership_file, plus form fields
    },
  });
  await fastify.register(jwtPlugin);

  // Routes (prefix /api so Next.js proxy /api/:path* forwards correctly)
  await fastify.register(healthRoutes); // /health stays at root for load balancers
  await fastify.register(authRoutes, { prefix: '/api' });
  await fastify.register(usersRoutes, { prefix: '/api' });
  await fastify.register(districtsRoutes, { prefix: '/api' });
  await fastify.register(taxonomyRoutes, { prefix: '/api' });
  await fastify.register(discoveryRoutes, { prefix: '/api' });
  await fastify.register(connectionsRoutes, { prefix: '/api' });
  await fastify.register(conversationsRoutes, { prefix: '/api' });
  await fastify.register(moderationRoutes, { prefix: '/api' });
  await fastify.register(notificationsRoutes, { prefix: '/api' });
  await fastify.register(ingestionRoutes, { prefix: '/api' });

  return fastify;
}

async function main() {
  try {
    const fastify = await buildServer();
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Server listening on ${HOST}:${PORT}`);

    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && process.env.NODE_ENV !== 'test') {
      await startIngestionWorker(dbUrl);
      console.log('Ingestion worker started (pg-boss)');
    }
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Only start server when run directly; skip when imported for tests
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
