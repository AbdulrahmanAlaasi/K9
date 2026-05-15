import type { FastifyInstance } from 'fastify';
import {
  createTestConfigSchema,
  updateTestConfigSchema,
  idParamSchema,
} from '../../schemas/validation.js';
import * as testConfigService from '../../services/test-config.service.js';
import * as runService from '../../services/run.service.js';
import { sendSuccess, sendNotFound, sendValidationError } from '../../utils/response.js';

export async function testRoutes(app: FastifyInstance): Promise<void> {
  /** POST /api/projects/:id/tests — Create test config under a project */
  app.post('/api/projects/:id/tests', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const body = createTestConfigSchema.safeParse({
      ...(req.body as object),
      projectId: params.data.id,
    });
    if (!body.success) return sendValidationError(reply, body.error.flatten());

    const test = await testConfigService.createTestConfig(body.data);
    sendSuccess(reply, test, 201);
  });

  /** GET /api/tests/:id — Get a test config */
  app.get('/api/tests/:id', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const test = await testConfigService.getTestConfigById(params.data.id);
    if (!test) return sendNotFound(reply, 'Test config');
    sendSuccess(reply, test);
  });

  /** PUT /api/tests/:id — Update a test config */
  app.put('/api/tests/:id', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const body = updateTestConfigSchema.safeParse(req.body);
    if (!body.success) return sendValidationError(reply, body.error.flatten());

    const test = await testConfigService.updateTestConfig(params.data.id, body.data);
    if (!test) return sendNotFound(reply, 'Test config');
    sendSuccess(reply, test);
  });

  /** DELETE /api/tests/:id — Delete a test config */
  app.delete('/api/tests/:id', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const deleted = await testConfigService.deleteTestConfig(params.data.id);
    if (!deleted) return sendNotFound(reply, 'Test config');
    sendSuccess(reply, { deleted: true });
  });

  /** GET /api/tests/:id/runs — List runs for a test config */
  app.get('/api/tests/:id/runs', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const runs = await runService.getRunsByTestConfig(params.data.id);
    sendSuccess(reply, runs);
  });
}
