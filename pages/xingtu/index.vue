<template>
  <div>
    <div class="wrap">
      <nav class="crumb" aria-label="面包屑">
        <ol>
          <li><NuxtLink to="/">首页</NuxtLink></li>
          <li><strong>大盘星图</strong></li>
        </ol>
      </nav>
      <div class="page-head">
        <h1>大盘星图在线看 · A股星图网页版（无需 APP）</h1>
        <p class="sub">把全市场排成一张星系图：每颗星是一只股票，大小=流通市值，颜色=当日涨跌。网页直接打开即看，不用下载东方财富 APP。</p>
        <div class="meta-line">
          <span>更新：{{ tradeDate }} 收盘</span>
          <span>展示沪深全A流通市值前 {{ stars.length }} 只</span>
          <span>免费 · 无需注册 · 无需 APP</span>
        </div>
      </div>
      <p class="lede">
        {{ tradeDate }} A股星图：{{ sh ? `沪指${sh.pct > 0 ? '涨' : '跌'} ${Math.abs(sh.pct).toFixed(2)}% 报 ${fmtPrice(sh.price)} 点，` : '' }}{{ snapA ? `全市场上涨 ${snapA.up.toLocaleString()} 家、下跌 ${snapA.down.toLocaleString()} 家。` : '' }}
        本页为「大盘星图」的网页实现——与矩形热力图（<NuxtLink to="/">大盘云图</NuxtLink>）同一份数据的另一种排布：金色角度螺旋（向日葵排列）按市值由中心向外展开，中心即权重核心，一眼看清「谁是引力中心、谁在燃烧」。收盘后自动归档，可在每日归档回看任意交易日。
      </p>
    </div>

    <!-- 星图（深色） -->
    <section class="hero">
      <div class="wrap">
        <div class="hero-head">
          <div class="h1">大盘星图 · A股星系图</div>
          <span class="upd">{{ tradeDate }} 收盘快照</span>
        </div>
        <MarketTabs />
        <div class="tm-toolbar">
          <span>沪深全A · 前 {{ stars.length }} 大市值</span>
          <span>星体大小 = 流通市值</span>
          <span class="legend"><span>绿跌</span><i class="lg-bar"></i><span>红涨</span></span>
          <span class="num">-5% ~ +5%</span>
        </div>
        <div class="star-stage" aria-label="A股大盘星图（演示为收盘快照）">
          <div
            v-for="st in stars" :key="st.code" class="star"
            :style="{ left: st.l + '%', top: st.t + '%', width: st.size + 'px', height: st.size + 'px', backgroundColor: st.color }"
            :title="`${st.name}（${st.code}）${fp(st.pct)}`"
          />
        </div>
        <p class="hero-foot">星图与热力图同源同数据（红涨绿跌，A 股习惯配色）。悬停星体查看个股。数据来自公开行情接口，仅供参考，不构成投资建议。</p>
      </div>
    </section>

    <div class="wrap"><AdSlot name="A" /></div>

    <div class="light-zone">
      <div class="wrap">
        <div class="layout">
          <main>
            <section class="sec">
              <h2>大盘星图怎么看？</h2>
              <div class="tbl-wrap">
                <table class="data">
                  <caption>星图三要素</caption>
                  <thead><tr><th>要素</th><th>含义</th><th>怎么用</th></tr></thead>
                  <tbody>
                    <tr><td>离中心的距离</td><td>流通市值排名</td><td>越靠中心权重越大，中心区域即「核心资产圈」</td></tr>
                    <tr><td>星体大小</td><td>流通市值绝对值</td><td>大星闪烁=权重股异动，对指数影响最大</td></tr>
                    <tr><td>颜色</td><td>当日涨跌幅（红涨绿跌）</td><td>一片绿海=普跌日；中心发绿=权重杀跌，比看指数更直观</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="sec">
              <h2>与东方财富「大盘星图」的对比</h2>
              <div class="tbl-wrap">
                <table class="data">
                  <caption>本站为独立工具站，非东方财富官方，下表为功能层面的客观对比</caption>
                  <thead><tr><th>维度</th><th>Trader Shelf 星图</th><th>东方财富大盘星图</th></tr></thead>
                  <tbody>
                    <tr><td>打开方式</td><td>网页直开，无需下载</td><td>主要在东方财富 APP 内</td></tr>
                    <tr><td>注册登录</td><td>不需要</td><td>部分功能需登录</td></tr>
                    <tr><td>市场覆盖</td><td>A股 + 美股 + 港股 + Crypto 热力图</td><td>A股为主</td></tr>
                    <tr><td>历史回看</td><td>每日收盘自动归档，任意交易日可回看</td><td>以实时为主</td></tr>
                    <tr><td>自动复盘文字</td><td>每日程序化生成中文复盘</td><td>资讯流为主</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <AdSlot name="C" variant="inread" />

            <FaqBlock :title="'大盘星图常见问题'" :faqs="faqs" />

            <section class="sec">
              <h2>相关页面</h2>
              <div class="related-grid">
                <NuxtLink class="rel-card" to="/"><div class="t">A股大盘云图</div><div class="d">矩形热力图版的全市场全景</div></NuxtLink>
                <NuxtLink class="rel-card" to="/sector/semiconductor"><div class="t">半导体板块热力图</div><div class="d">按行业下钻看成分股</div></NuxtLink>
                <NuxtLink class="rel-card" to="/crypto"><div class="t">Crypto 热力图</div><div class="d">7×24 全天候币市星系</div></NuxtLink>
                <NuxtLink class="rel-card" to="/archive"><div class="t">每日归档</div><div class="d">回看任意交易日云图</div></NuxtLink>
              </div>
            </section>
          </main>

          <div class="aside-col">
            <AdSlot name="D" variant="rect" dark />
            <div class="card">
              <h2>换个排布看大盘</h2>
              <div class="idx-grid">
                <div class="idx"><div class="n">矩形树图</div><div class="v" style="font-size: 14px"><NuxtLink to="/">大盘云图 →</NuxtLink></div><div class="c muted">面积精确对应市值</div></div>
                <div class="idx"><div class="n">星系图</div><div class="v" style="font-size: 14px">本页</div><div class="c muted">中心引力式排布</div></div>
              </div>
            </div>
            <div class="card">
              <h2>最近归档</h2>
              <ul class="brief-list small">
                <li v-for="d in archiveDates.slice(0, 4)" :key="d"><NuxtLink :to="`/archive/${d}`">{{ d }} 复盘</NuxtLink></li>
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
import { snap, tradeDate, archiveDates, fp, fmtPrice } from '~/utils/data'
import { heatColor } from '~/utils/treemap'

