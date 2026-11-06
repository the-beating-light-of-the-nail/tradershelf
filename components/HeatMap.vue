<template>
  <div>
    <div class="tm-toolbar">
      <span v-if="countLabel">{{ countLabel }}</span>
      <span>{{ sizeLabel }}</span>
      <span class="legend" :class="{ 'lg-intl': palette !== 'cn' }">
        <span>{{ palette === 'cn' ? '绿跌' : '红跌' }}</span><i class="lg-bar"></i><span>{{ palette === 'cn' ? '红涨' : '绿涨' }}</span>
      </span>
      <span v-if="liveState" class="live-dot"><i></i>{{ liveState }}</span>
      <button class="tm-full" type="button" @click="fullscreen">⛶ 全屏盯盘</button>
    </div>

    <div ref="stage" class="tm-stage" :aria-label="ariaLabel || '大盘热力图'">
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

    <p v-if="foot" class="hero-foot">{{ foot }}</p>
  </div>
</template>

<script setup lang="ts">
import { squarify, heatColor, fmtPct, type PaletteMode } from '~/utils/treemap'
import { marketOpen, type Group, type Stock } from '~/utils/data'

const props = withDefaults(
  defineProps<{
    groups: Group[]
    palette?: PaletteMode
    marketKey?: string        // 'a' | 'us' | 'hk'，用于 JSONP 盘中刷新
    liveFs?: string | null    // 东财 clist fs 参数（传入即启用实时刷新）
    countLabel?: string
    sizeLabel?: string
    foot?: string
    ariaLabel?: string
  }>(),
  { palette: 'cn', marketKey: '', liveFs: null, sizeLabel: '面积 = 流通市值' },
)

/* ---------- 分组数据（可被 JSONP 实时合并更新） ---------- */
const groups = ref<Group[]>([])
watchEffect(() => {
  groups.value = (props.groups || []).map((g) => ({
    name: g.name,
    slug: g.slug,
    stocks: g.stocks.filter((s) => typeof s.pct === 'number' && (s.fmcap || s.mcap) > 0).map((s) => ({ ...s })),
  }))
})

/* ---------- 舞台尺寸（百分比输出，窗口变化重排） ---------- */
/* 初始给默认画幅：SSR 阶段即产出 tiles（爬虫可读个股文本），挂载后按真实尺寸重排 */
const stage = ref<HTMLElement | null>(null)
const size = ref({ w: 1200, h: 560 })
onMounted(() => {
  const el = stage.value
  if (!el) return
  const measure = () => {
    const w = el.clientWidth, h = el.clientHeight
    if (w > 0 && h > 0) size.value = { w, h }
  }
  measure()
  const ro = new ResizeObserver(measure)
  ro.observe(el)
  onBeforeUnmount(() => ro.disconnect())
  startLive()
})

/* ---------- 双层布局：板块 → 个股 ---------- */
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
      const sm = r.w < 66 || r.h < 36
      out.push({
        key: s.code,
        l: (r.x / W) * 100, t: (r.y / H) * 100, w: (r.w / W) * 100, h: (r.h / H) * 100,
        color: heatColor(s.pct, props.palette),
        name: s.cname || s.name,
        pct: s.pct,
        title: `${s.cname || s.name}（${s.code}）${fmtPct(s.pct)}`,
        sm,
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

/* ---------- JSONP 盘中实时刷新（东财公开接口，浏览器直连） ---------- */
const liveState = ref('')
let liveTimer: ReturnType<typeof setInterval> | null = null
function startLive() {
  if (!props.liveFs || !props.marketKey) return
  const refresh = async () => {
    if (!marketOpenLocal()) { liveState.value = '' ; return }
    try {
      const data = await jsonpClist(props.liveFs!)
      applyLive(data)
      const now = new Date()
      liveState.value = '实时 ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    } catch { /* 静默失败，保留静态快照 */ }
  }
  refresh()
  liveTimer = setInterval(refresh, 15000)
  onBeforeUnmount(() => { if (liveTimer) clearInterval(liveTimer) })
}
const marketOpenLocal = () => marketOpen(props.marketKey)

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
  if (hit) groups.value = [...groups.value] // 触发响应式重算
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
