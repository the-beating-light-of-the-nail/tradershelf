#!/usr/bin/env node
/**
 * Trader Shelf · IndexNow 推送
 * 为什么需要它：归档页是纯累积长尾，Bing/Yandex 靠 IndexNow 能在分钟级发现新 URL，
 * 比等爬虫来巡快得多——这是归档页「次日被收录」的主要杠杆（Google 不参与该协议，靠 sitemap + 内链）。
 *
 * 用法：
 *   node scripts/indexnow.mjs             # 核心页 + 最近 3 天归档（日常部署后跑这个）
 *   node scripts/indexnow.mjs --all       # 推送 sitemap.xml 里的全部 URL
 *   node scripts/indexnow.mjs --dry-run   # 只打印不提交
 *
 * key 识别：public/<32 位 hex>.txt（文件名即 key，内容也写一遍 key，符合 IndexNow 规范）
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'

const HOST = 'tradershelf.com'
const ORIGIN = 'https://' + HOST
const ENDPOINT = 'https://api.indexnow.org/indexnow'

const args = process.argv.slice(2)
const ALL = args.includes('--all')
const DRY = args.includes('--dry-run')

/* ---------- 1) 找 key ---------- */
function findKey() {
  try {
    for (const f of readdirSync('public')) {
      if (/^[a-f0-9]{32}\.txt$/.test(f)) return f.replace('.txt', '')
    }
  } catch { /* public 目录缺失 */ }
  return ''
}

/* ---------- 2) 取要推送的 URL ---------- */
function sitemapUrls() {
  const p = '.output/public/sitemap.xml'
  if (!existsSync(p)) return []
  const xml = readFileSync(p, 'utf8')
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

function recentUrls() {
  const core = ['/', '/us', '/hk', '/crypto', '/xingtu', '/archive']
  let dates = []
  try {
    dates = JSON.parse(readFileSync('data/archive-index.json', 'utf8')).slice(0, 3)
  } catch { /* 无归档 */ }
  return [...core.map((u) => ORIGIN + u), ...dates.map((d) => `${ORIGIN}/archive/${d}`)]
}

const urls = ALL ? sitemapUrls() : recentUrls()
if (!urls.length) {
  console.warn('[warn] 没有可推送的 URL（sitemap 未生成？）')
  process.exit(0)
}

/* ---------- 3) 提交 ---------- */
const key = findKey()
if (!key) {
  console.warn('[warn] public/ 下找不到 32 位 hex 的 IndexNow key 文件，跳过推送')
  process.exit(0)
}

const payload = { host: HOST, key, keyLocation: `${ORIGIN}/${key}.txt`, urlList: urls }

if (DRY) {
  console.log(`[dry-run] 将推送 ${urls.length} 条到 IndexNow：`)
  urls.slice(0, 12).forEach((u) => console.log('  ' + u))
  if (urls.length > 12) console.log(`  … 其余 ${urls.length - 12} 条`)
  process.exit(0)
}

try {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })
  // 200 = 已接收；202 = 已接收但 key 待校验（首次推送常见）
  if (res.ok) console.log(`[ok] IndexNow 已接收 ${urls.length} 条（HTTP ${res.status}）`)
  else console.warn(`[warn] IndexNow 返回 HTTP ${res.status}：${(await res.text()).slice(0, 200)}`)
} catch (e) {
  // 推送失败不影响部署结果，只记录
  console.warn('[warn] IndexNow 推送失败：', e.message)
}
