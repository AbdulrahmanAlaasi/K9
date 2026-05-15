import { buildApp } from './app.js';
import { prisma } from './db/client.js';
import { API_DEFAULTS } from '@k9/shared';

const PORT = Number(process.env.PORT) || API_DEFAULTS.PORT;
const HOST = process.env.HOST || API_DEFAULTS.HOST;

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    // Ensure database connection
    await prisma.$connect();
    console.log('[db] Connected to SQLite database');

    // Seed default settings if needed
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      await prisma.settings.create({
        data: {
          id: 1,
          allowLocalTargets: false,
          maxVirtualUsers: 100,
          maxDurationSeconds: 600,
          maxRequestsPerSecond: 500,
        },
      });
      console.log('[db] Default settings initialized');
    }

    await app.listen({ port: PORT, host: HOST });
    console.log(`\n  🐕 K9 API running at http://localhost:${PORT}\n`);
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('\n[server] Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main();
