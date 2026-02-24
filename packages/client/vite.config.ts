import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const workspaceRoot = resolve(__dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspaceRoot, '');
  const clientPort = Number(env.CLIENT_PORT ?? 5173);
  const apiPort = Number(env.PORT ?? 3001);

  return {
    plugins: [react()],
    envDir: workspaceRoot,
    server: {
      port: clientPort,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
