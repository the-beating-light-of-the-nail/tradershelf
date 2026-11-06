/**
 * Trader Shelf Worker：/api/crypto 反代 CoinGecko
 * 为什么需要它：CoinGecko 在大陆直连与常见代理下均不可达，浏览器拿不到数据；
 * Workers 跑在 Cloudflare 边缘（海外出口），可达且快。边缘 cache 120s 削免费额度限频。
 * 静态资产仍由 assets 优先直出；未命中资产时由本 worker 兜 404（保持站内 404 页样式）。
 */

// 中文名表与 scripts/fetch-data.mjs 共用同一份 JSON，避免两处漂移
import CN_NAMES from '../data/crypto-names.json'

/** 兜底静态资产：命中返回原响应，未命中回落到站内 404 页（而非白屏文本） */
async function serveAsset(request, env, url) {
  if (env && env.ASSETS) {
    const res = await env.ASSETS.fetch(request)
    if (res.status !== 404) return res
    return env.ASSETS.fetch(new Request(new URL('/404.html', url).toString(), request))
  }
  return new Response('Not Found', { status: 404 })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) {
      return serveAsset(request, env, url)
    }
    if (url.pathname !== '/api/crypto') {
      return Response.json({ ok: false, error: 'unknown endpoint' }, { status: 404 })
    }
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    // 命中边缘缓存直接回
    const cache = caches.default
    const cached = await cache.match(request)
    if (cached) return cached

    try {
      const headers = {
        accept: 'application/json',
        'user-agent': 'tradershelf/0.1 (+https://tradershelf.com)',
      }
      // 有 Demo API Key 时带上（免费额度更稳；未配置也能跑公开额度）
      if (env && env.COINGECKO_KEY) headers['x-cg-demo-api-key'] = env.COINGECKO_KEY
      const upstream = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=40&page=1&price_change_percentage=24h',
        { headers },
      )
      if (!upstream.ok) {
        return Response.json({ ok: false, error: 'upstream ' + upstream.status }, { status: 502 })
      }
      const raw = await upstream.json()
      const coins = (Array.isArray(raw) ? raw : []).map((c) => {
        const code = String(c.symbol || '').toUpperCase()
        return {
          code,
          name: c.name || code,
          cname: CN_NAMES[code] || c.name || code,
          price: c.current_price,
          pct: c.price_change_percentage_24h ?? 0,
          mcap: c.market_cap || 0,
        }
      })
      if (!coins.length) {
        return Response.json({ ok: false, error: 'empty upstream payload' }, { status: 502 })
      }
      const body = Response.json({ ok: true, updated: new Date().toISOString(), coins })
      body.headers.set('Cache-Control', 'public, max-age=120, s-maxage=120')
      body.headers.set('X-Data-Source', 'coingecko')
      // 同步写边缘缓存（120s 后过期自动回源）
      ctx.waitUntil(cache.put(request, body.clone()))
      return body
    } catch (e) {
      return Response.json({ ok: false, error: 'fetch failed' }, { status: 502 })
    }
  },
}
