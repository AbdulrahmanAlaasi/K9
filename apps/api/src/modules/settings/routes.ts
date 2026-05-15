import type { FastifyInstance } from 'fastify';
import { updateSettingsSchema } from '../../schemas/validation.js';
import * as settingsService from '../../services/settings.service.js';
import { sendSuccess, sendValidationError } from '../../utils/response.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  /** GET /api/settings — Get current settings */
  app.get('/api/settings', async (_req, reply) => {
    const settings = await settingsService.getSettings();
    sendSuccess(reply, settings);
  });

  /** PUT /api/settings — Update settings */
  app.put('/api/settings', async (req, reply) => {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error.flatten());

    const settings = await settingsService.updateSettings(parsed.data);
    sendSuccess(reply, settings);
  });
}
