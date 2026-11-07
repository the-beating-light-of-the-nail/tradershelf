<template>
  <div>
    <!-- 长尾页头部：面包屑 + 关键词 H1 + 自动文案（Programmatic SEO 核心层） -->
    <div class="wrap">
      <nav class="crumb" aria-label="面包屑">
        <ol>
          <li><NuxtLink to="/">首页</NuxtLink></li>
          <li>市场云图</li>
          <li><strong>{{ m.title }}</strong></li>
        </ol>
      </nav>
      <div class="page-head">
        <h1>{{ m.h1 }}</h1>
        <p class="sub">{{ m.sub }}</p>
        <div class="meta-line">
          <span>更新：{{ tradeDate }}{{ m.closeSuffix }}<span v-if="stale.includes(m.key)">（数据延迟）</span></span>
          <span>{{ m.refreshLabel }}</span>
          <span>数据来源：公开行情接口</span>
          <span>免费 · 无需注册</span>
        </div>
      </div>
      <p class="lede">{{ review.lede }}</p>
    </div>

    <!-- 热力图工具区（深色，国际配色） -->
    <section class="hero">
      <div class="wrap">
        <div class="hero-head">
          <div class="h1">{{ m.h1 }}</div>
          <div class="hero-head-r">
            <span class="upd">{{ tradeDate }}{{ m.closeSuffix }}</span>
            <a class="cta-app" :href="appHref" title="进入实时完整版看盘工具（本站 /app）">⚡ 实时完整版看盘 →</a>
          </div>
        </div>
        <MarketTabs />
        <div v-if="m.subs" class="tabs sub" aria-label="指数视图">
          <span class="tab on">{{ m.subs[0] }}</span>
          <a v-for="s in m.subs.slice(1)" :key="s" class="tab" href="#" :title="'Phase 2 上线'">{{ s }}</a>
        </div>
        <HeatMap
          :groups="m.groups()"
          :palette="m.palette"
          :market-key="m.key"
          :live-fs="m.live ? m.liveFs : null"
          :live-url="m.liveUrl || null"
          :count-label="m.countLabel"
          :size-label="m.sizeLabel"
          :aria-label="m.h1"
          :foot="m.foot"
          :ccy="m.ccy || 'cny'"
          :app-link="appLink"
        />
      </div>
    </section>

    <div class="wrap"><AdSlot name="A" :desc="'AdSense Display 预留 · 与全屏按钮保持距离，防误点'" /></div>

    <div class="light-zone">
      <div class="wrap">
        <div class="layout">
          <main>
            <section class="sec">
              <h2>{{ m.tableTitle }}</h2>
              <div class="tbl-wrap">
                <table class="data">
                  <caption>{{ tradeDate }} · {{ m.capNote }} · 数据来自公开行情接口</caption>
                  <thead>
                    <tr><th>代码</th><th>名称</th><th>涨跌幅</th><th>最新价</th><th>{{ m.capCol }}</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in m.tableRows" :key="s.code">
                      <td class="num">{{ s.code }}</td>
                      <td>{{ s.cname || s.name }}</td>
                      <td :class="clsIntl(s.pct)">{{ fp(s.pct) }}</td>
                      <td class="num">{{ fmtPrice(s.price) }}</td>
                      <td class="num">{{ fmtCap(s.mcap || s.fmcap, m.ccy) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <AdSlot name="C" variant="inread" desc="in-article 预留 · 仅内容页启用，工具交互区不放广告" />

            <FaqBlock :title="m.faqTitle" :faqs="m.faqs" />

            <section class="sec">
              <h2>相关页面</h2>
              <div class="related-grid">
                <NuxtLink class="rel-card" to="/"><div class="t">A股大盘云图</div><div class="d">沪深两市实时热力图（红涨绿跌）</div></NuxtLink>
                <a class="rel-card" :href="appHref"><div class="t">⚡ 实时完整版看盘</div><div class="d">全市场云图 · 搜索个股 · 板块下钻（8 秒刷新）</div></a>
                <NuxtLink v-if="m.key !== 'us'" class="rel-card" to="/us"><div class="t">美股大盘云图</div><div class="d">标普500/纳斯达克权重股云图</div></NuxtLink>
                <NuxtLink v-if="m.key !== 'hk'" class="rel-card" to="/hk"><div class="t">港股大盘云图</div><div class="d">恒生指数与科技股成分云图</div></NuxtLink>
                <NuxtLink v-if="m.key !== 'crypto'" class="rel-card" to="/crypto"><div class="t">Crypto 热力图</div><div class="d">BTC/以太坊全网市值云图 24h</div></NuxtLink>
                <NuxtLink class="rel-card" to="/archive"><div class="t">每日复盘归档</div><div class="d">任意交易日历史云图与板块涨跌</div></NuxtLink>
              </div>
            </section>
          </main>

          <div class="aside-col">
            <AdSlot name="D" variant="rect" dark />
            <div class="card">
              <h2>{{ m.idxTitle }}</h2>
              <div class="kicker"><span>{{ tradeDate }} · 绿涨红跌（国际配色）</span></div>
              <div class="idx-grid">
                <div v-for="i in m.idxCards" :key="i.code" class="idx">
                  <div class="n">{{ i.name }}</div>
                  <div class="v num">{{ fmtPrice(i.price) }}</div>
                  <div class="c num" :class="clsIntl(i.pct)">{{ fp(i.pct) }}</div>
                </div>
              </div>
            </div>
            <div class="card">
              <h2>当日要点</h2>
              <ul class="brief-list small">
                <li v-for="(b, i) in review.briefs" :key="i"><span class="tag-mkt" v-html="tagOf(b)" />{{ stripTag(b) }}</li>
              </ul>
            </div>
          </div>
        </div>
        <AdSlot name="E" style="margin-bottom: 0" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { tradeDate, stale, fp, fmtPrice, fmtCap, clsIntl } from '~/utils/data'

const props = defineProps<{ m: any; review: { lede: string; briefs: string[] } }>()

/* 引流深链：/app 完整工具（本站）。market 映射：a→A_ALL 实时全A、hk→港股视图；
   us/crypto 工具层暂无对应市场，CTA 落默认视图、板块 tile 保留本页下钻 */
const route = useRoute()
const from = encodeURIComponent(route.path)
const APP_MARKET: Record<string, string | null> = { a: 'a', hk: 'hk', us: null, crypto: null }
const appLink = computed(() => {
  const mk = APP_MARKET[props.m.key]
  return mk ? `/app?market=${mk}&from=${from}` : null
})
const appHref = computed(() => appLink.value || `/app?from=${from}`)

const tagOf = (b: string) => b.slice(0, b.indexOf(']') + 1)
const stripTag = (b: string) => b.replace(/^\[[^\]]+\]/, '')
useSeoMeta(props.m.seo)
useHead({
  link: [{ rel: 'canonical', href: props.m.canonical }],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(props.m.ld) }],
})
</script>
