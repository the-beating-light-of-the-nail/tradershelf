<template>
  <transition name="stk-slide">
    <aside v-if="stock" class="stk-panel" role="dialog" :aria-label="`个股详情 ${stock.name}`">
      <!-- 头部：名称/代码 + 迷你走势 + 报价 -->
      <header class="stk-head">
        <div class="stk-title">
          <span class="stk-name">{{ stock.cname || stock.name }}</span>
          <span class="stk-code num">{{ stock.code }}</span>
          <svg v-if="sparkPts" class="stk-spark" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
            <polyline :points="sparkPts" fill="none" :stroke="upC" stroke-width="1.6" />
          </svg>
        </div>
        <div class="stk-quote">
          <span class="stk-price num">{{ fmtPrice(stock.price) }}</span>
          <span class="stk-pct num" :style="{ color: pctColor(stock.pct) }">{{ fp(stock.pct) }}</span>
          <span class="stk-cap muted small">市值 {{ fmtCap(stock.mcap || stock.fmcap || 0, ccy) }}</span>
        </div>
        <button class="stk-close" type="button" aria-label="关闭" @click="$emit('close')">✕</button>
      </header>

      <!-- 日K：蜡烛图 + MA5/MA10 + 成交量副图 -->
      <div class="stk-kline">
        <div v-if="klineMsg" class="stk-kmsg small">{{ klineMsg }}</div>
        <div v-show="!klineMsg" ref="kEl" class="stk-kbox" />
        <div v-if="!klineMsg" class="stk-ma small">
          <span style="color:#f0b64a">MA5 {{ maTxt.ma5 }}</span>
          <span style="color:#2e7ce0;margin-left:8px">MA10 {{ maTxt.ma10 }}</span>
          <span class="muted" style="margin-left:auto">日K · 前复权 · 近{{ klineDays }}日</span>
        </div>
      </div>

      <!-- 板块统计条 -->
      <div class="stk-sectorbar">
        <span class="stk-sector-name" :title="peersLabel">{{ peersLabel }}</span>
        <span class="num"><b :style="{ color: pctColor(peerPct) }">{{ upCount }}涨 {{ downCount }}跌 {{ fp(peerPct) }}</b></span>
      </div>

      <!-- 排序 Tab + 成分股列表 -->
      <nav class="stk-tabs" role="tablist">
        <button v-for="t in tabs" :key="t.k" type="button" :class="{ on: sortKey === t.k }" @click="sortKey = t.k">{{ t.label }}</button>
      </nav>
      <ul class="stk-list">
        <li
          v-for="s in sortedPeers" :key="s.code" :class="{ cur: s.code === stock.code }"
          @click="$emit('pick', s)"
        >
          <span class="n">{{ s.cname || s.name }}</span>
          <span class="p num muted">{{ fmtPrice(s.price) }}</span>
          <span class="c num" :style="{ color: pctColor(s.pct) }">{{ fp(s.pct) }}</span>
        </li>
      </ul>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { fp, fmtPrice, fmtCap, secidOf, type Stock, type Group } from '~/utils/data'

const props = withDefaults(
  defineProps<{
    stock: Stock | null
    peers?: Group | null        // 同板块成分（列表数据源）
    palette?: 'cn' | 'intl' | 'intl-wide'
    ccy?: 'cny' | 'usd' | 'hkd'
  }>(),
  { peers: null, palette: 'cn', ccy: 'cny' },
)
const emit = defineEmits<{ (e: 'close'): void; (e: 'pick', s: Stock): void }>()

/* ---------- 配色 ---------- */
const upC = computed(() => (props.palette === 'cn' ? '#ff6b62' : '#3fd69b'))
const dnC = computed(() => (props.palette === 'cn' ? '#3fd69b' : '#ff6b62'))
const pctColor = (p: number) => (p > 0 ? upC.value : p < 0 ? dnC.value : '#8b95a1')

/* ---------- 板块统计 + 排序列表 ---------- */
const peersLabel = computed(() => (props.peers?.name ? `${props.peers.name} · 同板块` : '同板块成分'))
const peerList = computed<Stock[]>(() => props.peers?.stocks || [])
const upCount = computed(() => peerList.value.filter((s) => s.pct > 0).length)
const downCount = computed(() => peerList.value.filter((s) => s.pct < 0).length)
const peerPct = computed(() => {
  const l = peerList.value
  return l.length ? l.reduce((s, x) => s + (x.pct || 0), 0) / l.length : 0
})
const tabs = [
  { k: 'pct', label: '涨幅' },
  { k: 'down', label: '跌幅' },
  { k: 'amount', label: '成交额' },
  { k: 'name', label: '名称' },
]
const sortKey = ref('pct')
const sortedPeers = computed(() => {
  const l = [...peerList.value]
  if (sortKey.value === 'pct') l.sort((a, b) => b.pct - a.pct)
  else if (sortKey.value === 'down') l.sort((a, b) => a.pct - b.pct)
  else if (sortKey.value === 'amount') l.sort((a, b) => (b.amount || 0) - (a.amount || 0))
  else l.sort((a, b) => String(a.cname || a.name).localeCompare(String(b.cname || b.name), 'zh'))
  return l.slice(0, 60)
})

/* ---------- 日K（东财 push2his JSONP，带内存缓存） ---------- */
const kEl = ref<HTMLElement | null>(null)
const klineMsg = ref('')
const klineDays = ref(0)
const maTxt = reactive({ ma5: '--', ma10: '--' })
const sparkPts = ref('')
let kChart: any = null
const kCache = new Map<string, any>()

