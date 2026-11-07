/**
 * Trader Shelf Worker：
 *   /api/crypto   反代币价源（CoinGecko→CoinLore→CoinCap 三级降级，边缘缓存 120s）
 *   /api/market   三市场行情聚合（移植自 stock-market-cloud backend/market-server.mjs，MIT）：
 *                 腾讯批量行情 + 边缘缓存 15s + universe 静态清单（scripts/gen-market-universe.mjs 生成）。
 *                 挂掉时前端自动回落浏览器直连腾讯（上游原生降级链，不需要本 worker 兜底）。
 * 静态资产仍由 assets 优先直出；未命中资产时由本 worker 兜 404（保持站内 404 页样式）；
 * /app/*（移植的看盘工具 SPA）统一加 X-Robots-Tag: noindex——工具页不吃搜索，抓取预算留给 SEO 层。
 */

// 中文名表与 scripts/fetch-data.mjs 共用同一份 JSON，避免两处漂移
import CN_NAMES from '../data/crypto-names.json'
// /api/market 股票池（US 505 / HK 500 / CN 5445，与 app/ 上游内置池同源）
import UNIVERSE from '../data/market-universe.json'

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

/* ================================================================
 * /api/market —— 三市场行情聚合（移植自 app/backend/market-server.mjs，MIT）
 * 契约与上游 Node 后端逐字段一致：{market, stocks[], isMock, source, universeCount,
 * lastUpdated, totalStocks, returnedStocks}；stocks[] 含 pe/volume（确定性合成指标）。
 * ================================================================ */

const MARKET_TENCENT_URL = 'https://qt.gtimg.cn/q='
const MARKET_CHUNK = 400 // 上游实测腾讯单次 ~800 稳定，取 400 保险
const MARKET_MAX_STOCKS = 1500 // 与前端 VITE_MARKET_LIMIT 默认一致
const MARKET_CACHE_TTL = 15 // 盘中边缘缓存秒数（前端 10s 轮询，15s 平衡上游限频）

// universe 静态清单 → 每市场 meta 表（symbol → {name, sector}），模块级构建一次
const MARKET_META = {
  US: new Map(UNIVERSE.US.map((s) => [s.symbol, s])),
  HK: new Map(UNIVERSE.HK.map((s) => [s.symbol, s])),
  CN: new Map(UNIVERSE.CN.map((s) => [s.symbol, s])),
}

// 上游符号规范化（保持一致，确保 meta 命中）
const normalizeUsSymbol = (s) => String(s || '').trim().replace('-', '.')
const normalizeHkSymbol = (s) => {
  const code = String(s || '').split('.')[0].replace(/\D/g, '')
  return code ? `${code.padStart(5, '0')}.HK` : ''
}
const normalizeCnSymbol = (s) => {
  const [rawCode = '', rawExchange = ''] = String(s || '').toUpperCase().split('.')
  const code = rawCode.replace(/\D/g, '')
  if (!code) return ''
  const exchange = rawExchange || (code.startsWith('6') ? 'SH' : 'SZ')
  return `${code.padStart(6, '0')}.${exchange}`
}
const getTencentCode = (symbol, market) => {
  if (market === 'HK') {
    const code = normalizeHkSymbol(symbol).split('.')[0]
    return code ? `hk${code}` : ''
  }
  if (market === 'CN') {
    const [code, exchange] = normalizeCnSymbol(symbol).split('.')
    return code && exchange ? `${exchange.toLowerCase()}${code}` : ''
  }
  return `us${String(symbol).replace('-', '.')}`
}

