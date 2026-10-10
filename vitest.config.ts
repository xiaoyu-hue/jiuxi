// 九溪 · Vitest 配置（纯函数与单测，使用 happy-dom 模拟浏览器环境）
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts'],
    // 覆盖率报告（v8 提供器）；暂不设失败阈值，待 CI 转绿后再收紧
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      reporter: ['text', 'html'],
    },
  },
});
