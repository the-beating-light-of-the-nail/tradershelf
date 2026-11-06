/**
 * 数据访问层：构建时（SSG 烘焙真数据）与客户端（JSONP 实时合并）共用
 * 单一来源 data/snapshot.json（scripts/fetch-data.mjs 产出）
 */
import snapRaw from '~/data/snapshot.json'
import sectorCfgRaw from '~/data/sectors.config.json'
import archiveIndexRaw from '~/data/archive-index.json'

export interface Stock {
  code: string
  name: string
  price: number | string
  pct: number
  amount: number
  mcap: number
  fmcap: number
  ind?: string
  cname?: string
}
export interface SectorSnap {
  slug: string
  name: string
  display: string
  kw: string
  related: string[]
  bk: string
  pct: number
  flow: number
  total: number
  up: number
  down: number
  stocks: Stock[]
}
export interface Group {
  name: string
  slug?: string
  stocks: Stock[]
}

export const snap: any = snapRaw
export const sectorCfg: any[] = sectorCfgRaw
export const archiveDates: string[] = (archiveIndexRaw as string[]) || []
export const stale = (snap.meta?.stale || []) as string[]
export const tradeDate: string = snap.meta?.tradeDate || ''

export function sectorBySlug(slug: string): SectorSnap | undefined {
  return (snap.sectors || []).find((s: SectorSnap) => s.slug === slug)
}

/* ---------- 格式化 ---------- */
export function fmtCap(v: number, ccy: 'cny' | 'usd' | 'hkd' = 'cny'): string {
  if (typeof v !== 'number' || !isFinite(v) || v <= 0) return '--'
  const unit = ccy === 'cny' ? '元' : ccy === 'usd' ? '美元' : '港元'
  if (v >= 1e12) return (v / 1e12).toFixed(2) + '万亿' + unit
  if (v >= 1e8) return (v / 1e8).toFixed(0) + '亿' + unit
  return (v / 1e4).toFixed(1) + '万' + unit
}
export function fmtAmount(v: number): string {
  if (typeof v !== 'number' || !isFinite(v) || v <= 0) return '--'
  if (v >= 1e12) return (v / 1e12).toFixed(2) + '万亿元'
  return (v / 1e8).toFixed(0) + '亿元'
}
export function fmtFlow(v: number): string {
  if (typeof v !== 'number' || !isFinite(v)) return '--'
  const yi = v / 1e8
  return (yi > 0 ? '+' : '') + yi.toFixed(1) + '亿'
}
export function fmtPrice(v: number | string): string {
  if (typeof v !== 'number' || !isFinite(v)) return '--'
  return v >= 1000 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v < 0.01 ? v.toPrecision(3) : v.toFixed(4).replace(/0+$/, '')
}
export const fp = (p: number) => (typeof p === 'number' && isFinite(p) ? (p > 0 ? '+' : '') + p.toFixed(2) + '%' : '--')

/** A股/港股文本色 class（红涨绿跌） */
export const clsCN = (p: number) => (p > 0 ? 'pos-cn' : p < 0 ? 'neg-cn' : 'muted')
/** 美股/Crypto 文本色 class（绿涨红跌） */
export const clsIntl = (p: number) => (p > 0 ? 'pos-intl' : p < 0 ? 'neg-intl' : 'muted')

/* ---------- treemap 分组 ---------- */
/** A股全景：全量 top 600 按东财行业分组，每组按流通市值取前 14 */
export function aGroups(): Group[] {
  const top: Stock[] = snap.a?.top || []
  const byInd = new Map<string, Stock[]>()
  for (const s of top) {
    if (typeof s.pct !== 'number') continue
    const key = s.ind || '其他'
    if (!byInd.has(key)) byInd.set(key, [])
    byInd.get(key)!.push(s)
  }
  const groups: Group[] = []
  for (const [name, stocks] of byInd) {
    const list = stocks.slice(0, 14)
    groups.push({ name, stocks: list })
  }
  groups.sort((a, b) => b.stocks.reduce((s, x) => s + x.fmcap, 0) - a.stocks.reduce((s, x) => s + x.fmcap, 0))
  return groups
}

