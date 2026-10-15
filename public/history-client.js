// 九溪 · 历史回顾 — 客户端脚本（自包含，无外部依赖）

/* ── 安全工具（与 src/lib/security.ts 行为对齐：转义 + URL 协议白名单）──
 * 外部来源（RSS / 云端快照）的标题、来源、链接不可信：直接拼进 innerHTML/href
 * 会触发存储型 DOM-XSS（全站 CSP 含 unsafe-inline 时注入即可执行）。
 * 这里仅放行 http/https/mailto 与站内相对路径，其余一律降级为 "#"。
 */
function escapeHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
  const u = String(url == null ? '' : url).trim();
  if (u === '') return '#';
  // eslint-disable-next-line no-control-regex -- 故意匹配控制字符以拦截构造型 URL（与 src/lib/security.ts 行为对齐）
  if (/[\u0000-\u001f\u007f]/.test(u)) return '#'; // 含控制字符视为构造型输入，拦截
  if (u.startsWith('//')) return '#'; // 协议相对 URL 按危险处理（开放重定向/钓鱼）
  if (u.startsWith('#')) return u;
  if (/^(\/|\.\/|\.\.\/)/.test(u)) return u; // 站内相对路径放行
  try {
    const parsed = new URL(u);
    if (/^(https?:|mailto:)$/i.test(parsed.protocol)) return u;
  } catch {
    /* 非合法绝对 URL */
  }
  return '#';
}

/* ── IndexedDB 历史归档 ────────────────────────────────────────── */
const DB_NAME = 'jiuxi-history';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const KEY_PATH = 'id';
const EXPIRY_DAYS = 30;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: KEY_PATH });
        store.createIndex('by_date', 'date', { unique: false });
        store.createIndex('by_section', 'section', { unique: false });
        store.createIndex('by_date_section', ['date', 'section'], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* 批量写入（一个事务多条 put）：云端数据一次性缓存到本地时使用 */
function saveHistorySnapshots(snapshots) {
  if (!snapshots || snapshots.length === 0) return Promise.resolve();
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const s of snapshots) store.put(s);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

function getHistoryList(section, limit) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = section ? store.index('by_section').getAll(section) : store.getAll();
        request.onsuccess = () => {
          const results = request.result;
          results.sort((a, b) => b.timestamp - a.timestamp);
          resolve(limit ? results.slice(0, limit) : results);
        };
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

function cleanupExpiredData() {
  const cutoff = Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const idx = store.index('by_date');
        const req = idx.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            if (cursor.value.timestamp < cutoff) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error);
            };
          }
        };
      }),
  );
}

function isIndexedDBAvailable() {
  try {
    return !!window.indexedDB;
  } catch {
    return false;
  }
}

/* ── 云端数据源（阶段 2 新增）─────────────────────────────────────
 * /api/history 是 Cloudflare Pages Function，读 D1 snapshots 表，
 * 返回 { snapshots: [...] }，结构与 IndexedDB 中的快照完全同构。
 * 失败（404/网络错/503 未配绑定）时静默返回 []，由后续降级链兜底。
 */
async function loadCloudHistory(days = 30) {
  try {
    const r = await fetch(`/api/history?days=${days}`, { cache: 'reload' });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data && data.snapshots) ? data.snapshots : [];
  } catch {
    return [];
  }
}

/* ── 渲染逻辑 ─────────────────────────────────────────────────── */
const historyList = document.getElementById('history-list');
const emptyState = document.getElementById('empty-state');
const dateFromInput = document.getElementById('date-from');
const dateToInput = document.getElementById('date-to');
const sectionFilter = document.getElementById('section-filter');
const refreshBtn = document.getElementById('refresh-btn');
const clearBtn = document.getElementById('clear-btn');

if (dateFromInput) {
  const today = new Date();
  const thirtyAgo = new Date(today);
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  dateFromInput.value = thirtyAgo.toISOString().split('T')[0];
  dateToInput.value = today.toISOString().split('T')[0];
}

if (!isIndexedDBAvailable()) {
  console.warn('[九溪] IndexedDB 不可用');
}

async function loadStaticHistory() {
  try {
    const r = await fetch('/history-index.json');
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [data];
  } catch {
    return [];
  }
}

/* 三源合并（阶段 2 起云端为权威源）：
 *   ① /api/history（D1 云端，服务端持久，换设备/清缓存不丢）
 *   ② IndexedDB（本地缓存：今日尚未定时写入的快照、离线时的数据）
 *   ③ /history-index.json（构建期静态索引，历史遗留源）
 * 同 id 时云端覆盖本地（云端是最新一次定时重建的结果）。
 * 云端数据顺手写入 IndexedDB，离线/无 Functions 的环境（GitHub Pages）也能用。
 */
async function mergeHistoryData() {
  const map = new Map();

  const staticData = await loadStaticHistory();
  staticData.forEach((s) => map.set(s.id, s));

  const db = await getHistoryList(undefined, 50);
  db.forEach((s) => map.set(s.id, s));

  const cloud = await loadCloudHistory();
  cloud.forEach((s) => map.set(s.id, s));

  if (cloud.length > 0) {
    // 缓存失败仅影响离线兜底，不阻断渲染
    saveHistorySnapshots(cloud).catch(() => {});
  }

  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
}

