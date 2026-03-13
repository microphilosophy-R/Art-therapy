import 'dotenv/config';
import app from './app';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { verifyProductMediaSchema } from './lib/startupChecks';
import { startScheduledJobs } from './services/scheduler.service';
import { createServer } from 'http';
import { initSocketServer } from './lib/socket';
import { getClientOrigins } from './lib/clientOrigins';
import { getWechatDiagnostics } from './lib/wechatDiagnostics';
import { WECHAT_ENABLED } from './lib/wechat';

// Express 4 async route handlers do not automatically forward rejected promises
// to the global error handler. In Node.js 15+ an unhandled rejection crashes the
// process. Log it and keep the server alive so a single bad request doesn't take
// down every other in-flight connection.
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  // Verify DB connection
  await prisma.$connect();
  console.log('[DB] Connected to PostgreSQL');
  await verifyProductMediaSchema();
  console.log('[StartupCheck] Product media schema verified');

  // Connect Redis (non-fatal in development)
  try {
    await redis.connect();
    console.log('[Redis] Connected');
  } catch (err: any) {
    console.warn('[Redis] Could not connect:', err.message, '— continuing without Redis');
  }

  // Start cron jobs
  startScheduledJobs();

  const wechatDiagnostics = getWechatDiagnostics();
  if (WECHAT_ENABLED) {
    console.log('[WeChat] Provider enabled');
  } else if (wechatDiagnostics.enabledFlag) {
    console.warn(`[WeChat] Provider disabled: ${wechatDiagnostics.issues.join(' | ')}`);
  } else {
    console.log('[WeChat] Provider disabled by WECHAT_ENABLED flag');
  }

  const httpServer = createServer(app);
  initSocketServer(httpServer, getClientOrigins());

  httpServer.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

main().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
