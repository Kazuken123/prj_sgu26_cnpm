import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Khong tu y doi sang port khac ngoai cau hinh CORS cua backend
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://127.0.0.1:18080',
      '/health': 'http://127.0.0.1:18080'
    }
  },
  preview: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1'
  }
});
