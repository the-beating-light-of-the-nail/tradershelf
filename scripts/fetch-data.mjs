#!/usr/bin/env node
/**
 * Trader Shelf · 行情快照抓取（构建前运行：npm run data）
 * 数据源：东方财富公开行情接口（直连，无需代理）
 * 产出：data/snapshot.json + data/archive/<交易日>.json
 * 失败策略：A股核心数据失败 → 写入 stale 兜底快照，保证构建可继续（页面标注"数据延迟"）
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import https from 'node:https'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'

function get(url, retries = 2) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = https.get(url, { headers: { 'User-Agent': UA, Referer: 'https://quote.eastmoney.com/' }, timeout: 15000 }, (r) => {
        let s = ''
        r.on('data', (c) => (s += c))
        r.on('end', () => {
          try { resolve(JSON.parse(s)) } catch (e) { n > 0 ? attempt(n - 1) : reject(e) }
        })
      })
      req.on('error', (e) => (n > 0 ? attempt(n - 1) : reject(e)))
      req.on('timeout', () => { req.destroy(); n > 0 ? attempt(n - 1) : reject(new Error('timeout ' + url.slice(0, 80))) })
    }
    attempt(retries)
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 分页拉取 clist 全量 */
async function clistAll(fs, fields, fid = 'f12', maxPages = 80) {
  const out = []
  for (let pn = 1; pn <= maxPages; pn++) {
    const u = `https://push2.eastmoney.com/api/qt/clist/get?pn=${pn}&pz=100&po=1&np=1&fltt=2&invt=2&fid=${fid}&fs=${encodeURIComponent(fs)}&fields=${fields}`
    const d = await get(u)
    const diff = d?.data?.diff
    if (!diff) break
    out.push(...Object.values(diff))
    if (out.length >= d.data.total) break
    await sleep(80)
  }
  return out
}

const fmt = {
  stock: (x) => ({ code: x.f12, name: x.f14, price: x.f2, pct: x.f3, amount: x.f6 || 0, mcap: x.f20 || 0, fmcap: x.f21 || 0, ind: x.f100 || '', mkt: x.f13 }),
}