export function marketGroups(key: 'us' | 'hk' | 'crypto'): Group[] {
  const list: Stock[] = (snap as any)[key]?.coins || (snap as any)[key] || []
  const stocks = list.filter((s) => typeof s.pct === 'number' && (s.fmcap || s.mcap) > 0).slice(0, 80)
  const name = key === 'us' ? '美股' : key === 'hk' ? '港股' : 'Crypto'
  return [{ name, stocks }]
}

export function sectorGroups(sec: SectorSnap): Group[] {
  return [{ name: sec.display, stocks: sec.stocks.filter((s) => typeof s.pct === 'number').slice(0, 32) }]
}

/* ---------- 指数 ---------- */
export function idx(code: string) {
  return (snap.indices || []).find((i: any) => i.code === code)
}

/* ---------- 复盘文案（Programmatic SEO 核心层：模板 + 当日数据） ---------- */
export function aReview(): { lede: string; briefs: string[] } {
  const d = tradeDate || '最近交易日'
  if (!snap.a) {
    return {
      lede: `${d} 行情快照暂不可用（数据接口异常），本页展示最近一次成功抓取的内容。热力图按流通市值排布，颜色代表当日涨跌幅。`,
      briefs: ['[提示] 行情数据获取异常，已回落到最近快照，稍后自动恢复。'],
    }
  }
  const sh = idx('000001')
  const top = snap.boards?.top?.[0]
  const bot = snap.boards?.bottom?.[0]
  const flowIn = snap.boards?.flowIn?.[0]
  const leadStock = [...snap.a.top].sort((a: Stock, b: Stock) => b.pct - a.pct)[0]
  const lede =
    `${d} A股收盘：${sh ? `沪指${sh.pct > 0 ? '涨' : '跌'} ${Math.abs(sh.pct).toFixed(2)}% 报 ${fmtPrice(sh.price)} 点，` : ''}` +
    `全市场上涨 ${snap.a.up.toLocaleString()} 家、下跌 ${snap.a.down.toLocaleString()} 家，合计成交 ${fmtAmount(snap.a.amount)}。` +
    (top ? `领涨板块为${top.name}（${fp(top.pct)}），` : '') +
    (bot ? `领跌为${bot.name}（${fp(bot.pct)}）。` : '') +
    (leadStock ? `人气股方面，${leadStock.name}（${leadStock.code}）${fp(leadStock.pct)}。` : '') +
    '本页热力图按流通市值排布、红涨绿跌，盘中实时刷新，收盘后自动归档，可在每日归档中回看任意交易日。'

  const hs = idx('HSI'), ndx = idx('NDX')
  const briefs = [
    `[盘面] 全市场 ${snap.a.up > snap.a.down ? '普涨' : '分化'}：上涨 ${snap.a.up.toLocaleString()} 家 / 下跌 ${snap.a.down.toLocaleString()} 家，两市成交 ${fmtAmount(snap.a.amount)}。`,
    top ? `[板块] ${top.name}领涨（${fp(top.pct)}）${snap.boards.top.slice(1, 3).map((b: any) => `${b.name} ${fp(b.pct)}`).join('、')}；${bot?.name}领跌（${bot ? fp(bot.pct) : '--'}）。` : '[板块] 板块数据更新中。',
    flowIn ? `[资金] 主力净流入第一：${flowIn.name} ${fmtFlow(flowIn.flow)}。` : '[资金] 资金数据更新中。',
    `[跨市场] ${hs ? `恒生指数 ${fp(hs.pct)}，` : ''}${ndx ? `纳斯达克 ${fp(ndx.pct)}。` : ''}Crypto 全天候 24/7 交易。`,
  ]
  return { lede, briefs }
}

