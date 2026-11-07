<template>
  <div>
    <div class="tm-toolbar">
      <span v-if="countLabel">{{ countLabel }}</span>
      <span>{{ sizeLabel }}</span>
      <span class="legend" :class="{ 'lg-intl': palette !== 'cn' }">
        <span>{{ palette === 'cn' ? '绿跌' : '红跌' }}</span><i class="lg-bar"></i><span>{{ palette === 'cn' ? '红涨' : '绿涨' }}</span>
      </span>
      <span class="tm-hint">{{ appLink ? '悬停看详情 · 点击板块进入实时完整版' : '悬停看详情 · 点击板块下钻 · 滚轮缩放' }}</span>
      <span v-if="status" class="live-dot" :class="status.open ? 'is-open' : 'is-off'" :title="status.hint"><i></i>{{ badgeText }}</span>
      <button class="tm-full" type="button" title="下载当前云图 PNG" @click="shot">📷 截图</button>
      <button class="tm-full" type="button" @click="fullscreen">⛶ 全屏盯盘</button>
    </div>

    <div ref="stage" class="tm-stage" :aria-label="ariaLabel || '大盘热力图'">
    <!-- SEO 层：SSR 个股 tiles（爬虫可读文本层），ECharts 就绪后让位给 Canvas，数据同源 -->
    <div v-show="!chartReady" style="position:absolute;inset:0">
        <div
          v-for="t in tiles" :key="t.key" class="tm-cell"
          :style="{ left: t.l + '%', top: t.t + '%', width: t.w + '%', height: t.h + '%', backgroundColor: t.color, fontSize: t.sm ? '12px' : undefined }"
          :title="t.title"
        >
          <span v-if="t.showName" class="tm-name">{{ t.name }}</span>
          <span v-if="t.showPct" class="tm-chg">{{ fmtPct(t.pct) }}</span>
        </div>
        <div v-for="g in groupLabels" :key="'g' + g.key" class="tm-group-label" :style="{ left: g.l + '%', top: g.t + '%' }">{{ g.name }}</div>
      </div>
      <!-- 图表容器常驻 DOM：未就绪时 pointer-events:none 不挡 tiles，首个非零布局时 init -->
      <div ref="chartEl" :style="chartReady ? 'position:absolute;inset:0' : 'position:absolute;inset:0;pointer-events:none'" />
    </div>

    <!-- 个股详情面板：点击色块弹出（日K + 同板块成分列表） -->
    <StockPanel
      :stock="picked" :peers="pickedPeers" :palette="palette" :ccy="ccy"
      @close="picked = null" @pick="onPanelPick"
    />

    <p v-if="foot" class="hero-foot">{{ foot }}</p>
  </div>
</template>

<script setup lang="ts">
import { squarify, heatColor, fmtPct, type PaletteMode } from '~/utils/treemap'
import { fmtCap, type Group, type Stock } from '~/utils/data'
import { marketStatus, statusBadge, type MarketKey, type MarketStatus } from '~/utils/session'

const props = withDefaults(
  defineProps<{
    groups: Group[]
    palette?: PaletteMode
    marketKey?: string        // 'a' | 'us' | 'hk'，用于 JSONP 盘中刷新
    liveFs?: string | null    // 东财 clist fs 参数（传入即启用实时刷新）
    liveUrl?: string | null   // 同源 JSON 轮询（如 /api/crypto），返回 {coins:[{code,pct,price}]}
    liveInterval?: number     // 轮询间隔 ms（liveUrl 模式，默认 60s）
    countLabel?: string
    sizeLabel?: string
    foot?: string
    ariaLabel?: string
    ccy?: 'cny' | 'usd' | 'hkd'
    appLink?: string | null   // 传入即启用引流：板块 tile 点击 → /app 完整工具深链（自动拼 &focus=板块名）
  }>(),
  { palette: 'cn', marketKey: '', liveFs: null, liveUrl: null, liveInterval: 60000, sizeLabel: '面积 = 流通市值', ccy: 'cny', appLink: null },
)

