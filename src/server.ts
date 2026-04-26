import { createApp } from './app';
import { env } from './config/env';
import { closePool } from './config/db';
import { closeRedis } from './config/redis';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[server] listening on http://localhost:${env.port}`);
  console.log(`[server] env=${env.nodeEnv}, redis=${env.redisEnabled ? 'on' : 'off'}`);
});

async function shutdown(signal: string) {
  console.log(`[server] received ${signal}, shutting down`);
  server.close(async () => {
    await Promise.allSettled([closePool(), closeRedis()]);
    process.exit(0);
  });
  // hard-exit safety net
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
