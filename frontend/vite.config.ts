import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const target = env.API_PROXY_TARGET || 'http://127.0.0.1:3000';
  const proxy = { '/api': { target, changeOrigin: true }, '/health': { target, changeOrigin: true } };
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      host: '127.0.0.1',
      proxy
    },
    preview: {
      port: 5173,
      strictPort: true,
      host: '127.0.0.1',
      proxy
    }
  };
});
