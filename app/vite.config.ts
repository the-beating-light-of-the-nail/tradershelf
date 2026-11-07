/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // 部署在 tradershelf.com/app 子目录（SEO 层 Nuxt 占根路径，工具层 SPA 占 /app）
  base: '/app',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api-yahoo': {
        target: 'https://qt.gtimg.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-yahoo/, ''),
      },
      '/api-jrj': {
        target: 'https://gateway.jrj.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-jrj/, ''),
      },
      '/api/market': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/api/refresh': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/api/health': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
