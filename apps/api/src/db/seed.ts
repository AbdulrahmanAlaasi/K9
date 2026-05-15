import { prisma } from './client.js';

/**
 * Seeds the database with default settings if none exist.
 */
export async function seedDefaults(): Promise<void> {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!existing) {
    await prisma.settings.create({
      data: {
        id: 1,
        allowLocalTargets: false,
        maxVirtualUsers: 100,
        maxDurationSeconds: 600,
        maxRequestsPerSecond: 500,
      },
    });
    console.log('[seed] Default settings created.');
  }
}

// Run directly with: tsx src/db/seed.ts
seedDefaults()
  .then(() => {
    console.log('[seed] Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