/* ---------- 个股详情面板状态 ---------- */
const picked = ref<Stock | null>(null)
const pickedPeers = ref<Group | null>(null)
function openPanel(code: string) {
  for (const g of groups.value) {
    const s = g.stocks.find((x) => x.code === code)
    if (s) { picked.value = s; pickedPeers.value = g; return }
  }
}
function onPanelPick(s: Stock) { picked.value = s }

/* ---------- 分组数据（可被 JSONP / JSON 轮询实时合并更新） ---------- */
const groups = ref<Group[]>([])
watchEffect(() => {
  groups.value = (props.groups || []).map((g) => ({
    name: g.name,
    slug: g.slug,
    stocks: g.stocks.filter((s) => typeof s.pct === 'number' && (s.fmcap || s.mcap) > 0).map((s) => ({ ...s })),
  }))
})

/* ---------- 舞台尺寸（SSR 默认画幅 → 挂载后真实尺寸重排；图表随容器 resize） ---------- */
const stage = ref<HTMLElement | null>(null)
const chartEl = ref<HTMLElement | null>(null)
const size = ref({ w: 1200, h: 560 })

/* ============================================================
   ECharts 交互层（懒加载；SSR tiles 先行，图表就绪后无缝接管）
   能力：悬停详情卡 / 点击板块下钻(leafDepth) / 缩放拖拽 / 面包屑 / 截图
   ============================================================ */
const chartReady = ref(false)
let chart: any = null

const multi = computed(() => groups.value.length > 1)

function seriesData() {
  return groups.value.map((g) => ({
    name: g.name,
    children: g.stocks.map((s) => ({
      name: s.cname || s.name,
      code: s.code,
      pct: s.pct,
      price: s.price,
      value: s.fmcap || s.mcap || 0,
      itemStyle: { color: heatColor(s.pct, props.palette) },
    })),
  }))
}

function buildOption() {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(16,21,29,.95)',
      borderColor: '#1f2836',
      textStyle: { color: '#e8eef6', fontSize: 12 },
      formatter: (p: any) => {
        const d = p.data || {}
        if (d.children) {
          const up = d.children.filter((c: any) => c.pct > 0).length
          const action = props.appLink ? '点击进入实时完整版' : '点击下钻查看个股'
          return `<b>${p.name}</b> · 成分 ${d.children.length} 只<br/>上涨 ${up} · 下跌 ${d.children.length - up}<br/><span style="color:#8b95a1">${action}</span>`
        }
        const up = props.palette === 'cn' ? '#ff7b72' : '#3fd69b'
        const dn = props.palette === 'cn' ? '#3fd69b' : '#ff7b72'
        const cls = d.pct > 0 ? up : d.pct < 0 ? dn : '#8b95a1'
        const cap = fmtCap(d.value || 0, props.palette === 'cn' ? 'cny' : 'usd')
        return `<b>${p.name}</b>（${d.code}）<br/>涨跌幅 <b style="color:${cls}">${fmtPct(d.pct)}</b><br/>最新价 ${typeof d.price === 'number' ? d.price : '--'}<br/>市值 ${cap}`
      },
    },
    series: [
      {
        type: 'treemap',
        left: 0, right: 0, top: 0, bottom: 0,
        roam: true,
        nodeClick: false, // 手动接管：板块节点=下钻，个股节点=详情面板
        leafDepth: multi.value ? 2 : undefined,
        breadcrumb: multi.value
          ? { show: true, bottom: 4, height: 22, itemStyle: { color: '#141a24', borderColor: '#1f2836', textStyle: { color: '#aab6c5', fontSize: 11 } } }
          : { show: false },
        upperLabel: { show: multi.value, height: 20, color: 'rgba(255,255,255,.78)', fontSize: 11, fontWeight: 600, padding: [0, 0, 0, 6] },
        label: {
          show: true, color: '#fff', fontSize: 11,
          formatter: (p: any) => `${p.name}\n${fmtPct(p.data.pct)}`,
          textShadowColor: 'rgba(0,0,0,.35)', textShadowBlur: 2,
        },
        levels: [
          { itemStyle: { borderWidth: 5, gapWidth: 4, borderColor: '#0c1017' } },
          { itemStyle: { borderWidth: 1, gapWidth: 1, borderColor: 'rgba(12,16,23,.6)' } },
        ],
        data: seriesData(),
      },
    ],
  }
}

