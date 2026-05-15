import type { FastifyInstance } from 'fastify';
import * as dashboardService from '../../services/dashboard.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  /** GET /api/dashboard/stats — Get dashboard summary */
  app.get('/api/dashboard/stats', async (_req, reply) => {
    const stats = await dashboardService.getDashboardStats();
    sendSuccess(reply, stats);
  });
}
