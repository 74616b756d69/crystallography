import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        // docker-compose では backend サービス、ローカル単体起動では BACKEND_ORIGIN で上書きできる。
        target: process.env.BACKEND_ORIGIN ?? 'http://backend:3000',
        changeOrigin: true,
      },
    },
  },
});