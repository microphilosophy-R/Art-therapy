import 'dotenv/config';
import app from './app';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { startScheduledJobs } from './services/scheduler.service';

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  // Verify DB connection
  await prisma.$connect();
  console.log('[DB] Connected to PostgreSQL');

  // Connect Redis
  await redis.connect();
  console.log('[Redis] Connected');

  // Start cron jobs
  startScheduledJobs();

  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

main().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
