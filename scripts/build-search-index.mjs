// 九溪 · 构建期生成站内搜索索引
//
// 扫描 src/content/{timeline,tools,reading} 的 Markdown，
// 生成 public/search-index.json：{ items: [{ type, title, category, url, snippet }] }。
// 供 SearchOverlay 客户端「本地优先」搜索——零额外后端、零额外请求成本、可离线。
//
// 依赖：仅 Node 内置模块（不引第三方 YAML 解析库，避免增加依赖面与构建脆弱点）。
// 通过 package.json 的 `build` 脚本在 astro build 之前执行（CI 与本地一致）。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const OUT_DIR = path.join(ROOT, 'public');
const OUT_FILE = path.join(OUT_DIR, 'search-index.json');

// 极简 frontmatter 解析：取首个 `---` 块内的 `key: value`（支持双引号字符串）。
// 仅用于读取搜索所需的标量字段，不追求完整 YAML 语义（内容文件结构稳定、字段简单）。
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const key = line.slice(0, idx).trim();
      if (!key) continue;
      let val = line.slice(idx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      fm[key] = val;
    }
  }
  const body = m ? raw.slice(m[0].length) : raw;
  return { fm, body };
}

// 从正文剥离 Markdown，取前 N 字作摘要（去掉代码块 / 链接 / 标记 / HTML 标签）。
function snippet(body, n = 120) {
  const text = body
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~`-]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, n);
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

// 三类策展内容：目录 / 展示用中文类型名 / 列表页路径
const TYPES = [
  { dir: 'timeline', type: '时间线', page: '/timeline' },
  { dir: 'tools', type: '工具箱', page: '/tools' },
  { dir: 'reading', type: '读书', page: '/reading' },
];

const items = [];
for (const { dir, type, page } of TYPES) {
  const base = path.join(CONTENT_DIR, dir);
  for (const file of walk(base)) {
    const raw = fs.readFileSync(file, 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    // glob loader 的 id = 相对 base 的路径去掉 .md 后缀；用作页面锚点，保证可深链。
    const id = path.relative(base, file).replace(/\\/g, '/').replace(/\.md$/, '');
    const title = fm.title || fm.name || id;
    if (!title) continue;
    items.push({
      type,
      title,
      category: fm.category || '',
      url: `${page}#${id}`,
      snippet: snippet(body),
    });
  }
}

// 按类型、标题稳定排序，便于审阅与缓存命中
items.sort((a, b) => a.type.localeCompare(b.type, 'zh') || a.title.localeCompare(b.title, 'zh'));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify({ items }));

console.log(`[九溪] 搜索索引已生成：${items.length} 条 → ${path.relative(ROOT, OUT_FILE)}`);
