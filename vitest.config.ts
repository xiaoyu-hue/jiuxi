/// <nocheck>
// 九溪 · Vitest 配置（纯函数与 store 单测，使用 happy-dom 模拟浏览器环境）
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
