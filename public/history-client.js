// 九溪 · 历史回顾 — 客户端脚本（自包含，无外部依赖）

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

function saveHistorySnapshot(snapshot) {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(snapshot);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

function getHistoryList(section, limit) {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = section
      ? store.index('by_section').getAll(section)
      : store.getAll();
    request.onsuccess = () => {
      const results = request.result;
      results.sort((a, b) => b.timestamp - a.timestamp);
      resolve(limit ? results.slice(0, limit) : results);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  }));
}

function cleanupExpiredData() {
  const cutoff = Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return openDatabase().then(db => new Promise((resolve, reject) => {
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
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      }
    };
  }));
}

function isIndexedDBAvailable() {
  try { return !!window.indexedDB; } catch { return false; }
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
  } catch { return []; }
}

async function mergeHistoryData() {
  const db = await getHistoryList(undefined, 50);
  const staticData = await loadStaticHistory();
  const map = new Map();
  db.forEach(s => map.set(s.id, s));
  staticData.forEach(s => map.set(s.id, s));
  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
}

async function loadStats() {
  try {
    const all = await mergeHistoryData();
    const dates = new Set(all.map(s => s.date));
    const sections = {};
    all.forEach(s => { sections[s.section] = (sections[s.section] || 0) + s.itemCount; });
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
    set('stat-days', dates.size);
    set('stat-items', all.reduce((s, x) => s + x.itemCount, 0));
    set('stat-ai', sections['ai'] || 0);
    set('stat-news', sections['news'] || 0);
  } catch (e) { console.error('加载统计失败:', e); }
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function renderSectionGroup(snap) {
  const labels = { ai: 'AI 前沿', news: '热点新闻', tech: '科技动态', gaming: '游戏资讯' };
  const label = labels[snap.section] || snap.section;
  const itemsHtml = snap.items.map((item, i) => `
    <div class="history-item">
      <span class="item-number">${String(i + 1).padStart(2, '0')}</span>
      <div class="item-content">
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="item-title">${item.title}</a>
        <div class="item-meta">
          <span class="item-source">${item.source || '资讯'}</span>
          ${item.pubDate ? `<span>${fmtDate(item.pubDate)}</span>` : ''}
        </div>
      </div>
    </div>`).join('');
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
    let filtered = filterSection !== 'all' ? all.filter(s => s.section === filterSection) : all;
    if (dateFrom || dateTo) {
      filtered = filtered.filter(s => {
        if (dateFrom && s.date < dateFrom) return false;
        if (dateTo && s.date > dateTo) return false;
        return true;
      });
    }
    if (filtered.length === 0) {
      historyList.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>该时间段内无记录</h3><p>请尝试调整日期范围或清除筛选条件</p></div>';
      return;
    }
    const grouped = {};
    filtered.forEach(s => { (grouped[s.date] = grouped[s.date] || []).push(s); });
    const sorted = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    historyList.innerHTML = '';
    sorted.forEach(date => {
      const items = grouped[date];
      const total = items.reduce((s, x) => s + x.itemCount, 0);
      const weekday = ['周日','周一','周二','周三','周四','周五','周六'][new Date(date).getDay()];
      const div = document.createElement('div');
      div.className = 'history-date-group';
      div.innerHTML = `
        <div class="date-header">
          <span class="date-title">${date} <span class="date-badge">${weekday}</span></span>
          <span class="date-meta">${total} 条资讯</span>
          <span class="toggle-icon">▼</span>
        </div>
        <div class="history-items">${items.map(renderSectionGroup).join('')}</div>`;
      const header = div.querySelector('.date-header');
      if (header) header.addEventListener('click', () => div.classList.toggle('collapsed'));
      historyList.appendChild(div);
    });
  } catch (e) {
    console.error('渲染失败:', e);
    if (historyList) historyList.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h3>加载失败</h3><p>请稍后重试</p></div>';
  }
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '刷新中...';
    if (historyList) historyList.innerHTML = '<div class="loading-state"><span class="spinner"></span><p>正在刷新...</p></div>';
    await Promise.all([loadStats(), renderHistoryData()]);
    refreshBtn.disabled = false;
    refreshBtn.textContent = '刷新历史';
  });
}

function renderHistoryData() {
  return renderHistoryList(
    sectionFilter ? sectionFilter.value : 'all',
    dateFromInput ? dateFromInput.value : '',
    dateToInput ? dateToInput.value : ''
  );
}

if (sectionFilter) sectionFilter.addEventListener('change', renderHistoryData);
if (dateFromInput) dateFromInput.addEventListener('change', renderHistoryData);
if (dateToInput) dateToInput.addEventListener('change', renderHistoryData);

if (clearBtn) {
  clearBtn.addEventListener('click', async () => {
    if (confirm('确定要清除所有历史数据吗？此操作不可恢复。')) {
      await cleanupExpiredData();
      await loadStats();
      await renderHistoryData();
    }
  });
}

loadStats();
renderHistoryData();
