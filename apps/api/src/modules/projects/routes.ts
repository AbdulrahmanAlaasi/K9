import type { FastifyInstance } from 'fastify';
import { createProjectSchema, updateProjectSchema, idParamSchema } from '../../schemas/validation.js';
import * as projectService from '../../services/project.service.js';
import * as testConfigService from '../../services/test-config.service.js';
import * as runService from '../../services/run.service.js';
import { sendSuccess, sendNotFound, sendValidationError, sendError } from '../../utils/response.js';

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  /** GET /api/projects — List all projects */
  app.get('/api/projects', async (_req, reply) => {
    const projects = await projectService.getAllProjects();
    sendSuccess(reply, projects);
  });

  /** POST /api/projects — Create a project */
  app.post('/api/projects', async (req, reply) => {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }
    try {
      const project = await projectService.createProject(parsed.data);
      sendSuccess(reply, project, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      if (message.includes('Unique constraint')) {
        return sendError(reply, 'DUPLICATE', 'A project with this name already exists', 409);
      }
      throw err;
    }
  });

  /** GET /api/projects/:id — Get project detail with tests */
  app.get('/api/projects/:id', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const project = await projectService.getProjectById(params.data.id);
    if (!project) return sendNotFound(reply, 'Project');

    const tests = await testConfigService.getTestsByProject(params.data.id);
    sendSuccess(reply, { ...project, tests });
  });

  /** PUT /api/projects/:id — Update a project */
  app.put('/api/projects/:id', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const body = updateProjectSchema.safeParse(req.body);
    if (!body.success) return sendValidationError(reply, body.error.flatten());

    const project = await projectService.updateProject(params.data.id, body.data);
    if (!project) return sendNotFound(reply, 'Project');
    sendSuccess(reply, project);
  });

  /** DELETE /api/projects/:id — Delete a project */
  app.delete('/api/projects/:id', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const deleted = await projectService.deleteProject(params.data.id);
    if (!deleted) return sendNotFound(reply, 'Project');
    sendSuccess(reply, { deleted: true });
  });

  /** GET /api/projects/:id/runs — List runs for a project */
  app.get('/api/projects/:id/runs', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const runs = await runService.getRunsByProject(params.data.id);
    sendSuccess(reply, runs);
  });
}
