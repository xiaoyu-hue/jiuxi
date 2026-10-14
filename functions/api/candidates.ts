// 九溪 · 候选读取接口（Cloudflare Pages Function）
//
// 挂载为 /api/candidates，与站点同域。返回 D1 candidates 表中已聚簇去重的候选，
// 供「候选策展台 /curate」展示——实现跨会话留痕、离线可看（B-2 持久化）。
//
// 行为（优雅降级，绝不白屏）：
//   - 缺 D1 绑定 → 503 {error:'d1_binding_missing'}，前端回退实时聚合端点；
//   - 该板块 0 行 → {items:[]}，前端同样回退实时聚合（聚合端点会写穿回填 D1）；
//   - 查询异常 → 500 {error:'query_failed'}，前端回退实时聚合。
//
// 写入侧在 functions/api/feed.ts 的聚合分支（?aggregate=1）写穿完成，本接口只读。
// 前置：candidates 表由 scripts/ensure-candidates.mjs 幂等建表（需 Cloudflare 凭证）。

export const onRequest = async (context: any) => {
  const request: Request = context.request;
  const here: URL = new URL(request.url);
  const section = here.searchParams.get('section');
  if (!section) return new Response('missing section', { status: 400 });

  const db = context.env && context.env.DB;
  if (!db) {
    return Response.json(
      { error: 'd1_binding_missing', items: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const stmt = db
      .prepare(
        'SELECT section, title, url, source, source_list, snippet, pub_date, cluster_size FROM candidates WHERE section=? ORDER BY updated_at DESC LIMIT 30',
      )
      .bind(section);
    const { results } = await stmt.all();

    const items = (results || []).map((r: any) => {
      let sources: string[] = [];
      try {
        sources = JSON.parse(r.source_list || '[]');
      } catch {
        /* ignore */
      }
      if (!Array.isArray(sources) || !sources.length) {
        sources = r.source ? [r.source] : [];
      }
      return {
        title: r.title,
        link: r.url,
        source: sources.length ? sources.join(' · ') : r.source || '资讯',
        sources,
        snippet: r.snippet || undefined,
        pubDate: r.pub_date || undefined,
      };
    });

    return Response.json(
      { items, from: 'd1' },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } },
    );
  } catch (e: any) {
    const msg = (e && e.message) || String(e);
    return Response.json(
      { error: 'query_failed', message: msg, items: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
