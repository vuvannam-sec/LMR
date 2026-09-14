import app from './app.js';
import { env } from './config/env.js';
import prisma from './config/database.js';

const server = app.listen(env.PORT, () => {
  console.log(`LMS API listening on http://localhost:${env.PORT}`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received; shutting down`);

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } finally {
      if (error) {
        console.error('HTTP server shutdown failed:', error);
        process.exit(1);
      }
      process.exit(0);
    }
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
