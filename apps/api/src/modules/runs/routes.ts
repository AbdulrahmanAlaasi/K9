import type { FastifyInstance } from 'fastify';
import { idParamSchema } from '../../schemas/validation.js';
import * as runService from '../../services/run.service.js';
import * as testConfigService from '../../services/test-config.service.js';
import * as settingsService from '../../services/settings.service.js';
import { sendSuccess, sendNotFound, sendValidationError, sendError } from '../../utils/response.js';
import { validateTargetUrl } from '../../utils/helpers.js';
import { RunStatus } from '@k9/shared';
import { TestOrchestrator, registerEngine, getActiveEngine } from '../../engine/orchestrator.js';

/** In-memory registry for active SSE connections keyed by runId */
const sseClients = new Map<string, Set<(data: string) => void>>();

/** Broadcasts an SSE event to all clients watching a specific run */
export function broadcastSSE(runId: string, event: string, data: unknown): void {
  const clients = sseClients.get(runId);
  if (!clients) return;
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const send of clients) {
    send(message);
  }
}

export async function runRoutes(app: FastifyInstance): Promise<void> {
  /** POST /api/tests/:id/run — Start a test run */
  app.post('/api/tests/:id/run', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    // Check no other test is running
    const active = await runService.hasActiveRun();
    if (active) {
      return sendError(
        reply,
        'ALREADY_RUNNING',
        'Another test is already running. Only one test can run at a time.',
        409,
      );
    }

    // Load test config
    const testConfig = await testConfigService.getTestConfigById(params.data.id);
    if (!testConfig) return sendNotFound(reply, 'Test config');

    // Validate all target URLs
    const settings = await settingsService.getSettings();
    for (const endpoint of testConfig.endpoints) {
      const validation = validateTargetUrl(endpoint.url, settings.allowLocalTargets);
      if (!validation.valid) {
        return sendError(reply, 'INVALID_TARGET', validation.reason, 400);
      }
    }

    // Validate VUs and duration against settings
    if (testConfig.virtualUsers > settings.maxVirtualUsers) {
      return sendError(
        reply,
        'LIMIT_EXCEEDED',
        `Virtual users (${testConfig.virtualUsers}) exceeds maximum (${settings.maxVirtualUsers}). Adjust in settings.`,
        400,
      );
    }
    if (testConfig.duration > settings.maxDurationSeconds) {
      return sendError(
        reply,
        'LIMIT_EXCEEDED',
        `Duration (${testConfig.duration}s) exceeds maximum (${settings.maxDurationSeconds}s). Adjust in settings.`,
        400,
      );
    }

    // Create the run
    const run = await runService.createTestRun(testConfig.id);

    // Create and start the test engine
    const engine = new TestOrchestrator(testConfig, run.id);
    registerEngine(run.id, engine);

    // Wire engine events to SSE broadcasting
    engine.on('metrics', (snapshot) => broadcastSSE(run.id, 'metrics', snapshot));
    engine.on('status', (status) => broadcastSSE(run.id, 'statusChange', { status }));
    engine.on('log', (message, level) => broadcastSSE(run.id, 'log', { message, level }));
    engine.on('complete', (runId) => broadcastSSE(runId, 'complete', { runId }));
    engine.on('error', (message) => broadcastSSE(run.id, 'error', { message }));

    // Start engine (non-blocking)
    engine.start().catch((err) => {
      app.log.error(err, 'Engine start failed');
      broadcastSSE(run.id, 'error', { message: 'Engine start failed' });
    });

    sendSuccess(reply, { runId: run.id, status: RunStatus.RUNNING }, 201);
  });

  /** POST /api/runs/:id/cancel — Cancel a running test */
  app.post('/api/runs/:id/cancel', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const run = await runService.getTestRunById(params.data.id);
    if (!run) return sendNotFound(reply, 'Test run');

    if (run.status !== RunStatus.RUNNING && run.status !== RunStatus.PENDING) {
      return sendError(reply, 'INVALID_STATUS', 'Test is not currently running', 400);
    }

    // Cancel via engine if running, otherwise just update status
    const engine = getActiveEngine(params.data.id);
    if (engine) {
      await engine.cancel();
    } else {
      await runService.updateRunStatus(params.data.id, RunStatus.CANCELLED);
      broadcastSSE(params.data.id, 'statusChange', { status: RunStatus.CANCELLED });
    }

    sendSuccess(reply, { cancelled: true });
  });

  /** GET /api/runs/:id — Get test run results */
  app.get('/api/runs/:id', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const run = await runService.getTestRunById(params.data.id);
    if (!run) return sendNotFound(reply, 'Test run');
    sendSuccess(reply, run);
  });

  /** GET /api/runs/:id/stream — SSE stream for live metrics */
  app.get('/api/runs/:id/stream', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const run = await runService.getTestRunById(params.data.id);
    if (!run) return sendNotFound(reply, 'Test run');

    // Set up SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Register this client
    const runId = params.data.id;
    if (!sseClients.has(runId)) {
      sseClients.set(runId, new Set());
    }

    const send = (data: string): void => {
      reply.raw.write(data);
    };

    sseClients.get(runId)!.add(send);

    // Send initial connection event
    send(`event: connected\ndata: ${JSON.stringify({ runId })}\n\n`);

    // Cleanup on disconnect
    req.raw.on('close', () => {
      const clients = sseClients.get(runId);
      if (clients) {
        clients.delete(send);
        if (clients.size === 0) {
          sseClients.delete(runId);
        }
      }
    });
  });

  /** GET /api/runs/:id/export/json — Export report as JSON */
  app.get('/api/runs/:id/export/json', async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationError(reply, params.error.flatten());

    const run = await runService.getTestRunById(params.data.id);
    if (!run) return sendNotFound(reply, 'Test run');

    reply
      .header('Content-Type', 'application/json')
      .header('Content-Disposition', `attachment; filename="k9-report-${run.id}.json"`)
      .send(JSON.stringify(run, null, 2));
  });
}
