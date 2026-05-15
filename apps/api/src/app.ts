import Fastify from 'fastify';
import cors from '@fastify/cors';
import { projectRoutes } from './modules/projects/routes.js';
import { testRoutes } from './modules/tests/routes.js';
import { runRoutes } from './modules/runs/routes.js';
import { dashboardRoutes } from './modules/dashboard/routes.js';
import { settingsRoutes } from './modules/settings/routes.js';

/**
 * Creates and configures the Fastify application instance.
 */
export async function buildApp() {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  // CORS for local dev (frontend on different port)
  await app.register(cors, {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // Register route modules
  await app.register(projectRoutes);
  await app.register(testRoutes);
  await app.register(runRoutes);
  await app.register(dashboardRoutes);
  await app.register(settingsRoutes);

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode ?? 500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message,
      },
    });
  });

  return app;
}