/* echarts 模块预热（等待首帧布局期间并行加载，消除初始化空窗） */
let echartsWarm: Promise<any[]> | null = null
function warmEcharts() {
  echartsWarm ||= Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ])
  return echartsWarm
}

/* 只在首个非零布局时调用（见 onMounted.measure），彻底规避 0 尺寸 init 与后台页签竞态 */
async function initChart() {
  const W = window as any
  try {
    W.__tsChartStep = 'await-imports'
    const [{ init, use }, charts, comps, renders] = await warmEcharts()
    W.__tsChartStep = 'use'
    use([charts.TreemapChart, comps.TooltipComponent, renders.CanvasRenderer])
    // chartEl 同样自愈：ref 失联时从舞台第 2 个子节点找回
    let cel: HTMLElement | null = chartEl.value && (chartEl.value as any).isConnected ? chartEl.value : null
    if (!cel) {
      const st = resolveStage()
      cel = st ? (st.querySelector('div[ref], div:nth-child(2)') as HTMLElement) : null
      // 兜底：建一个新容器（极端情况节点全丢）
      if (!cel && st) { cel = document.createElement('div'); cel.style.cssText = 'position:absolute;inset:0'; st.appendChild(cel) }
      if (cel) chartEl.value = cel as any
    }
    if (!cel) { W.__tsChartErr = 'no chartEl'; return }
    // 等容器非零（最多 10×250ms）
    for (let i = 0; i < 10 && cel.clientWidth === 0; i++) await new Promise((r) => setTimeout(r, 250))
    W.__tsChartStep = 'init@' + cel.clientWidth
    chart = init(cel)
    chart.setOption(buildOption())
    chartReady.value = true
    // 点击接管：板块 → /app 完整工具深链（预览即诱饵）；个股 → 详情面板
    chart.on('click', (p: any) => {
      const d = p.data || {}
      if (d.children && d.children.length) {
        if (props.appLink) {
          const sep = props.appLink.includes('?') ? '&' : '?'
          window.location.href = `${props.appLink}${sep}focus=${encodeURIComponent(p.name)}`
        } else {
          chart.dispatchAction({ type: 'treemapZoomToNode', seriesIndex: 0, name: p.name })
        }
      } else if (d.code) {
        openPanel(d.code)
      }
    })
    W.__tsChartStep = 'ready'
  } catch (e) {
    W.__tsChartErr = String((e as any)?.message || e)
    // 图表加载失败 → 保留 SSR tiles，功能不降级
    chartReady.value = false
  }
}

function updateChart() {
  if (chart) chart.setOption({ series: [{ data: seriesData() }] })
}
watch(groups, updateChart)

/* ---------- 截图分享（PNG 下载） ---------- */
function shot() {
  if (!chart) return
  const url = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#0c1017' })
  const a = document.createElement('a')
  a.href = url
  a.download = `tradershelf-${props.marketKey || (props.liveUrl ? 'crypto' : 'map')}-${Date.now()}.png`
  a.click()
}

