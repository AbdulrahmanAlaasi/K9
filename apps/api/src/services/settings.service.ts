import { prisma } from '../db/client.js';
import type { AppSettings, UpdateSettingsInput } from '@k9/shared';

/**
 * Retrieves the current app settings (always row id=1).
 */
export async function getSettings(): Promise<AppSettings> {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 1,
        allowLocalTargets: false,
        maxVirtualUsers: 100,
        maxDurationSeconds: 600,
        maxRequestsPerSecond: 500,
      },
    });
  }
  return settings;
}

/**
 * Updates app settings.
 */
export async function updateSettings(input: UpdateSettingsInput): Promise<AppSettings> {
  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: {
      ...(input.allowLocalTargets !== undefined && {
        allowLocalTargets: input.allowLocalTargets,
      }),
      ...(input.maxVirtualUsers !== undefined && {
        maxVirtualUsers: input.maxVirtualUsers,
      }),
      ...(input.maxDurationSeconds !== undefined && {
        maxDurationSeconds: input.maxDurationSeconds,
      }),
      ...(input.maxRequestsPerSecond !== undefined && {
        maxRequestsPerSecond: input.maxRequestsPerSecond,
      }),
    },
  });
  return settings;
}
