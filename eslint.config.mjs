// 九溪 · ESLint 扁平配置（ESLint 9 + typescript-eslint + eslint-plugin-astro）
// 与 Prettier 配合：eslint-config-prettier 关闭所有与格式冲突的规则，格式交给 Prettier。
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/data', 'coverage', '.astro'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // 项目历史使用 any（db.ts / feeds.ts 解析层），先放宽为 off，后续逐步收紧
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      // 动态 HTML 拼接（renderItems / 设置页）依赖 innerHTML + set:html，属已知设计
      'astro/no-set-html-directive': 'off',
    },
  },
);
