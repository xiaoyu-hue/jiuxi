// 九溪 · 历史回顾页面客户端脚本
//
// 功能：从 IndexedDB 和静态文件加载历史数据并渲染
// 使用方式：在 history.astro 中通过 <script src="/history.js"> 引用

import {
  getHistoryList,
  cleanupExpiredData,
  isIndexedDBAvailable
} from '../lib/archive-history';

// DOM 元素
const historyList = document.getElementById('history-list');
const emptyState = document.getElementById('empty-state');
const dateFromInput = document.getElementById('date-from');
const dateToInput = document.getElementById('date-to');
const sectionFilter = document.getElementById('section-filter');
const refreshBtn = document.getElementById('refresh-btn');
const clearBtn = document.getElementById('clear-btn');

// 初始化日期范围
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

if (dateFromInput) dateFromInput.value = thirtyDaysAgo.toISOString().split('T')[0];
if (dateToInput) dateToInput.value = today.toISOString().split('T')[0];

if (!isIndexedDBAvailable()) {
  console.warn('[九溪] IndexedDB 不可用，将使用静态历史数据');
}

// 从静态文件加载历史数据
async function loadStaticHistory() {
  try {
    const response = await fetch('/history-index.json');
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.warn('[九溪] 加载静态历史数据失败:', error);
    return [];
  }
}

// 合并 IndexedDB 数据和静态数据
async function mergeHistoryData() {
  const dbSnapshots = await getHistoryList(undefined, 50);
  const staticSnapshots = await loadStaticHistory();
  const mergedMap = new Map();
  dbSnapshots.forEach(s => mergedMap.set(s.id, s));
  staticSnapshots.forEach(s => mergedMap.set(s.id, s));
  return Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}

// 加载统计数据
async function loadStats() {
  try {
    const allSnapshots = await mergeHistoryData();
    const dates = new Set(allSnapshots.map(s => s.date));
    const sections = {};
    allSnapshots.forEach(s => {
      sections[s.section] = (sections[s.section] || 0) + s.itemCount;
    });
    const statDays = document.getElementById('stat-days');
    const statItems = document.getElementById('stat-items');
    const statAi = document.getElementById('stat-ai');
    const statNews = document.getElementById('stat-news');
    if (statDays) statDays.textContent = String(dates.size);
    if (statItems) statItems.textContent = String(allSnapshots.reduce((sum, s) => sum + s.itemCount, 0));
    if (statAi) statAi.textContent = String(sections['ai'] || 0);
    if (statNews) statNews.textContent = String(sections['news'] || 0);
  } catch (error) {
    console.error('加载统计失败:', error);
  }
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 渲染单个板块组
function renderSectionGroup(snapshot) {
  const sectionLabels = { ai: 'AI 前沿', news: '热点新闻', tech: '科技动态', gaming: '游戏资讯' };
  const label = sectionLabels[snapshot.section] || snapshot.section;
  return `
    <div class="section-group">
      <h4 class="section-title">${label}</h4>
      <div class="item-list">
        ${snapshot.items.map((item, index) => `
          <div class="history-item">
            <span class="item-number">${String(index + 1).padStart(2, '0')}</span>
            <div class="item-content">
              <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="item-title">${item.title}</a>
              <div class="item-meta">
                <span class="item-source">${item.source || '资讯'}</span>
                ${item.pubDate ? `<span>${formatDate(item.pubDate)}</span>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 渲染历史列表
async function renderHistoryList(filterSection = 'all', dateFrom = '', dateTo = '') {
  try {
    const allSnapshots = await mergeHistoryData();
    if (!historyList || !emptyState) return;
    if (allSnapshots.length === 0) {
      historyList.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }
    historyList.style.display = 'flex';
    emptyState.style.display = 'none';
    let filtered = filterSection !== 'all'
      ? allSnapshots.filter(s => s.section === filterSection)
      : allSnapshots;
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
    filtered.forEach(snapshot => {
      if (!grouped[snapshot.date]) grouped[snapshot.date] = [];
      grouped[snapshot.date].push(snapshot);
    });
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    historyList.innerHTML = '';
    sortedDates.forEach(date => {
      const dateGroup = document.createElement('div');
      dateGroup.className = 'history-date-group';
      const totalItems = grouped[date].reduce((sum, s) => sum + s.itemCount, 0);
      const dateObj = new Date(date);
      const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dateObj.getDay()];
      dateGroup.innerHTML = `
        <div class="date-header">
          <span class="date-title">${date} <span class="date-badge">${weekday}</span></span>
          <span class="date-meta">${totalItems} 条资讯</span>
          <span class="toggle-icon">▼</span>
        </div>
        <div class="history-items">${grouped[date].map(snapshot => renderSectionGroup(snapshot)).join('')}</div>
      `;
      const header = dateGroup.querySelector('.date-header');
      if (header) {
        header.addEventListener('click', () => dateGroup.classList.toggle('collapsed'));
      }
      historyList.appendChild(dateGroup);
    });
  } catch (error) {
    console.error('渲染历史列表失败:', error);
    if (historyList) {
      historyList.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h3>加载失败</h3><p>请稍后重试</p></div>';
    }
  }
}

// 事件监听
if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '刷新中...';
    }
    if (historyList) {
      historyList.innerHTML = '<div class="loading-state"><span class="spinner"></span><p>正在刷新...</p></div>';
    }
    await Promise.all([
      loadStats(),
      renderHistoryList(sectionFilter?.value || 'all', dateFromInput?.value || '', dateToInput?.value || '')
    ]);
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '刷新历史';
    }
  });
}

if (sectionFilter) {
  sectionFilter.addEventListener('change', () => {
    renderHistoryList(sectionFilter.value, dateFromInput?.value || '', dateToInput?.value || '');
  });
}

if (dateFromInput) {
  dateFromInput.addEventListener('change', () => {
    renderHistoryList(sectionFilter?.value || 'all', dateFromInput.value, dateToInput?.value || '');
  });
}

if (dateToInput) {
  dateToInput.addEventListener('change', () => {
    renderHistoryList(sectionFilter?.value || 'all', dateFromInput?.value || '', dateToInput.value);
  });
}

if (clearBtn) {
  clearBtn.addEventListener('click', async () => {
    if (confirm('确定要清除所有历史数据吗？此操作不可恢复。')) {
      await cleanupExpiredData();
      await loadStats();
      await renderHistoryList();
    }
  });
}

// 初始加载
loadStats();
renderHistoryList();
