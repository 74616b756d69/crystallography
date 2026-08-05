import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        // docker-compose 以外（ローカル直起動）では API_PROXY_TARGET で差し替える。
        target: process.env.API_PROXY_TARGET ?? 'http://backend:3000',
        changeOrigin: true,
      },
    },
  },
});