/* ---------- 挂载：首个非零布局 → init 图表；布局变化 → resize ---------- */
let RO: ResizeObserver | null = null
let inited = false
let observedNode: HTMLElement | null = null
/** 解析当前舞台节点：ref 优先，失联（null/游离）时 querySelector 自愈 */
function resolveStage(): HTMLElement | null {
  const r = stage.value
  if (r && r.isConnected) return r
  const live = document.querySelector('.tm-stage')
  if (live) { stage.value = live as any; return live }
  return r && !r.isConnected ? live : r
}
onMounted(() => {
  const measure = () => {
    const el = resolveStage()
    const W = window as any
    W.__tsM = (W.__tsM || '') + '|' + (el ? (el.isConnected ? el.clientWidth + 'x' + el.clientHeight : 'disc!') : 'nullref')
    if (!el || !el.isConnected) return
    if (RO && observedNode !== el) { RO.disconnect(); RO.observe(el); observedNode = el }
    const w = el.clientWidth, h = el.clientHeight
    if (w > 0 && h > 0) {
      size.value = { w, h }
      if (!inited) { inited = true; initChart() }
      else chart?.resize()
    }
  }
  measure()
  RO = new ResizeObserver(measure)
  RO.observe(el)
  // webview 兜底：RO 在部分内嵌浏览器不可靠，多重触发保证首个非零布局一定被捕获
  window.addEventListener('resize', measure)
  document.addEventListener('visibilitychange', measure)
  const t1 = setTimeout(measure, 300), t2 = setTimeout(measure, 1200), t3 = setTimeout(measure, 3000)
  onBeforeUnmount(() => {
    RO?.disconnect(); chart?.dispose()
    window.removeEventListener('resize', measure)
    document.removeEventListener('visibilitychange', measure)
    clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
  })
  warmEcharts()
  startLive()
})

/* ---------- SSR tiles 计算（保留给爬虫与图表降级） ---------- */
interface TileView { key: string; l: number; t: number; w: number; h: number; color: string; name: string; pct: number; title: string; sm: boolean; showName: boolean; showPct: boolean }
const tiles = computed<TileView[]>(() => {
  const { w: W, h: H } = size.value
  if (!W || !H || !groups.value.length) return []
  const val = (s: Stock) => s.fmcap || s.mcap || 0
  const gRects = squarify(
    groups.value.map((g) => ({ v: g.stocks.reduce((sum, s) => sum + val(s), 0), d: g })),
    0, 0, W, H,
  )
  const out: TileView[] = []
  for (const gr of gRects) {
    const inner = squarify(
      gr.d.stocks.map((s: Stock) => ({ v: val(s), d: s })),
      gr.x + 1, gr.y + 1, Math.max(gr.w - 2, 1), Math.max(gr.h - 2, 1),
    )
    for (const r of inner) {
      const s: Stock = r.d
      out.push({
        key: s.code,
        l: (r.x / W) * 100, t: (r.y / H) * 100, w: (r.w / W) * 100, h: (r.h / H) * 100,
        color: heatColor(s.pct, props.palette),
        name: s.cname || s.name,
        pct: s.pct,
        title: `${s.cname || s.name}（${s.code}）${fmtPct(s.pct)}`,
        sm: r.w < 66 || r.h < 36,
        showName: r.w > 30 && r.h > 16,
        showPct: r.w > 44 && r.h > 26,
      })
    }
  }
  return out
})

const groupLabels = computed(() => {
  const { w: W, h: H } = size.value
  if (!W || !H) return []
  const val = (s: Stock) => s.fmcap || s.mcap || 0
  const gRects = squarify(groups.value.map((g) => ({ v: g.stocks.reduce((sum, s) => sum + val(s), 0), d: g })), 0, 0, W, H)
  return gRects
    .filter((r) => r.w > 56 && r.h > 40 && r.d.name)
    .map((r) => ({ key: r.d.name, name: r.d.name, l: (r.x / W) * 100 + 0.8, t: (r.y / H) * 100 + 0.6 }))
})

/* ---------- 全屏 ---------- */
function fullscreen() {
  const el = stage.value
  if (!el) return
  if (document.fullscreenElement) document.exitFullscreen()
  else el.requestFullscreen?.()
}

