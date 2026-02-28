import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { createApp } from './app';

const workspaceEnvPath = resolve(process.cwd(), '../../.env');
if (existsSync(workspaceEnvPath)) {
  process.loadEnvFile(workspaceEnvPath);
}

const port = Number(process.env.PORT);
const host = process.env.HOST ?? '0.0.0.0';

const start = async () => {
  const app = createApp();

  try {
    await app.listen({ port, host });
    app.log.info({ port, host }, 'server started');
  } catch (error) {
    app.log.error(error, 'failed to start server');
    process.exit(1);
  }
};

void start();