export function marketReview(key: 'us' | 'hk' | 'crypto'): { lede: string; briefs: string[] } {
  const d = tradeDate || '最近交易日'
  const map = {
    us: { idxCode: 'SPX', altCode: 'NDX', name: '美股', verb: '美东时间' },
    hk: { idxCode: 'HSI', altCode: 'NDX', name: '港股', verb: '' },
    crypto: { idxCode: 'HSI', altCode: 'NDX', name: '加密货币市场', verb: '' },
  }[key]
  const list: Stock[] = (snap as any)[key]?.coins || (snap as any)[key] || []
  const valid = list.filter((s) => typeof s.pct === 'number')
  const best = [...valid].sort((a, b) => b.pct - a.pct)[0]
  const worst = [...valid].sort((a, b) => a.pct - b.pct)[0]
  const main = key === 'crypto' ? null : idx(map.idxCode)
  const alt = key === 'crypto' ? null : idx(map.altCode)

  let lede = ''
  if (key === 'crypto') {
    lede = `${d} 加密货币市场实时概览：市值前 30 币种中，` +
      (best ? `${best.name === best.cname ? best.cname : best.cname || best.name}24h 涨幅居前（${fp(best.pct)}）` : '') +
      (worst ? `，${worst.cname || worst.name}表现最弱（${fp(worst.pct)}）。` : '。') +
      '加密货币 7×24 小时交易，本页热力图按市值排布、绿涨红跌（国际配色），' +
      (snap.crypto?.live
        ? '币价经边缘代理每 60 秒自动刷新，中国大陆可直连。'
        : '实时源暂时不可用，当前展示最近一次成功抓取的币价。')
  } else {
    lede = `${d}${map.verb} ${map.name}市场：` +
      (main ? `${main.name}${main.pct > 0 ? '上涨' : '下跌'} ${Math.abs(main.pct).toFixed(2)}% 报 ${fmtPrice(main.price)} 点，` : '') +
      (alt ? `${alt.name} ${fp(alt.pct)}。` : '') +
      (best ? `个股方面，${best.name}上涨 ${best.pct.toFixed(2)}% 领涨大市值阵营` : '') +
      (worst ? `，${worst.name}下跌 ${Math.abs(worst.pct).toFixed(2)}%。` : '。') +
      `本页${map.name}热力图按市值排布、绿涨红跌（国际配色，与 A 股页自动区分），盘中自动刷新，收盘后归档可回看任意交易日。`
  }
  const briefs = valid.slice(0, 3).map((s, i) => `[涨幅前${i + 1}] ${s.cname || s.name}（${s.code}）24h/当日 ${fp(s.pct)}，最新 ${fmtPrice(s.price)}。`)
  return { lede, briefs }
}

export function sectorReview(sec: SectorSnap): string {
  const d = tradeDate || '最近交易日'
  const sh = idx('000001')
  const lead = [...sec.stocks].sort((a, b) => b.pct - a.pct)[0]
  const lag = [...sec.stocks].sort((a, b) => a.pct - b.pct)[0]
  const diff = sh ? sec.pct - sh.pct : null
  return (
    `${d}，${sec.display}（${sec.name}）${sec.pct > 0 ? '上涨' : '下跌'} ${Math.abs(sec.pct).toFixed(2)}%，` +
    (diff !== null ? `${sh!.name}${diff >= 0 ? '跑赢' : '跑输'} ${Math.abs(diff).toFixed(2)} 个百分点，` : '') +
    `板块内 ${sec.total} 只成分股中 ${sec.up} 只上涨。` +
    (lead ? `${lead.name}（${lead.code}）${fp(lead.pct)} 领涨板块，` : '') +
    (lag ? `${lag.name}（${lag.code}）${fp(lag.pct)}。` : '') +
    `主力资金当日${sec.flow >= 0 ? '净流入' : '净流出'} ${fmtFlow(Math.abs(sec.flow))}。` +
    `本页热力图按流通市值排布、红涨绿跌，盘中实时刷新，收盘后自动归档，可在每日归档中回看${sec.display}任意历史交易日的表现。`
  )
}

/* ---------- 交易时段（客户端 JSONP 自动刷新开关） ---------- */
export function marketOpen(key: string): boolean {
  try {
    const now = new Date()
    const cst = new Date(now.getTime() + (now.getTimezoneOffset() + 8 * 60) * 60000)
    const day = cst.getDay()
    const hm = cst.getHours() * 60 + cst.getMinutes()
    if (key === 'a') return day >= 1 && day <= 5 && hm >= 9 * 60 + 15 && hm <= 15 * 60 + 5
    if (key === 'hk') return day >= 1 && day <= 5 && hm >= 9 * 60 + 15 && hm <= 16 * 60 + 10
    if (key === 'us') {
      const inNight = hm >= 21 * 60 + 30 && day >= 1 && day <= 5
      const inEarly = hm <= 5 * 60 && day >= 2 && day <= 6
      return inNight || inEarly
    }
    return false
  } catch { return false }
}
