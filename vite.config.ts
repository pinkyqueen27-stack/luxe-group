import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base 使用相對路徑 './',搭配 hash 路由(#/cart),
// 不論部署在 https://帳號.github.io/任意儲存庫名稱/ 或根網域都能正常載入。
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