/* ---------- 交易时段徽章（客户端按市场所在时区判断；SSR 不渲染，避免水合不一致） ---------- */
const sessionKey = computed<MarketKey>(
  () => (props.marketKey as MarketKey) || (props.liveUrl ? 'crypto' : 'a'),
)
const status = ref<MarketStatus | null>(null)
const badgeText = computed(() => (status.value ? statusBadge(status.value) : ''))
let statusTimer: ReturnType<typeof setInterval> | null = null

/* ---------- 实时通道：东财 JSONP（A股/美股/港股）或同源 JSON（crypto） ---------- */
const liveState = ref('')
let liveTimer: ReturnType<typeof setInterval> | null = null
function startLive() {
  // 时段状态：进页面算一次，之后每 30s 刷新（跨过收盘/午休时徽章自动切换）
  status.value = marketStatus(sessionKey.value)
  statusTimer = setInterval(() => { status.value = marketStatus(sessionKey.value) }, 30000)
  onBeforeUnmount(() => { if (statusTimer) clearInterval(statusTimer) })

  // 模式一：同源 JSON 轮询（crypto 等，7×24 不判断交易时段）
  if (props.liveUrl) {
    const refreshJson = async () => {
      try {
        const res = await fetch(props.liveUrl!, { headers: { accept: 'application/json' } })
        const body = await res.json()
        if (body && body.ok && Array.isArray(body.coins)) {
          applyLive(body.coins.map((c: any) => ({ f12: c.code, f3: c.pct, f2: c.price })))
          liveState.value = 'synced'
        }
      } catch { /* 静默失败，保留静态快照 */ }
    }
    refreshJson()
    liveTimer = setInterval(refreshJson, props.liveInterval)
    onBeforeUnmount(() => { if (liveTimer) clearInterval(liveTimer) })
    return
  }
  // 模式二：东财 JSONP（A股/美股/港股，仅交易时段拉取）
  if (!props.liveFs || !props.marketKey) return
  const refresh = async () => {
    if (!status.value?.open) return // 收盘后不再打扰上游，徽章已显示「已收盘」
    try {
      const data = await jsonpClist(props.liveFs!)
      applyLive(data)
      liveState.value = 'synced'
    } catch { /* 静默失败，保留静态快照 */ }
  }
  refresh()
  liveTimer = setInterval(refresh, 15000)
  onBeforeUnmount(() => { if (liveTimer) clearInterval(liveTimer) })
}

function applyLive(diff: any[]) {
  const map = new Map<string, { pct: number; price: number }>()
  for (const x of diff) map.set(x.f12, { pct: typeof x.f3 === 'number' ? x.f3 : 0, price: x.f2 as number })
  let hit = 0
  for (const g of groups.value) {
    for (const s of g.stocks) {
      const u = map.get(s.code)
      if (u) { s.pct = u.pct; if (typeof u.price === 'number') s.price = u.price; hit++ }
    }
  }
  if (hit) groups.value = [...groups.value] // 触发响应式重算（SSR tiles + ECharts 同步更新）
}

/** 东财 clist JSONP（cb 回调绕开 CORS，无需 Worker 代理） */
function jsonpClist(fs: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const cb = '__ts_cb_' + Math.random().toString(36).slice(2)
    const url =
      `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=600&po=1&np=1&fltt=2&invt=2&fid=f21` +
      `&fs=${encodeURIComponent(fs)}&fields=f2,f3,f12,f14,f20,f21&cb=${cb}`
    const script = document.createElement('script')
    const cleanup = () => { delete (window as any)[cb]; script.remove() }
    const timer = setTimeout(() => { cleanup(); reject(new Error('jsonp timeout')) }, 8000)
    ;(window as any)[cb] = (res: any) => {
      clearTimeout(timer)
      cleanup()
      const diff = res?.data?.diff
      resolve(diff ? (Array.isArray(diff) ? diff : Object.values(diff)) : [])
    }
    script.src = url
    script.onerror = () => { clearTimeout(timer); cleanup(); reject(new Error('jsonp error')) }
    document.head.appendChild(script)
  })
}
</script>
