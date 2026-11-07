#!/usr/bin/env node
/**
 * Trader Shelf · 生成 /api/market 的股票池（universe）静态清单
 * 来源：app/（stock-market-cloud，MIT）内置股票池——与上游后端 fallback 逻辑同源：
 *   US/HK ← app/src/services/mockData.ts（US_STOCKS / HK_STOCKS）
 *   CN    ← app/src/services/allAStocks.json（A股全市场 5445 只）
 * 产出：data/market-universe.json { US:[{symbol,name,sector}], HK:[...], CN:[...], generatedAt }
 * 说明：universe 固定（上游默认模式即 fallback-only，全量扫描默认关闭），
 *       上游更新股票池后重跑本脚本即可。worker 直接 import 该 JSON，零子请求。
 */
import { readFileSync, writeFileSync } from 'node:fs'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const extractArray = (text, name) => {
  const m = text.match(new RegExp(`export const ${name}: Stock\\[[^\\]]*\\] = (\\[[\\s\\S]*?\\]);`))
  if (!m) throw new Error(`extract ${name} failed`)
  return JSON.parse(m[1])
}

const mock = readFileSync(`${ROOT}app/src/services/mockData.ts`, 'utf8')
const cn = JSON.parse(readFileSync(`${ROOT}app/src/services/allAStocks.json`, 'utf8'))

const pick = (s) => ({ symbol: s.symbol, name: s.name, sector: s.sector || 'Other' })

const universe = {
  generatedAt: new Date().toISOString(),
  US: extractArray(mock, 'US_STOCKS').map(pick),
  HK: extractArray(mock, 'HK_STOCKS').map(pick),
  CN: cn.map(pick),
}

writeFileSync(`${ROOT}data/market-universe.json`, JSON.stringify(universe))
console.log(
  `[gen-market-universe] US:${universe.US.length} HK:${universe.HK.length} CN:${universe.CN.length} → data/market-universe.json`,
)
