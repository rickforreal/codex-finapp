import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const clientPort = Number(process.env.CLIENT_PORT ?? 5173);
const apiPort = Number(process.env.PORT ?? 3001);

export default defineConfig({
  plugins: [react()],
  server: {
    port: clientPort,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});