async function main() {
  const meta = { fetchedAt: new Date().toISOString(), stale: [], tradeDate: '' }
  const snap = { meta, a: null, us: null, hk: null, crypto: null, indices: null, sectors: [], boards: null }

  // ---------- 1) 指数（含恒生/纳指，f124=行情时间 → 交易日） ----------
  try {
    const idx = await get('https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&secids=1.000001,0.399001,0.399006,1.000300,1.000905,1.000688,100.HSI,100.NDX,100.SPX,100.DJIA&fields=f2,f3,f12,f14,f124')
    snap.indices = Object.values(idx.data.diff).map((x) => ({ code: x.f12, name: x.f14, price: x.f2, pct: x.f3 }))
    const ts = idx.data.diff?.[0]?.f124 ? idx.data.diff[0].f124 * 1000 : Date.now()
    meta.tradeDate = new Date(ts + 8 * 3600e3).toISOString().slice(0, 10) // 东八区交易日
  } catch (e) { meta.stale.push('indices') }

  // ---------- 2) A股全量（涨跌家数 + 全景 treemap 用前 600） ----------
  try {
    const raw = await clistAll('m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048', 'f2,f3,f6,f12,f13,f14,f20,f21,f100', 'f21', 70)
    const stocks = raw.map(fmt.stock).filter((s) => typeof s.pct === 'number' && s.fmcap > 0)
    const up = stocks.filter((s) => s.pct > 0).length
    const down = stocks.filter((s) => s.pct < 0).length
    const flat = stocks.length - up - down
    const amount = stocks.reduce((s, x) => s + (x.amount || 0), 0)
    snap.a = {
      total: stocks.length, up, down, flat, amount,
      top: stocks.slice(0, 600), // 已按流通市值降序（fid=f21&po=1）
    }
  } catch (e) { meta.stale.push('a'); console.error('[warn] A股抓取失败:', e.message) }

  // ---------- 3) 板块列表（行业+概念；板块页 BK 码解析 / 冷暖榜 / 资金流） ----------
  let boards = []
  try {
    boards = await clistAll('m:90+t:2,m:90+t:3', 'f3,f12,f14,f62,f104,f105', 'f3', 14)
    boards = boards.map((b) => ({ bk: b.f12, name: b.f14, pct: b.f3, flow: b.f62 || 0, up: b.f104 || 0, down: b.f105 || 0 }))
    // 冷暖榜：只保留成分 >= 25 的板块（过滤二级三级小板），且剔除 Ⅱ/Ⅲ 与一级同名的重复板块
    const names = new Set(boards.map((b) => b.name))
    const big = boards
      .filter((b) => b.up + b.down >= 25)
      .filter((b) => !/[ⅡⅢ]$/.test(b.name) || !names.has(b.name.replace(/[ⅡⅢ]$/, '')))
    const sorted = [...big].sort((x, y) => y.pct - x.pct)
    snap.boards = {
      top: sorted.slice(0, 8),
      bottom: sorted.slice(-8).reverse(),
      flowIn: [...big].sort((x, y) => y.flow - x.flow).slice(0, 5),
      flowOut: [...big].sort((x, y) => x.flow - y.flow).slice(0, 3),
    }
  } catch (e) { meta.stale.push('boards'); console.error('[warn] 板块列表抓取失败:', e.message) }

  // ---------- 4) 12 个板块页（按配置名解析 BK 码 + 成分前 40） ----------
  const sectorsCfg = JSON.parse(readFileSync(new URL('../data/sectors.config.json', import.meta.url), 'utf8'))
  for (const cfg of sectorsCfg) {
    try {
      const b = boards.find((x) => x.name === cfg.name) || boards.find((x) => x.name.startsWith(cfg.name) && x.up + x.down >= 25)
      if (!b) { console.error('[warn] 板块未匹配:', cfg.name); continue }
      const raw = await clistAll(`b:${b.bk}`, 'f2,f3,f6,f12,f13,f14,f20,f21', 'f21', 4)
      const stocks = raw.map(fmt.stock).filter((s) => typeof s.pct === 'number' && s.fmcap > 0)
      const up = stocks.filter((s) => s.pct > 0).length
      snap.sectors.push({
        slug: cfg.slug, name: cfg.name, display: cfg.display, kw: cfg.kw, related: cfg.related,
        bk: b.bk, pct: b.pct, flow: b.flow, total: b.up + b.down, up, down: (b.up + b.down) - up,
        stocks: stocks.slice(0, 40),
      })
      await sleep(120)
    } catch (e) { console.error('[warn] 板块抓取失败:', cfg.name, e.message) }
  }

  // ---------- 5) 美股 / 港股（市值前 80，东财带中文名） ----------
  try {
    const raw = await clistAll('m:105,m:106,m:107', 'f2,f3,f6,f12,f13,f14,f20,f21', 'f20', 2)
    snap.us = raw.map(fmt.stock).filter((s) => typeof s.pct === 'number' && s.mcap > 0).slice(0, 80)
  } catch (e) { meta.stale.push('us'); console.error('[warn] 美股抓取失败:', e.message) }
  try {
    const raw = await clistAll('m:116', 'f2,f3,f6,f12,f13,f14,f20,f21', 'f20', 3)
    snap.hk = raw.map(fmt.stock)
      .filter((s) => typeof s.pct === 'number' && s.mcap > 0 && !/^[89]/.test(s.code) && !/-R$/.test(s.name)) // 剔除人民币柜台
      .slice(0, 60)
  } catch (e) { meta.stale.push('hk'); console.error('[warn] 港股抓取失败:', e.message) }

  // ---------- 6) Crypto（CoinGecko：直连 → 自家边缘代理 /api/crypto → 上次真实快照） ----------
  snap.crypto = await fetchCrypto(meta)

  // ---------- 写盘 ----------
  mkdirSync('data', { recursive: true })
  writeFileSync('data/snapshot.json', JSON.stringify(snap))
  if (meta.tradeDate && !meta.stale.includes('a')) {
    mkdirSync('data/archive', { recursive: true })
    const p = `data/archive/${meta.tradeDate}.json`
    if (!existsSync(p)) writeFileSync(p, JSON.stringify({ ...snap, meta: { ...meta, archived: true } }))
  }
  // 归档索引（portal 归档卡 + sitemap 用）
  try {
    const dates = readdirSync('data/archive').filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.replace('.json', '')).sort().reverse()
    writeFileSync('data/archive-index.json', JSON.stringify(dates))
  } catch { writeFileSync('data/archive-index.json', '[]') }
  console.log(`[ok] snapshot 完成 交易日=${meta.tradeDate} A股=${snap.a?.total ?? '-'}只 板块页=${snap.sectors.length}个 美股=${snap.us?.length ?? '-'} 港股=${snap.hk?.length ?? '-'} stale=[${meta.stale}]`)
}

const CRYPTO_NAMES = JSON.parse(readFileSync(new URL('../data/crypto-names.json', import.meta.url), 'utf8'))

/** 归一化两种形态：CoinGecko 原始数组（symbol/current_price/...）/ 自家 /api/crypto（code/price/pct/mcap） */
function normalizeCoins(list) {
  return list
    .map((c) => {
      const code = String(c.code || c.symbol || '').toUpperCase()
      const price = typeof c.price === 'number' ? c.price : c.current_price
      const pct = typeof c.pct === 'number' ? c.pct : c.price_change_percentage_24h
      const mcap = c.mcap || c.market_cap || 0
      return { code, name: c.name || code, cname: c.cname || CRYPTO_NAMES[code] || c.name || code, price, pct: pct ?? 0, mcap }
    })
    .filter((c) => c.code && typeof c.pct === 'number' && typeof c.price === 'number' && c.mcap > 0)
}

/**
 * Crypto 三级降级：CoinGecko 直连（GitHub Actions 海外出口可用）
 * → 自家边缘代理 /api/crypto（本机大陆环境可用）→ 上次成功快照（绝不伪造价格）
 */
