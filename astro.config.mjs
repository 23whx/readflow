// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server', // 启用服务器渲染以支持API端点
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['pdfjs-dist']
    },
    worker: {
      format: 'es'
    }
  }
});