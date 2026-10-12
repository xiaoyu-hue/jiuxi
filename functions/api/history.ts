// 九溪 · 历史回顾数据接口（Cloudflare Pages Function）
//
// 部署在 Cloudflare Pages 时，本文件自动挂载为 /api/history，与站点同域。
// 数据源：D1 snapshots 表（由 scripts/save-history.mjs 在定时重建时写入）。
// 页面侧（public/history-client.js）优先读本接口，失败自动降级 IndexedDB，
// 因此在 GitHub Pages 备用站（无 Functions）上本接口 404，功能不受影响。
//
// 前置条件（需在 Cloudflare 仪表盘完成一次）：
//   Pages 项目 jiuxi → Settings → Functions → D1 database bindings
//   → Add binding：Variable name = DB，Database = jiuxi-history
//   → Production 与 Preview 两个环境各配一次。
// 未配置绑定时的行为：返回 503，页面走本地降级链。
//
// 注：本目录（functions/）不被 Astro 的 TS 程序纳入 astro check，故用宽松类型。

// 快照是历史事实，缓存 30 分钟无害，且能显著节省 D1 读取额度
// （免费额度 500 万行/天，本接口一次全量约 120 行）。
const CACHE_SECONDS = 1800;

/** 单行 payload 解析失败不应拖垮整个响应 */
function safeParse(raw: any) {
  try {
    const snap = JSON.parse(raw);
    if (snap && typeof snap === 'object' && snap.id && snap.date) return snap;
    return null;
  } catch {
    return null;
  }
}

export const onRequest = async (context: any) => {
  const request: Request = context.request;
  const here: URL = new URL(request.url);

  // days 参数：默认 30 天， clamp 到 [1, 90] 防止异常查询
  const daysParam = parseInt(here.searchParams.get('days') || '30', 10);
  const days = Math.min(Math.max(Number.isFinite(daysParam) ? daysParam : 30, 1), 90);

  const db = context.env && context.env.DB;
  if (!db) {
    // 绑定未配置：明确告知页面走降级链，而不是伪装成空数据
    return Response.json(
      { error: 'd1_binding_missing' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    // YYYY-MM-DD 字典序即时间序，字符串比较即可
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];

    const stmt = db
      .prepare('SELECT payload FROM snapshots WHERE date >= ? ORDER BY date DESC, section ASC')
      .bind(cutoffDate);
    const { results } = await stmt.all();

    const snapshots = [];
    for (const row of results || []) {
      const snap = safeParse(row.payload);
      if (snap) snapshots.push(snap);
    }

    return Response.json(
      { snapshots, days },
      {
        headers: {
          'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
        },
      },
    );
  } catch (e: any) {
    const msg = (e && e.message) || String(e);
    return Response.json(
      { error: 'query_failed', message: msg },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