async function loadStats() {
  try {
    const all = await mergeHistoryData();
    const dates = new Set(all.map((s) => s.date));
    const sections = {};
    all.forEach((s) => {
      sections[s.section] = (sections[s.section] || 0) + s.itemCount;
    });
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    set('stat-days', dates.size);
    set(
      'stat-items',
      all.reduce((s, x) => s + x.itemCount, 0),
    );
    set('stat-ai', sections['ai'] || 0);
    set('stat-news', sections['news'] || 0);
  } catch (e) {
    console.error('加载统计失败:', e);
  }
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function renderSectionGroup(snap) {
  const labels = { ai: 'AI 前沿', news: '热点新闻', tech: '科技动态', gaming: '游戏资讯' };
  const label = labels[snap.section] || escapeHtml(snap.section);
  const itemsHtml = snap.items
    .map(
      (item, i) => `
    <div class="history-item">
      <span class="item-number">${String(i + 1).padStart(2, '0')}</span>
      <div class="item-content">
        <a href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener noreferrer" class="item-title">${escapeHtml(item.title)}</a>
        <div class="item-meta">
          <span class="item-source">${escapeHtml(item.source) || '资讯'}</span>
          ${item.pubDate ? `<span>${fmtDate(item.pubDate)}</span>` : ''}
        </div>
      </div>
    </div>`,
    )
    .join('');
  return `<div class="section-group"><h4 class="section-title">${label}</h4><div class="item-list">${itemsHtml}</div></div>`;
}

async function renderHistoryList(filterSection = 'all', dateFrom = '', dateTo = '') {
  try {
    if (!historyList || !emptyState) return;
    const all = await mergeHistoryData();
    if (all.length === 0) {
      historyList.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }
    historyList.style.display = 'flex';
    emptyState.style.display = 'none';
    let filtered = filterSection !== 'all' ? all.filter((s) => s.section === filterSection) : all;
    if (dateFrom || dateTo) {
      filtered = filtered.filter((s) => {
        if (dateFrom && s.date < dateFrom) return false;
        if (dateTo && s.date > dateTo) return false;
        return true;
      });
    }
    if (filtered.length === 0) {
      historyList.innerHTML =
        '<div class="empty-state"><div class="empty-icon">🔍</div><h3>该时间段内无记录</h3><p>请尝试调整日期范围或清除筛选条件</p></div>';
      return;
    }
    // 修复：原版写成 (grouped[s.date] || []).push(s)，临时数组从未赋值回 grouped，分组全部丢失
    const grouped = {};
    filtered.forEach((s) => {
      (grouped[s.date] = grouped[s.date] || []).push(s);
    });
    const sorted = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    historyList.innerHTML = '';
    sorted.forEach((date) => {
      const items = grouped[date];
      const total = items.reduce((s, x) => s + x.itemCount, 0);
      const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][
        new Date(date).getDay()
      ];
      const div = document.createElement('div');
      div.className = 'history-date-group';
      // 键盘可达：分组头用 <button> 而非 <div>+click（2026-10-15 审查修复 H2），
      // 初始展开态 aria-expanded="true"；date 来自 D1 外部数据，必须转义（H5）。
      div.innerHTML = `
        <button type="button" class="date-header" aria-expanded="true">
          <span class="date-title">${escapeHtml(date)} <span class="date-badge">${escapeHtml(weekday)}</span></span>
          <span class="date-meta">${total} 条资讯</span>
          <span class="toggle-icon" aria-hidden="true">▼</span>
        </button>
        <div class="history-items">${items.map(renderSectionGroup).join('')}</div>`;
      const header = div.querySelector('.date-header');
      if (header)
        header.addEventListener('click', () => {
          const collapsed = div.classList.toggle('collapsed');
          header.setAttribute('aria-expanded', String(!collapsed));
        });
      historyList.appendChild(div);
    });
  } catch (e) {
    console.error('渲染失败:', e);
    if (historyList)
      historyList.innerHTML =
        '<div class="empty-state"><div class="empty-icon">❌</div><h3>加载失败</h3><p>请稍后重试</p></div>';
  }
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '刷新中...';
    if (historyList)
      historyList.innerHTML =
        '<div class="loading-state"><span class="spinner"></span><p>正在刷新...</p></div>';
    await Promise.all([loadStats(), renderHistoryData()]);
    refreshBtn.disabled = false;
    refreshBtn.textContent = '刷新历史';
  });
}

function renderHistoryData() {
  return renderHistoryList(
    sectionFilter ? sectionFilter.value : 'all',
    dateFromInput ? dateFromInput.value : '',
    dateToInput ? dateToInput.value : '',
  );
}

if (sectionFilter) sectionFilter.addEventListener('change', renderHistoryData);
if (dateFromInput) dateFromInput.addEventListener('change', renderHistoryData);
if (dateToInput) dateToInput.addEventListener('change', renderHistoryData);

if (clearBtn) {
  clearBtn.addEventListener('click', async () => {
    if (confirm('确定要清除本地缓存吗？云端历史数据不受影响，重新加载即可恢复。')) {
      await cleanupExpiredData();
      await loadStats();
      await renderHistoryData();
    }
  });
}

loadStats();
renderHistoryData();