// 上游腾讯行解析：fields[1]=名称 [3]=价 [32]=涨跌% [45]=市值(亿)；meta 未知的符号直接丢弃
function parseTencentQuoteLine(line, market) {
  const parts = line.split('="')
  if (parts.length < 2) return null
  const rawTicker = parts[0].trim()
  const fields = parts[1].replace(/";?\s*$/, '').split('~')
  if (fields.length < 46) return null

  const symbol =
    market === 'HK'
      ? normalizeHkSymbol(rawTicker.replace('v_hk', ''))
      : market === 'CN'
        ? normalizeCnSymbol(rawTicker.replace('v_', ''))
        : rawTicker.replace('v_us', '')
  const price = Number.parseFloat(fields[3]) || 0
  const change = Number.parseFloat(fields[32]) || 0
  const marketCap = (Number.parseFloat(fields[45]) || 0) * 1e8
  const name = fields[1] || symbol
  if (!symbol || price <= 0 || !name || name === '0') return null

  const meta = MARKET_META[market].get(symbol)
  if (!meta) return null
  return { symbol, name: meta.name || name, price, change, marketCap, sector: meta.sector || 'Other' }
}

async function fetchTencentQuotes(market) {
  const symbols = UNIVERSE[market].map((s) => s.symbol)
  const chunks = []
  for (let i = 0; i < symbols.length; i += MARKET_CHUNK) chunks.push(symbols.slice(i, i + MARKET_CHUNK))

  const texts = await Promise.all(
    chunks.map(async (chunk) => {
      const codes = chunk.map((s) => getTencentCode(s, market)).filter(Boolean)
      if (!codes.length) return ''
      const res = await fetch(`${MARKET_TENCENT_URL}${codes.join(',')}&_=${Date.now()}`, {
        headers: { 'user-agent': UA, referer: 'https://gu.qq.com/' },
      })
      if (!res.ok) throw new Error(`tencent ${res.status} (${market})`)
      // 腾讯接口返回 GBK 编码
      return new TextDecoder('gbk').decode(await res.arrayBuffer())
    }),
  )

  const bySymbol = new Map()
  for (const text of texts) {
    for (const line of text.split(/\r?\n|;/).filter(Boolean)) {
      const stock = parseTencentQuoteLine(line, market)
      if (!stock) continue
      // 上游异常过滤：Other 板块 + 超大市值 ≈ GDR/ETF 脏数据；零市值/无名剔除
      if (stock.sector === 'Other' && stock.marketCap > 3000e8) continue
      if (stock.marketCap <= 0 || !stock.name) continue
      if (!bySymbol.has(stock.symbol)) bySymbol.set(stock.symbol, stock)
    }
  }
  if (!bySymbol.size) throw new Error(`no live quotes parsed for ${market}`)
  return Array.from(bySymbol.values()).sort((a, b) => b.marketCap - a.marketCap)
}

// 上游确定性合成指标（PE/成交量由 symbol 哈希生成，保证悬停 sparkline 稳定不闪）
function injectDerivedMetrics(stocks) {
  return stocks.map((stock) => {
    let hash = 0
    for (let i = 0; i < stock.symbol.length; i += 1) hash = stock.symbol.charCodeAt(i) + ((hash << 5) - hash)
    const pe = 10 + Math.abs(hash % 60)
    const volumeBase = stock.marketCap > 0 && stock.price > 0 ? stock.marketCap / stock.price / 1000 : 1000
    return { ...stock, pe, volume: Math.floor(volumeBase * (0.5 + Math.abs(hash % 10) / 10)) || 1000 }
  })
}

// 同 isolate 并发去重（同上游 refreshInFlight）
const marketInFlight = new Map()

async function buildMarketPayload(market) {
  const existing = marketInFlight.get(market)
  if (existing) return existing
  const promise = (async () => {
    const stocks = injectDerivedMetrics(await fetchTencentQuotes(market))
    return {
      market,
      stocks,
      isMock: false,
      source: 'worker:tencent',
      universeCount: UNIVERSE[market].length,
      lastUpdated: new Date().toISOString(),
      totalStocks: stocks.length,
      returnedStocks: stocks.length,
    }
  })().finally(() => marketInFlight.delete(market))
  marketInFlight.set(market, promise)
  return promise
}

const parseMarketParam = (v) => (v === 'HK' || v === 'CN' ? v : 'US')

async function handleMarketApi(request, env, ctx) {
  const url = new URL(request.url)
  if (url.pathname === '/api/health') {
    return Response.json({
      ok: true,
      universeCounts: { US: UNIVERSE.US.length, HK: UNIVERSE.HK.length, CN: UNIVERSE.CN.length },
      cacheTtl: MARKET_CACHE_TTL,
      universeGeneratedAt: UNIVERSE.generatedAt,
    })
  }

  const market = parseMarketParam(url.searchParams.get('type'))
  const limitRaw = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : MARKET_MAX_STOCKS

  // 边缘缓存：key 规范化为「仅含 type」（不同 limit 复用同一份全量缓存，命中后再切）
  const cache = caches.default
  const cacheKey = new Request(`https://tradershelf.com/api/market?type=${market}`)
  let payload = await cache.match(cacheKey)
  if (!payload) {
    const fresh = await buildMarketPayload(market)
    const body = Response.json(fresh, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // 浏览器不缓存（10s 轮询需实时感）；仅边缘缓存 15s
        'cache-control': 'public, max-age=0, s-maxage=' + MARKET_CACHE_TTL,
        'x-data-source': fresh.source,
      },
    })
    ctx.waitUntil(cache.put(cacheKey, body.clone()))
    payload = body
  }

  // limit 切片在缓存命中后统一做（缓存的是全量）
  const data = await payload.json()
  const effective = Math.min(limit, data.stocks.length)
  return Response.json(
    { ...data, stocks: data.stocks.slice(0, effective), returnedStocks: effective },
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=' + MARKET_CACHE_TTL,
        'x-data-source': data.source,
      },
    },
  )
}

/** 兜底静态资产：命中返回原响应，未命中回落到站内 404 页（而非白屏文本），并保持 404 状态码 */
async function serveAsset(request, env, url) {
  if (!env || !env.ASSETS) return new Response('Not Found', { status: 404 })
  const res = await env.ASSETS.fetch(request)
  if (res.status !== 404) {
    // /app/*（移植的看盘工具 SPA）统一 noindex：canvas 无文本，不吃搜索，抓取预算留给 SEO 层
    if (url.pathname === '/app' || url.pathname.startsWith('/app/')) {
      const headers = new Headers(res.headers)
      headers.set('x-robots-tag', 'noindex, nofollow')
      return new Response(res.body, { status: res.status, headers })
    }
    return res
  }

  // 资产层对 /404.html 可能先回 307（html_handling 去斜杠），逐个候选 + 跟随一次跳转
  for (const p of ['/404', '/404.html']) {
    let r = await env.ASSETS.fetch(new Request(new URL(p, url).toString(), { headers: request.headers }))
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location')
      if (loc) r = await env.ASSETS.fetch(new Request(new URL(loc, url).toString(), { headers: request.headers }))
    }
    if (r.status === 200) {
      const headers = new Headers(r.headers)
      headers.set('content-type', 'text/html; charset=utf-8')
      return new Response(r.body, { status: 404, headers })
    }
  }
  return new Response('Not Found', { status: 404 })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) {
      return serveAsset(request, env, url)
    }
    if (url.pathname === '/api/market' || url.pathname === '/api/health') {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })
      return handleMarketApi(request, env, ctx)
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
