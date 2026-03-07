import cluster from 'node:cluster';
import { existsSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';

import { createApp } from './app';

const workspaceEnvPath = resolve(process.cwd(), '../../.env');
if (existsSync(workspaceEnvPath)) {
  process.loadEnvFile(workspaceEnvPath);
}

const parsedPort = Number(process.env.PORT);
const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3001;
const host = process.env.HOST ?? '0.0.0.0';

const parsePositiveInt = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isTestRuntime =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.VITEST_WORKER_ID !== undefined;

const resolveWorkerCount = (): number => {
  const configured = parsePositiveInt(process.env.FINAPP_SERVER_WORKERS);
  if (configured !== null) {
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    return Math.max(1, availableParallelism() - 1);
  }

  return 1;
};

const startWorker = async () => {
  const app = createApp();

  try {
    await app.listen({ port, host });
    app.log.info({ port, host, pid: process.pid }, 'server started');
  } catch (error) {
    app.log.error(error, 'failed to start server');
    process.exit(1);
  }
};

const workerCount = resolveWorkerCount();

if (!isTestRuntime && workerCount > 1 && cluster.isPrimary) {
  // Run one Fastify worker per process for true multi-core throughput under compare/stress fan-out.
  console.info(`starting clustered server with ${workerCount} workers`);
  for (let index = 0; index < workerCount; index += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(
      `worker ${worker.process.pid} exited (code=${code ?? 'n/a'}, signal=${signal ?? 'n/a'}); restarting`,
    );
    if (!worker.exitedAfterDisconnect) {
      cluster.fork();
    }
  });
} else {
  void startWorker();
}
