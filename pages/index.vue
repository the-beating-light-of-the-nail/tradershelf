<template>
  <div>
    <!-- ======== 首屏：A股全景热力图（深色盯盘区，盘中 JSONP 实时刷新） ======== -->
    <section class="hero">
      <div class="wrap">
        <div class="hero-head">
          <h1>大盘云图 · A股全景热力图</h1>
          <div class="hero-head-r">
            <span class="upd">{{ tradeDate }} 收盘快照<span v-if="stale.length">（部分数据延迟）</span> · <NuxtLink to="/xingtu">换成星图看 →</NuxtLink></span>
            <a class="cta-app" href="/app?market=a&from=%2F" title="进入实时完整版看盘工具（本站 /app）">⚡ 实时完整版看盘 →</a>
          </div>
        </div>
        <MarketTabs />
        <HeatMap
          :groups="aGroups()"
          palette="cn"
          market-key="a"
          app-link="/app?market=a&from=%2F"
          live-fs="m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048"
          :count-label="`沪深全A · ${total} 只（按流通市值前 ${topN} 只展示）`"
          :aria-label="'A股大盘云图热力图'"
          :foot="`热力图按流通市值排布、颜色代表当日涨跌幅（红涨绿跌，A股习惯配色）。图下方的复盘卡片与数据表格由同源行情自动生成。数据来自公开行情接口，可能存在延迟，仅供参考，不构成投资建议。`"
        />
      </div>
    </section>

    <div class="wrap"><AdSlot name="A" /></div>

    <!-- ======== 浅色门户内容区 ======== -->
    <div class="light-zone">
      <div class="wrap">
        <div class="layout">
          <main>
            <section class="card">
              <h2>今日复盘 · {{ tradeDate }} <NuxtLink class="small" to="/archive">阅读完整归档 →</NuxtLink></h2>
              <div class="kicker"><span class="badge">自动生成</span><span>每交易日收盘后由数据管线更新</span></div>
              <ul class="brief-list">
                <li v-for="(b, i) in review.briefs" :key="i"><span class="tag-mkt" v-html="tagOf(b)" />{{ stripTag(b) }}</li>
              </ul>
            </section>

            <section class="bento">
              <div class="card">
                <h2>行业冷暖 · 概念轮动</h2>
                <div class="kicker"><span>领涨板块（点击进入板块页）</span></div>
                <div class="chips">
                  <template v-for="b in boardsTop" :key="b.name">
                    <NuxtLink v-if="slugOf(b.name)" class="chip" :to="`/sector/${slugOf(b.name)}`">{{ b.name }} <b :class="clsCN(b.pct)">{{ fp(b.pct) }}</b></NuxtLink>
                    <span v-else class="chip">{{ b.name }} <b :class="clsCN(b.pct)">{{ fp(b.pct) }}</b></span>
                  </template>
                </div>
                <div class="kicker" style="margin-top: 14px"><span>领跌板块</span></div>
                <div class="chips">
                  <span v-for="b in boardsBottom" :key="b.name" class="chip">{{ b.name }} <b :class="clsCN(b.pct)">{{ fp(b.pct) }}</b></span>
                </div>
              </div>

              <div class="card">
                <h2>跨市场核心指标</h2>
                <div class="kicker"><span>A股/港股 红涨绿跌 · 美股/Crypto 绿涨红跌</span></div>
                <div class="idx-grid">
                  <div v-for="i in idxCards" :key="i.code" class="idx">
                    <div class="n">{{ i.name }}</div>
                    <div class="v num">{{ fmtPrice(i.price) }}</div>
                    <div class="c num" :class="i.cls">{{ fp(i.pct) }}</div>
                  </div>
                </div>
              </div>
            </section>

            <AdSlot name="B" variant="inread" desc="in-feed 原生广告预留 · 与卡片同构" />

            <!-- 服务端直出的权重股表格：热力图之外的可爬文本层 -->
            <section class="sec" style="margin-top: 0">
              <h2>今日全A流通市值前 20 权重股</h2>
              <div class="tbl-wrap">
                <table class="data">
                  <caption>{{ tradeDate }} 收盘 · 数据来自公开行情接口，仅供参考</caption>
                  <thead>
                    <tr><th>名称</th><th>代码</th><th>涨跌幅</th><th>最新价</th><th>流通市值</th><th>行业</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in topStocks" :key="s.code">
                      <td>{{ s.name }}</td>
                      <td class="num">{{ s.code }}</td>
                      <td :class="clsCN(s.pct)">{{ fp(s.pct) }}</td>
                      <td class="num">{{ fmtPrice(s.price) }}</td>
                      <td class="num">{{ fmtCap(s.fmcap, 'cny') }}</td>
                      <td class="muted">{{ s.ind }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="card">
              <h2>交易者的工具架</h2>
              <div class="kicker"><span>财经工具逐渐上架 · 跨界工具将拆分到 tool.tradershelf.com</span></div>
              <div class="tool-grid">
                <NuxtLink class="tool-item" to="/archive"><div class="t">每日复盘归档</div><div class="d">任意交易日云图与板块涨跌回看，收盘自动归档</div></NuxtLink>
                <NuxtLink class="tool-item" to="/xingtu"><div class="t">大盘星图 <span class="muted small">NEW</span></div><div class="d">星系图模式的另一种看盘姿势，中心即权重核心</div></NuxtLink>
                <div class="tool-item"><div class="t">指数估值表 <span class="muted small">（即将上线）</span></div><div class="d">沪深300/中证500 等主要指数 PE/PB 分位数每日更新</div></div>
                <div class="tool-item"><div class="t">ETF 资金流向 <span class="muted small">（即将上线）</span></div><div class="d">主流 ETF 份额变化与净申购追踪</div></div>
                <div class="tool-item"><div class="t">恐慌贪婪指数 <span class="muted small">（即将上线）</span></div><div class="d">Crypto 多空情绪仪表盘，24 小时更新</div></div>
                <div class="tool-item"><div class="t">网格交易计算器 <span class="muted small">（即将上线）</span></div><div class="d">区间/格数/仓位一键回测</div></div>
                <div class="tool-item"><div class="t">复利定投计算器 <span class="muted small">（即将上线）</span></div><div class="d">目标收益与定投压力测试</div></div>
                <div class="tool-item"><div class="t">个股云图搜索 <span class="muted small">（即将上线）</span></div><div class="d">输入名称/代码直达个股热力卡与历史归档</div></div>
              </div>
            </section>
          </main>

          <!-- 侧栏 -->
          <div class="aside-col">
            <AdSlot name="D" variant="rect" dark />
            <div class="card">
              <h2>大盘涨跌家数</h2>
              <div class="kicker"><span>{{ tradeDate }} 收盘</span></div>
              <div class="updown" v-if="snap.a">
                <div>上涨 <b class="pos-cn num">{{ up.toLocaleString() }}</b> · 下跌 <b class="neg-cn num">{{ down.toLocaleString() }}</b> · 平盘 <span class="num">{{ flat }}</span></div>
                <div class="bar">
                  <i class="b-up" :style="{ width: upPct + '%' }" />
                  <i class="b-dn" :style="{ width: downPct + '%' }" />
                  <i :style="{ width: Math.max(flatPct, 1) + '%', background: '#8b95a1' }" />
                </div>
                <div class="small muted">两市成交 {{ fmtAmount(snap.a.amount) }}</div>
              </div>
              <div v-else class="small muted">数据更新中</div>
            </div>

            <div class="card" v-if="snap.boards">
              <h2>主力资金流向</h2>
              <div class="kicker"><span>行业净流入 / 净流出（亿元）</span></div>
              <div v-for="b in snap.boards.flowIn" :key="'fi' + b.name" class="flow-row">
                <div class="lbl"><span>{{ b.name }}</span><b class="pos-cn num">{{ fmtFlow(b.flow) }}</b></div>
                <div class="trk"><i :style="{ width: flowBar(b.flow, true) + '%', background: 'var(--up-cn)' }" /></div>
              </div>
              <div v-for="b in snap.boards.flowOut.slice(0, 2)" :key="'fo' + b.name" class="flow-row">
                <div class="lbl"><span>{{ b.name }}</span><b class="neg-cn num">{{ fmtFlow(b.flow) }}</b></div>
                <div class="trk"><i :style="{ width: flowBar(b.flow, false) + '%', background: 'var(--down-cn)' }" /></div>
              </div>
            </div>

            <div class="card">
              <h2>最近归档</h2>
              <div class="kicker"><span>每日收盘自动生成</span></div>
              <ul class="brief-list small">
                <li v-for="d in archiveDates.slice(0, 5)" :key="d"><NuxtLink :to="`/archive/${d}`">{{ d }} 复盘</NuxtLink></li>
              </ul>
            </div>
          </div>
        </div>

        <!-- ======== 长尾内链矩阵 ======== -->
        <section class="linkfarm">
          <h2>热门看图入口</h2>
          <div class="lf-grid">
            <div class="lf-col">
              <h3>市场云图</h3>
              <ul>
                <li><NuxtLink to="/">A股大盘云图</NuxtLink></li>
                <li><NuxtLink to="/us">美股大盘云图</NuxtLink></li>
                <li><NuxtLink to="/hk">港股大盘云图</NuxtLink></li>
                <li><NuxtLink to="/crypto">Crypto 热力图</NuxtLink></li>
                <li><NuxtLink to="/xingtu">大盘星图（对比评测）</NuxtLink></li>
              </ul>
            </div>
            <div class="lf-col">
              <h3>板块热力图</h3>
              <ul>
                <li v-for="s in sectors" :key="s.slug"><NuxtLink :to="`/sector/${s.slug}`">{{ s.display }}热力图</NuxtLink></li>
              </ul>
            </div>
            <div class="lf-col">
              <h3>每日归档</h3>
              <ul>
                <li v-for="d in archiveDates.slice(0, 5)" :key="d"><NuxtLink :to="`/archive/${d}`">{{ d }} 大盘云图复盘</NuxtLink></li>
                <li><NuxtLink to="/archive">全部归档 &gt;&gt;</NuxtLink></li>
              </ul>
            </div>
            <div class="lf-col">
              <h3>工具与站点</h3>
              <ul>
                <li><a href="#">恐慌贪婪指数<span class="todo">待建</span></a></li>
                <li><a href="#">网格交易计算器<span class="todo">待建</span></a></li>
                <li><a href="#">复利定投计算器<span class="todo">待建</span></a></li>
                <li><NuxtLink to="/about">关于本站</NuxtLink></li>
                <li><NuxtLink to="/privacy">隐私政策</NuxtLink></li>
                <li><NuxtLink to="/disclaimer">免责声明</NuxtLink></li>
              </ul>
            </div>
          </div>
        </section>
        <AdSlot name="E" desc="AdSense Display 预留 · 次级位置" style="margin-bottom: 0" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  snap, stale, tradeDate, archiveDates, aGroups, fp, fmtPrice, fmtCap, fmtAmount, fmtFlow,
  clsCN, clsIntl, aReview, type Stock,
} from '~/utils/data'
import sectorsRaw from '~/data/sectors.config.json'