const sh = (snap.indices || []).find((i: any) => i.code === '000001')
const snapA = snap.a

/* 向日葵螺旋（金色角度 137.5°）星图：确定性排布，SSR 直出 */
const stars = (() => {
  const list = ((snap.a?.top || []) as any[]).slice(0, 220).filter((s) => typeof s.pct === 'number' && s.fmcap > 0)
  const maxCap = list[0]?.fmcap || 1
  const GOLDEN = Math.PI * (3 - Math.sqrt(5))
  // 归一化半径：i → [0.08, 0.98]，市值大的居中
  const n = list.length
  return list.map((s, i) => {
    const rank = i / Math.max(n - 1, 1)
    const r = 0.08 + 0.9 * Math.sqrt(rank)
    const a = i * GOLDEN
    const l = 50 + r * 46 * Math.cos(a)
    const t = 50 + r * 46 * Math.sin(a) * 0.92 // 舞台略扁
    const size = 4 + 26 * Math.sqrt(s.fmcap / maxCap)
    return { code: s.code, name: s.name, pct: s.pct, l, t, size, color: heatColor(s.pct, 'cn') }
  })
})()

const faqs = [
  { q: '什么是大盘星图？', a: '大盘星图是把全市场股票按市值排成一张星系图的看盘方式：星体大小代表市值、颜色代表涨跌幅、离中心越近权重越大。与矩形热力图（大盘云图）数据相同、排布不同，适合一眼感知市场结构与权重异动。' },
  { q: '本页是东方财富官方的大盘星图吗？', a: '不是。本站 Trader Shelf 是独立工具站，本页是我们自研的网页版星图，与东方财富无关联；上文对比表供参考选择。' },
  { q: '星图需要下载 APP 吗？', a: '不需要。网页直接打开即看，手机浏览器同样适用，建议收藏后每个交易日开盘即看。' },
  { q: '能看到历史某天的星图吗？', a: '星图与云图同源，每个交易日收盘后自动归档，可在每日归档中回看任意交易日的市场全景。' },
]

const title = '大盘星图在线看_大盘星图网页版(无需APP) - Trader Shelf'
const desc = `大盘星图网页版：A股全市场星系图在线看，星体大小=市值、颜色=涨跌、中心即权重核心，无需下载APP无需登录，${tradeDate} 收盘自动归档可回看，另有美股港股Crypto热力图。`
useSeoMeta({ title, description: desc, ogTitle: title, ogDescription: desc, ogType: 'website', ogSiteName: 'Trader Shelf', ogUrl: 'https://tradershelf.com/xingtu' })
useHead({
  link: [{ rel: 'canonical', href: 'https://tradershelf.com/xingtu' }],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Trader Shelf', item: 'https://tradershelf.com/' }, { '@type': 'ListItem', position: 2, name: '大盘星图', item: 'https://tradershelf.com/xingtu' }] }) },
    { type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) },
  ],
})
</script>

<style scoped>
.star-stage {
  position: relative;
  background: radial-gradient(ellipse at center, #101725 0%, #0a0e16 70%);
  border: 1px solid var(--dark-line);
  border-radius: var(--radius);
  height: min(58vh, 600px);
  overflow: hidden;
}
.star {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 6px rgba(255, 255, 255, .12);
  transition: background-color .6s;
}
.star:hover {
  outline: 1px solid rgba(255, 255, 255, .7);
  filter: brightness(1.3);
  z-index: 2;
}
</style>
