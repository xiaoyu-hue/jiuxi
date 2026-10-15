// 九溪 · Vitest 配置（纯函数与单测，使用 happy-dom 模拟浏览器环境）
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts'],
    // 覆盖率报告（v8 提供器）。
    // 阈值（2026-10-15 审查 M23 设置）：CI 的 test job 已转强制门禁，
    // 覆盖率同步设防跌阈值——低于当前实测值约 7-9 个百分点，既防回归
    // 又不至于因小幅波动误伤。motion.ts 为三家第三方动效库的胶水层
    // （IntersectionObserver/Lenis/autoAnimate），测试需大量 mock、价值低，
    // 暂不覆盖，其缺口已计入下方阈值余量。
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      reporter: ['text', 'html'],
      thresholds: {
        statements: 75,
        branches: 60,
        functions: 70,
        lines: 75,
      },
    },
  },
});