const sectors = sectorsRaw as any[]
const review = aReview()
const topStocks = ((snap.a?.top || []) as Stock[]).slice(0, 20)
const total = computed(() => snap.a?.total || 0)
const topN = computed(() => snap.a?.top?.length || 600)
const up = computed(() => snap.a?.up || 0)
const down = computed(() => snap.a?.down || 0)
const flat = computed(() => snap.a?.flat || 0)
const all = computed(() => Math.max(up.value + down.value + flat.value, 1))
const upPct = computed(() => Math.round((up.value / all.value) * 100))
const downPct = computed(() => Math.round((down.value / all.value) * 100))
const flatPct = computed(() => Math.max(100 - upPct.value - downPct.value, 0))

const boardsTop = computed(() => (snap.boards?.top || []).slice(0, 6))
const boardsBottom = computed(() => (snap.boards?.bottom || []).slice(0, 4))
const slugOf = (name: string) => sectors.find((s) => s.name === name)?.slug
const maxFlow = computed(() => Math.max(...(snap.boards?.flowIn || []).map((b: any) => Math.abs(b.flow)), 1))
const flowBar = (v: number, isIn: boolean) => {
  const m = isIn ? maxFlow.value : Math.max(...(snap.boards?.flowOut || []).slice(0, 2).map((b: any) => Math.abs(b.flow)), 1)
  return Math.min(Math.round((Math.abs(v) / m) * 100), 100)
}
const tagOf = (b: string) => b.slice(0, b.indexOf(']') + 1)
const stripTag = (b: string) => b.replace(/^\[[^\]]+\]/, '')

