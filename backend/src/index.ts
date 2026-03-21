import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';

import jwtPlugin from './plugins/jwt.js';
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
import aiRoutes from './routes/ai.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
  });

  // Plugins
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  await fastify.register(fastifyWebsocket);
  await fastify.register(jwtPlugin);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(usersRoutes);
  await fastify.register(districtsRoutes);
  await fastify.register(taxonomyRoutes);
  await fastify.register(discoveryRoutes);
  await fastify.register(connectionsRoutes);
  await fastify.register(conversationsRoutes);
  await fastify.register(moderationRoutes);
  await fastify.register(notificationsRoutes);
  await fastify.register(aiRoutes);

  return fastify;
}

async function main() {
  try {
    const fastify = await buildServer();
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

main();