async function fetchCrypto(meta = { stale: [] }) {
  const SRC = [
    {
      name: 'coingecko',
      url: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=40&page=1&price_change_percentage=24h',
    },
    { name: 'edge', url: 'https://tradershelf.com/api/crypto' },
  ]
  for (const s of SRC) {
    try {
      const d = await get(s.url, 1)
      const rawList = Array.isArray(d) ? d : d && d.ok && Array.isArray(d.coins) ? d.coins : null
      if (!rawList || !rawList.length) {
        console.error('[warn] crypto 空数据:', s.name)
        continue
      }
      const coins = normalizeCoins(rawList)
      if (!coins.length) continue
      console.log(`[ok] crypto 实时源=${s.name} ${coins.length} 币`)
      return { live: true, source: s.name, updated: new Date().toISOString(), note: '', coins }
    } catch (e) {
      console.error('[warn] crypto 源失败:', s.name, e.message)
    }
  }
  // 双源失败 → 沿用上次真实快照
  try {
    const prev = JSON.parse(readFileSync(new URL('../data/snapshot.json', import.meta.url), 'utf8'))
    if (prev?.crypto?.coins?.length) {
      meta.stale.push('crypto')
      console.error('[warn] crypto 双源失败，沿用上次快照:', prev.crypto.updated || prev.meta?.fetchedAt)
      return { ...prev.crypto, live: false, note: '实时源暂时不可用，展示最近一次成功抓取的币价。' }
    }
  } catch { /* 无历史快照 */ }
  meta.stale.push('crypto')
  return { live: false, source: 'builtin', note: '加密货币行情实时源暂不可用。', coins: cryptoFallback() }
}

/** Crypto 兜底快照（仅在「双源失败 + 无历史快照」时启用，保证构建不挂） */
function cryptoFallback() {
  const c = (id, name, cname, price, pct, mcapB) => ({ code: id, name, cname, price, pct, mcap: mcapB * 1e9 })
  return [
    c('BTC', 'Bitcoin', '比特币', 96500, 1.8, 1920), c('ETH', 'Ethereum', '以太坊', 3380, 2.4, 407),
    c('BNB', 'BNB', '币安币', 682, 0.6, 98), c('SOL', 'Solana', '索拉纳', 188, 4.2, 90),
    c('XRP', 'XRP', '瑞波币', 2.28, 3.1, 131), c('DOGE', 'Dogecoin', '狗狗币', 0.318, 5.2, 47),
    c('ADA', 'Cardano', '艾达币', 0.92, 2.8, 33), c('AVAX', 'Avalanche', '雪崩', 36.4, 3.6, 15),
    c('LINK', 'Chainlink', '链环', 22.5, 4.0, 14), c('TRX', 'TRON', '波场', 0.242, 1.2, 21),
    c('TON', 'Toncoin', '电报币', 5.32, -1.4, 13), c('SUI', 'Sui', '苏伊', 4.05, 6.8, 12),
    c('DOT', 'Polkadot', '波卡', 6.85, 2.2, 10), c('MATIC', 'Polygon', '马蹄链', 0.52, 1.9, 5),
    c('LTC', 'Litecoin', '莱特币', 102.4, 1.1, 8), c('BCH', 'Bitcoin Cash', '比特现金', 452, 0.8, 9),
    c('NEAR', 'NEAR', '近况', 5.6, -2.1, 7), c('APT', 'Aptos', '阿普托斯', 9.2, 3.3, 5),
    c('ARB', 'Arbitrum', '仲裁者', 0.78, 4.4, 3), c('OP', 'Optimism', '乐观币', 1.72, 3.8, 3),
    c('ATOM', 'Cosmos', '原子币', 6.4, 1.5, 2.5), c('FIL', 'Filecoin', '文件币', 4.9, -0.9, 3),
    c('ETC', 'Ethereum Classic', '以太经典', 26.7, 0.7, 4), c('HBAR', 'Hedera', '芭乐', 0.28, 2.0, 10),
    c('INJ', 'Injective', '注入', 21.3, 5.5, 2), c('SEI', 'Sei', '赛', 0.42, 6.1, 2),
    c('TIA', 'Celestia', '天 Celestia', 4.6, -3.2, 2), c('PEPE', 'Pepe', '佩佩', 0.0000182, 7.4, 7.6),
    c('SHIB', 'Shiba Inu', '柴犬', 0.0000224, 4.6, 13), c('WIF', 'dogwifhat', '狗帽', 2.85, 8.2, 2.8),
  ]
}

main().catch((e) => {
  // 完全失败也写入最小兜底，保证构建不挂
  console.error('[fatal]', e)
  const snap = { meta: { fetchedAt: new Date().toISOString(), stale: ['a', 'boards', 'us', 'hk', 'indices'], tradeDate: new Date().toISOString().slice(0, 10) }, a: null, us: null, hk: null, crypto: { live: false, coins: cryptoFallback() }, indices: null, sectors: [], boards: null }
  mkdirSync('data', { recursive: true })
  writeFileSync('data/snapshot.json', JSON.stringify(snap))
  process.exit(0)
})