function jsonp(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const cb = '__ts_k_' + Math.random().toString(36).slice(2)
    const s = document.createElement('script')
    const cleanup = () => { delete (window as any)[cb]; s.remove() }
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')) }, 8000)
    ;(window as any)[cb] = (res: any) => { clearTimeout(timer); cleanup(); resolve(res) }
    s.src = url + '&cb=' + cb
    s.onerror = () => { clearTimeout(timer); cleanup(); reject(new Error('network')) }
    document.head.appendChild(s)
  })
}

async function fetchKline(secid: string) {
  if (kCache.has(secid)) return kCache.get(secid)
  const u =
    `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}` +
    `&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1,f2,f3,f4,f5,f6` +
    `&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&fqt=1&end=20500101&lmt=140`
  const res = await jsonp(u)
  const rows: any[] = res?.data?.klines || []
  if (!rows.length) throw new Error('empty')
  const parsed = rows.map((r) => {
    const p = String(r).split(',')
    return { d: p[0], o: +p[1], c: +p[2], h: +p[3], l: +p[4], v: +p[5] }
  })
  kCache.set(secid, parsed)
  return parsed
}

function ma(arr: number[], n: number, i: number) {
  if (i + 1 < n) return null
  let s = 0
  for (let k = i - n + 1; k <= i; k++) s += arr[k]
  return +(s / n).toFixed(2)
}

async function loadKline(stock: Stock) {
  const secid = secidOf(stock)
  klineMsg.value = ''
  if (!secid) { klineMsg.value = '该市场日K暂不支持（仅 A股 / 港股）'; return }
  try {
    const rows = await fetchKline(secid)
    klineDays.value = rows.length
    const closes = rows.map((r) => r.c)
    const last = rows.length - 1
    const m5 = ma(closes, 5, last), m10 = ma(closes, 10, last)
    maTxt.ma5 = m5 ?? '--'
    maTxt.ma10 = m10 ?? '--'
    // 头部迷你走势（收盘价折线 → 100×26 视窗）
    const mn = Math.min(...closes), mx = Math.max(...closes), span = mx - mn || 1
    sparkPts.value = closes.map((c, i) => `${(i / (closes.length - 1)) * 100},${26 - ((c - mn) / span) * 24 - 1}`).join(' ')

    const [{ init, use }, charts, comps] = await Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
    ])
    use([charts.CandlestickChart, charts.LineChart, charts.BarChart, comps.GridComponent, comps.TooltipComponent, comps.AxisPointerComponent, comps.LegendComponent])
    await nextTick()
    if (!kEl.value) return
    if (!kChart) kChart = init(kEl.value)
    const up = upC.value, dn = dnC.value
    kChart.setOption({
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#1f2836' } },
        backgroundColor: 'rgba(16,21,29,.95)', borderColor: '#1f2836', textStyle: { color: '#e8eef6', fontSize: 11 },
        formatter: (ps: any[]) => {
          if (!ps.length) return ''
          const i = ps[0].dataIndex, r = rows[i]
          const cl = r.c >= r.o ? up : dn
          return `${r.d}<br/>开 ${r.o} 收 <b style="color:${cl}">${r.c}</b><br/>高 ${r.h} 低 ${r.l}<br/>量 ${(r.v / 1e4).toFixed(0)}万`
        },
      },
      grid: [
        { left: 46, right: 10, top: 6, height: 148 },
        { left: 46, right: 10, top: 168, height: 42 },
      ],
      xAxis: [
        { type: 'category', gridIndex: 0, data: rows.map((r) => r.d), axisLabel: { show: false }, axisTick: { show: false }, axisLine: { lineStyle: { color: '#1f2836' } } },
        { type: 'category', gridIndex: 1, data: rows.map((r) => r.d), axisLabel: { color: '#66717f', fontSize: 9 }, axisTick: { show: false }, axisLine: { lineStyle: { color: '#1f2836' } } },
      ],
      yAxis: [
        { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: '#161e2b' } }, axisLabel: { color: '#66717f', fontSize: 9 } },
        { gridIndex: 1, scale: true, splitNumber: 2, splitLine: { show: false }, axisLabel: { color: '#66717f', fontSize: 9, formatter: (v: number) => (v >= 1e8 ? (v / 1e8).toFixed(0) + '亿' : (v / 1e4).toFixed(0) + '万') } },
      ],
      series: [
        {
          type: 'candlestick', xAxisIndex: 0, yAxisIndex: 0,
          data: rows.map((r) => [r.o, r.c, r.l, r.h]),
          itemStyle: { color: up, color0: dn, borderColor: up, borderColor0: dn },
        },
        { type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: closes.map((_, i) => ma(closes, 5, i)), showSymbol: false, lineStyle: { width: 1, color: '#f0b64a' }, itemStyle: { color: '#f0b64a' } },
        { type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: closes.map((_, i) => ma(closes, 10, i)), showSymbol: false, lineStyle: { width: 1, color: '#2e7ce0' }, itemStyle: { color: '#2e7ce0' } },
        {
          type: 'bar', xAxisIndex: 1, yAxisIndex: 1,
          data: rows.map((r) => ({ value: r.v, itemStyle: { color: r.c >= r.o ? up : dn } })),
          barWidth: '60%',
        },
      ],
    })
  } catch {
    klineMsg.value = '日K 加载失败（接口无返回），稍后再试'
  }
}

watch(() => props.stock, (s) => { if (s) loadKline(s) }, { immediate: true })

/* ESC 关闭 */
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close') }
onMounted(() => {
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); kChart?.dispose() })
})
</script>
