/**
 * Trader Shelf Worker：/api/crypto 反代币价源
 * 为什么需要它：CoinGecko 在大陆直连与常见代理下均不可达，浏览器拿不到数据；
 * Workers 跑在 Cloudflare 边缘（海外出口），可达且快。边缘 cache 120s 削免费额度限频。
 * 多源降级：CoinGecko（有 key 更稳）→ CoinLore → CoinCap。三者都挂才回 502，前端保留静态快照。
 * 静态资产仍由 assets 优先直出；未命中资产时由本 worker 兜 404（保持站内 404 页样式）。
 */

// 中文名表与 scripts/fetch-data.mjs 共用同一份 JSON，避免两处漂移
import CN_NAMES from '../data/crypto-names.json'

const UA = 'tradershelf/0.1 (+https://tradershelf.com)'
const LIMIT = 40

/** 统一输出形态：{code,name,cname,price,pct,mcap}（pct 为 24h 涨跌幅 %） */
const shape = (code, name, price, pct, mcap) => {
  const c = String(code || '').toUpperCase()
  return {
    code: c,
    name: name || c,
    cname: CN_NAMES[c] || name || c,
    price: typeof price === 'number' ? price : Number(price) || 0,
    pct: typeof pct === 'number' ? pct : Number(pct) || 0,
    mcap: typeof mcap === 'number' ? mcap : Number(mcap) || 0,
  }
}

const clean = (coins) =>
  coins
    .filter((c) => c.code && c.price > 0 && c.mcap > 0)
    .sort((a, b) => b.mcap - a.mcap)
    .slice(0, LIMIT)

/* ---------- 源 1：CoinGecko（有 Demo key 时额度更稳） ---------- */
async function fromCoinGecko(env) {
  const headers = { accept: 'application/json', 'user-agent': UA }
  if (env && env.COINGECKO_KEY) headers['x-cg-demo-api-key'] = env.COINGECKO_KEY
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${LIMIT}&page=1&price_change_percentage=24h`,
    { headers },
  )
  if (!res.ok) throw new Error('coingecko ' + res.status)
  const raw = await res.json()
  if (!Array.isArray(raw) || !raw.length) throw new Error('coingecko empty')
  return clean(raw.map((c) => shape(c.symbol, c.name, c.current_price, c.price_change_percentage_24h, c.market_cap)))
}

/* ---------- 源 2：CoinLore（免费无 key，额度宽松） ---------- */
async function fromCoinLore() {
  const res = await fetch(`https://api.coinlore.net/api/tickers/?start=0&limit=${LIMIT}`, {
    headers: { accept: 'application/json', 'user-agent': UA },
  })
  if (!res.ok) throw new Error('coinlore ' + res.status)
  const body = await res.json()
  const rows = body && body.data
  if (!Array.isArray(rows) || !rows.length) throw new Error('coinlore empty')
  return clean(rows.map((c) => shape(c.symbol, c.name, c.price_usd, c.percent_change_24h, c.market_cap_usd)))
}

/* ---------- 源 3：CoinCap（v2 公开端点） ---------- */
async function fromCoinCap() {
  const res = await fetch(`https://api.coincap.io/v2/assets?limit=${LIMIT}`, {
    headers: { accept: 'application/json', 'user-agent': UA },
  })
  if (!res.ok) throw new Error('coincap ' + res.status)
  const body = await res.json()
  const rows = body && body.data
  if (!Array.isArray(rows) || !rows.length) throw new Error('coincap empty')
  return clean(rows.map((c) => shape(c.symbol, c.name, c.priceUsd, c.changePercent24h, c.marketCapUsd)))
}

const SOURCES = [
  ['coingecko', fromCoinGecko],
  ['coinlore', fromCoinLore],
  ['coincap', fromCoinCap],
]

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

    const errors = []
    for (const [name, fn] of SOURCES) {
      try {
        const coins = await fn(env)
        if (!coins.length) throw new Error('empty after clean')
        const body = Response.json({ ok: true, source: name, updated: new Date().toISOString(), coins })
        body.headers.set('Cache-Control', 'public, max-age=120, s-maxage=120')
        body.headers.set('X-Data-Source', name)
        // 同步写边缘缓存（120s 后过期自动回源）
        ctx.waitUntil(cache.put(request, body.clone()))
        return body
      } catch (e) {
        errors.push(name + ': ' + (e && e.message ? e.message : 'fail'))
      }
    }
    return Response.json({ ok: false, error: errors.join(' | ') }, { status: 502 })
  },
}