const idxCards = computed(() => {
  const mk = (code: string, cls: 'cn' | 'intl', name?: string) => {
    const i = (snap.indices || []).find((x: any) => x.code === code)
    return i ? { ...i, name: name || i.name, cls: cls === 'cn' ? clsCN(i.pct) : clsIntl(i.pct) } : null
  }
  return [
    mk('000001', 'cn'), mk('399001', 'cn'), mk('399006', 'cn'),
    mk('HSI', 'cn'), mk('NDX', 'intl', '纳斯达克(昨收)'), mk('SPX', 'intl', '标普500(昨收)'),
  ].filter(Boolean)
})

useSeoMeta({
  title: '大盘云图_股票热力图_美股港股Crypto行情云图 - Trader Shelf',
  description: `Trader Shelf 大盘云图：一个页面看全 A股、美股、港股与加密货币热力图，按市值呈现个股与板块涨跌全景，${tradeDate} 收盘后自动生成每日复盘与板块归档，免费在线盯盘工具。`,
  ogTitle: '大盘云图_股票热力图_美股港股Crypto行情云图 - Trader Shelf',
  ogDescription: 'A股/美股/港股/Crypto 实时热力图 + 每日自动复盘归档，免费在线盯盘。',
  ogType: 'website',
  ogSiteName: 'Trader Shelf',
  ogUrl: 'https://tradershelf.com/',
})
useHead({
  link: [{ rel: 'canonical', href: 'https://tradershelf.com/' }],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Trader Shelf 大盘云图', alternateName: '交易者的工具架', url: 'https://tradershelf.com/', inLanguage: 'zh-CN', description: 'A股、美股、港股与加密货币实时大盘云图热力图，含每日复盘归档与板块热力图长尾页矩阵。' }) }],
})
</script>
