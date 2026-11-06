<template>
  <div v-if="sec">
    <div class="wrap">
      <nav class="crumb" aria-label="面包屑">
        <ol>
          <li><NuxtLink to="/">首页</NuxtLink></li>
          <li>板块热力图</li>
          <li><strong>{{ sec.display }}</strong></li>
        </ol>
      </nav>
      <div class="page-head">
        <h1>{{ sec.display }}热力图 · {{ sec.kw }}实时涨跌云图</h1>
        <p class="sub">覆盖{{ sec.display }} {{ sec.total }} 只成分股，按流通市值排布，红涨绿跌，主力资金与板块联动一页看全。</p>
        <div class="meta-line">
          <span>更新：{{ tradeDate }} 收盘<span v-if="stale.length">（部分数据延迟）</span></span>
          <span>成分股 {{ sec.total }} 只</span>
          <span>盘中每 15 秒自动刷新</span>
          <span>免费 · 无需注册</span>
        </div>
      </div>
      <p class="lede">{{ lede }}</p>
    </div>

    <section class="hero">
      <div class="wrap">
        <div class="hero-head">
          <div class="h1">{{ sec.display }} · A股云图</div>
          <span class="upd">{{ tradeDate }} 收盘</span>
        </div>
        <MarketTabs />
        <HeatMap
          :groups="[{ name: sec.display, stocks: sec.stocks }]"
          palette="cn"
          market-key="a"
          :live-fs="`b:${sec.bk}`"
          :count-label="`${sec.name} · ${sec.total} 只（图示为市值前 ${Math.min(sec.stocks.length, 32)} 只）`"
          :aria-label="sec.display + '热力图'"
          foot="板块云图按流通市值排布，颜色代表当日涨跌幅（红涨绿跌）。数据来自公开行情接口，可能存在延迟，仅供参考，不构成投资建议。"
        />
      </div>
    </section>

    <div class="wrap"><AdSlot name="A" /></div>

    <div class="light-zone">
      <div class="wrap">
        <div class="layout">
          <main>
            <section class="sec">
              <h2>{{ sec.display }}成分股行情 · 市值前 {{ tableRows.length }}</h2>
              <div class="tbl-wrap">
                <table class="data">
                  <caption>{{ tradeDate }} 收盘 · 总市值单位亿元人民币 · 数据来自公开行情接口</caption>
                  <thead>
                    <tr><th>名称</th><th>代码</th><th>涨跌幅</th><th>最新价</th><th>总市值</th><th>行业</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in tableRows" :key="s.code">
                      <td>{{ s.name }}</td>
                      <td class="num">{{ s.code }}</td>
                      <td :class="clsCN(s.pct)">{{ fp(s.pct) }}</td>
                      <td class="num">{{ fmtPrice(s.price) }}</td>
                      <td class="num">{{ fmtCap(s.mcap, 'cny') }}</td>
                      <td class="muted">{{ s.ind || sec.display }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <AdSlot name="C" variant="inread" desc="in-article 预留 · 表格与 FAQ 之间" />

            <FaqBlock :title="`${sec.display}热力图常见问题`" :faqs="faqs" />

            <section class="sec">
              <h2>相关板块</h2>
              <div class="related-grid">
                <NuxtLink v-for="r in relatedSectors" :key="r.slug" class="rel-card" :to="`/sector/${r.slug}`">
                  <div class="t">{{ r.display }}热力图</div>
                  <div class="d">{{ r.display }}成分股实时云图</div>
                </NuxtLink>
                <NuxtLink class="rel-card" to="/"><div class="t">全市场大盘云图</div><div class="d">返回沪深全A热力图</div></NuxtLink>
              </div>
            </section>
          </main>

          <div class="aside-col">
            <AdSlot name="D" variant="rect" dark />
            <div class="card">
              <h2>板块概览</h2>
              <div class="kicker"><span>{{ tradeDate }} 收盘</span></div>
              <div class="idx-grid">
                <div class="idx"><div class="n">板块涨幅</div><div class="v num" :class="clsCN(sec.pct)">{{ fp(sec.pct) }}</div><div class="c muted">成分 {{ sec.total }} 只</div></div>
                <div class="idx"><div class="n">上涨家数</div><div class="v num">{{ sec.up }}</div><div class="c" :class="clsCN(1)">占比 {{ upRatio }}%</div></div>
                <div class="idx"><div class="n">主力资金</div><div class="v num" :class="clsCN(sec.flow)">{{ fmtFlow(sec.flow) }}</div><div class="c muted">当日净流入</div></div>
                <div class="idx"><div class="n">龙头股</div><div class="v" style="font-size: 15px">{{ leadStock?.name || '--' }}</div><div class="c num" :class="clsCN(leadStock?.pct || 0)">{{ leadStock ? fp(leadStock.pct) : '--' }}</div></div>
              </div>
            </div>
            <div class="card">
              <h2>关联板块</h2>
              <div class="chips">
                <NuxtLink v-for="r in relatedSectors" :key="'c' + r.slug" class="chip" :to="`/sector/${r.slug}`">{{ r.display }}</NuxtLink>
              </div>
            </div>
            <div class="card">
              <h2>换个姿势看</h2>
              <div class="tool-grid">
                <NuxtLink class="tool-item" to="/"><div class="t">A股大盘云图</div><div class="d">全市场热力图</div></NuxtLink>
                <NuxtLink class="tool-item" to="/archive"><div class="t">每日归档</div><div class="d">回看任意交易日</div></NuxtLink>
              </div>
            </div>
          </div>
        </div>
        <AdSlot name="E" style="margin-bottom: 0" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { snap, stale, tradeDate, sectorBySlug, sectorReview, fp, fmtPrice, fmtCap, fmtFlow, clsCN } from '~/utils/data'
import sectorCfgRaw from '~/data/sectors.config.json'

const route = useRoute()
const slug = route.params.slug as string
const sec = sectorBySlug(slug)
if (!sec) {
  throw createError({ statusCode: 404, statusMessage: '板块不存在', fatal: true })
}

const cfgList = sectorCfgRaw as any[]
const relatedSectors = (sec.related || []).map((r: string) => cfgList.find((c) => c.slug === r)).filter(Boolean).slice(0, 3)
const lede = sectorReview(sec)
const tableRows = sec.stocks.slice(0, 15)
const leadStock = [...sec.stocks].sort((a, b) => b.pct - a.pct)[0]
const upRatio = Math.round((sec.up / Math.max(sec.total, 1)) * 100)

const faqs = [
  { q: `${sec.display}热力图包含哪些股票？`, a: `按东方财富板块分类的${sec.name}成分股（当前 ${sec.total} 只），按流通市值排布，自动剔除停牌与无市值数据个股。` },
  { q: '板块热力图多久更新一次？', a: '盘中约 15 秒自动刷新；收盘后当日快照自动归档，可随时回看历史任意交易日的板块表现。' },
  { q: '怎么查看某一天的历史板块表现？', a: '访问每日归档页，按日期回看任意交易日的全市场与板块云图及复盘文字。' },
  { q: '数据来源与准确性如何？', a: '数据来自公开行情接口整理，可能存在延迟或误差，仅供参考，不构成投资建议。' },
]

const canonical = `https://tradershelf.com/sector/${slug}`
const title = `${sec.display}热力图_${sec.kw}实时涨跌云图 - Trader Shelf`
const desc = `${sec.display}热力图：${sec.kw}成分股实时涨跌云图，按流通市值排布，附板块资金流向、成分股行情表与每日板块复盘归档，一图看全。`
useSeoMeta({ title, description: desc, ogTitle: title, ogDescription: desc, ogType: 'website', ogSiteName: 'Trader Shelf', ogUrl: canonical })
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trader Shelf', item: 'https://tradershelf.com/' },
          { '@type': 'ListItem', position: 2, name: '板块热力图', item: 'https://tradershelf.com/sector/' + slug },
        ],
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }),
    },
  ],
})
</script>
