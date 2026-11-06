<template>
  <div v-if="data">
    <div class="wrap">
      <nav class="crumb" aria-label="面包屑">
        <ol>
          <li><NuxtLink to="/">首页</NuxtLink></li>
          <li><NuxtLink to="/archive">每日归档</NuxtLink></li>
          <li><strong>{{ date }}</strong></li>
        </ol>
      </nav>
      <div class="page-head">
        <h1>{{ cnDate }} 大盘云图复盘 · 当日板块涨跌全景</h1>
        <p class="sub">{{ data.a ? `全市场上涨 ${data.a.up} 家 / 下跌 ${data.a.down} 家，成交 ${fmtAmount(data.a.amount)}。` : '' }}以下为收盘自动固化的静态快照。</p>
      </div>
      <p class="lede">{{ lede }}</p>
    </div>

    <div class="wrap light-zone" style="padding-bottom: 10px">
      <div class="layout">
        <main>
          <section class="sec" v-if="data.boards">
            <h2>当日领涨板块</h2>
            <div class="tbl-wrap">
              <table class="data">
                <caption>{{ date }} 收盘 · 只列成分 ≥ 25 只的板块</caption>
                <thead><tr><th>板块</th><th>涨跌幅</th><th>上涨/下跌家数</th><th>主力净流入</th></tr></thead>
                <tbody>
                  <tr v-for="b in data.boards.top.slice(0, 8)" :key="b.name">
                    <td>{{ b.name }}</td>
                    <td :class="clsCN(b.pct)">{{ fp(b.pct) }}</td>
                    <td class="num muted">{{ b.up }} / {{ b.down }}</td>
                    <td class="num">{{ fmtFlow(b.flow) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="sec" v-if="data.boards">
            <h2>当日领跌板块</h2>
            <div class="tbl-wrap">
              <table class="data">
                <caption>{{ date }} 收盘</caption>
                <thead><tr><th>板块</th><th>涨跌幅</th><th>上涨/下跌家数</th><th>主力净流入</th></tr></thead>
                <tbody>
                  <tr v-for="b in data.boards.bottom.slice(0, 6)" :key="b.name">
                    <td>{{ b.name }}</td>
                    <td :class="clsCN(b.pct)">{{ fp(b.pct) }}</td>
                    <td class="num muted">{{ b.up }} / {{ b.down }}</td>
                    <td class="num">{{ fmtFlow(b.flow) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <AdSlot name="C" variant="inread" />

          <section class="sec">
            <h2>当日热门板块云图入口</h2>
            <div class="related-grid">
              <NuxtLink v-for="s in hotSectors" :key="s.slug" class="rel-card" :to="`/sector/${s.slug}`">
                <div class="t">{{ s.display }}热力图</div>
                <div class="d">当日 {{ fp(s.pct) }} · 成分 {{ s.total }} 只</div>
              </NuxtLink>
            </div>
          </section>

          <div class="pager">
            <NuxtLink v-if="prev" :to="`/archive/${prev}`">← {{ prev }} 复盘</NuxtLink>
            <span v-else class="muted small">（更早交易日待归档）</span>
            <NuxtLink v-if="next" :to="`/archive/${next}`">{{ next }} 复盘 →</NuxtLink>
            <NuxtLink v-else to="/archive">返回归档列表</NuxtLink>
          </div>
        </main>

        <div class="aside-col">
          <AdSlot name="D" variant="rect" dark />
          <div class="card" v-if="data.a">
            <h2>当日涨跌家数</h2>
            <div class="updown">
              <div>上涨 <b class="pos-cn num">{{ data.a.up.toLocaleString() }}</b> · 下跌 <b class="neg-cn num">{{ data.a.down.toLocaleString() }}</b></div>
              <div class="bar">
                <i class="b-up" :style="{ width: upPct + '%' }" />
                <i class="b-dn" :style="{ width: downPct + '%' }" />
              </div>
              <div class="small muted">两市成交 {{ fmtAmount(data.a.amount) }}</div>
            </div>
          </div>
          <div class="card" v-if="data.indices">
            <h2>当日核心指数</h2>
            <div class="idx-grid">
              <div v-for="i in data.indices.slice(0, 6)" :key="i.code" class="idx">
                <div class="n">{{ i.name }}</div>
                <div class="v num">{{ fmtPrice(i.price) }}</div>
                <div class="c num" :class="clsCN(i.pct)">{{ fp(i.pct) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 归档页：读取 data/archive/<date>.json（收盘管线产出，生成后永不重建）
import { fp, fmtPrice, fmtAmount, fmtFlow, clsCN } from '~/utils/data'
import dates from '~/data/archive-index.json'

const route = useRoute()
const date = route.params.date as string
const valid = (dates as string[]).includes(date)
if (!valid) throw createError({ statusCode: 404, statusMessage: '归档不存在', fatal: true })

let data: any = null
if (import.meta.server) {
  const fs = await import('node:fs')
  try { data = JSON.parse(fs.readFileSync(`data/archive/${date}.json`, 'utf8')) } catch { /* falls through to 404 below */ }
}
if (!data) {
  if (import.meta.server) throw createError({ statusCode: 404, statusMessage: '归档不存在', fatal: true })
}

const arr = dates as string[]
const pos = arr.indexOf(date)
const prev = pos < arr.length - 1 ? arr[pos + 1] : ''
const next = pos > 0 ? arr[pos - 1] : ''

const cnDate = `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`
const sh = (data?.indices || []).find((i: any) => i.code === '000001')
const top = data?.boards?.top?.[0]
const bot = data?.boards?.bottom?.[0]
const lead = data?.a ? [...data.a.top].sort((a: any, b: any) => b.pct - a.pct)[0] : null
const lede =
  `${cnDate}（${date}）A股收盘：${sh ? `${sh.name}${sh.pct > 0 ? '涨' : '跌'} ${Math.abs(sh.pct).toFixed(2)}% 报 ${fmtPrice(sh.price)} 点，` : ''}` +
  (data?.a ? `全市场上涨 ${data.a.up.toLocaleString()} 家、下跌 ${data.a.down.toLocaleString()} 家，合计成交 ${fmtAmount(data.a.amount)}。` : '') +
  (top ? `当日领涨板块为${top.name}（${fp(top.pct)}），` : '') +
  (bot ? `领跌为${bot.name}（${fp(bot.pct)}）。` : '') +
  (lead ? `${lead.name}（${lead.code}）${fp(lead.pct)}居两市涨幅前列。` : '') +
  '本页为收盘自动固化的历史快照，板块实时云图请访问对应的板块热力图页面。'

const hotSectors = (data?.sectors || [])
  .slice()
  .sort((a: any, b: any) => Math.abs(b.pct) - Math.abs(a.pct))
  .slice(0, 4)

const all = Math.max((data?.a?.up || 0) + (data?.a?.down || 0), 1)
const upPct = Math.round(((data?.a?.up || 0) / all) * 100)
const downPct = 100 - upPct

const title = `${cnDate}大盘云图复盘_当日板块涨跌全景 - Trader Shelf`
const desc = `${date} A股复盘：${sh ? `沪指${fp(sh.pct)}，` : ''}${data?.a ? `上涨${data.a.up}家/下跌${data.a.down}家，成交${fmtAmount(data.a.amount)}。` : ''}${top ? `领涨${top.name}，` : ''}历史云图快照回看。`
useSeoMeta({ title, description: desc, ogTitle: title, ogDescription: desc, ogType: 'article', ogSiteName: 'Trader Shelf', ogUrl: `https://tradershelf.com/archive/${date}` })
useHead({
  link: [{ rel: 'canonical', href: `https://tradershelf.com/archive/${date}` }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trader Shelf', item: 'https://tradershelf.com/' },
        { '@type': 'ListItem', position: 2, name: '每日归档', item: 'https://tradershelf.com/archive' },
        { '@type': 'ListItem', position: 3, name: cnDate + '复盘', item: `https://tradershelf.com/archive/${date}` },
      ],
    }),
  }],
})
</script>
