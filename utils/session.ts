/**
 * 交易时段判定（纯函数，客户端用）
 * 关键点：按**市场所在时区**取当地时钟，美股夏令时/冬令时交给 Intl 处理，
 * 不再手写「21:30 开盘」这类硬编码（冬令时差一小时）。
 * 注意：这里只按日历与时钟判断，不含节假日表——A股/港股法定假日会误判为「交易中」，
 * 但此时上游接口返回的是上一交易日数据，页面上的「实时」时间戳不会推进，可自行识别。
 */
export type MarketKey = 'a' | 'hk' | 'us' | 'crypto'
export type SessionPhase = 'open' | 'lunch' | 'pre' | 'closed' | 'weekend'

export interface MarketStatus {
  open: boolean
  phase: SessionPhase
  label: string   // 徽章文案：交易中 / 午间休市 / 未开盘 / 已收盘 / 周末休市
  hint: string    // title 提示：下一个节点
  clock: string   // 该市场当地 HH:MM
  tzName: string
}

type Session = [number, number] // [开始分钟, 结束分钟]

const CFG: Record<Exclude<MarketKey, 'crypto'>, { tz: string; tzName: string; sessions: Session[]; preLabel: string }> = {
  // A股：9:15 集合竞价开始，11:30–13:00 午休，15:00 收盘（留 5 分钟给尾盘数据落库）
  a: { tz: 'Asia/Shanghai', tzName: '北京', sessions: [[9 * 60 + 15, 11 * 60 + 30], [13 * 60, 15 * 60 + 5]], preLabel: '未开盘' },
  // 港股：9:15 开市前时段，12:00–13:00 午休，16:00 收市竞价至 16:10
  hk: { tz: 'Asia/Shanghai', tzName: '香港', sessions: [[9 * 60 + 15, 12 * 60], [13 * 60, 16 * 60 + 10]], preLabel: '未开盘' },
  // 美股：9:30–16:00 美东时间（夏令时 EDT / 冬令时 EST 由 Intl 自动换算）
  us: { tz: 'America/New_York', tzName: '美东', sessions: [[9 * 60 + 30, 16 * 60]], preLabel: '盘前' },
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** 取指定时区的当地星期与分钟数（不依赖系统时区） */
export function localParts(tz: string, at: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const day = WEEKDAY.indexOf(get('weekday'))
  const hour = Number(get('hour')) % 24 // en-US hour12:false 会把午夜给成 24
  const minute = Number(get('minute'))
  const minutes = hour * 60 + minute
  return { day, minutes, clock: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }
}

const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export function marketStatus(key: MarketKey, at: Date = new Date()): MarketStatus {
  if (key === 'crypto') {
    // 币市 7×24，不存在收盘；时钟按北京时间给用户看
    const { clock } = localParts('Asia/Shanghai', at)
    return { open: true, phase: 'open', label: '7×24 交易中', hint: '加密货币全天候交易，无开盘收盘', clock, tzName: '北京' }
  }

  const cfg = CFG[key]
  const { day, minutes, clock } = localParts(cfg.tz, at)
  const base = { tzName: cfg.tzName, clock }

  if (day < 0 || day === 0 || day === 6) {
    return { ...base, open: false, phase: 'weekend', label: '周末休市', hint: `下个交易日 ${hm(cfg.sessions[0][0])}（${cfg.tzName}）开盘` }
  }
  for (const [s, e] of cfg.sessions) {
    if (minutes >= s && minutes <= e) {
      return { ...base, open: true, phase: 'open', label: '交易中', hint: `${hm(e)}（${cfg.tzName}）收盘` }
    }
  }
  if (cfg.sessions.length > 1 && minutes > cfg.sessions[0][1] && minutes < cfg.sessions[1][0]) {
    return { ...base, open: false, phase: 'lunch', label: '午间休市', hint: `${hm(cfg.sessions[1][0])}（${cfg.tzName}）恢复交易` }
  }
  if (minutes < cfg.sessions[0][0]) {
    return { ...base, open: false, phase: 'pre', label: cfg.preLabel, hint: `${hm(cfg.sessions[0][0])}（${cfg.tzName}）开盘` }
  }
  return { ...base, open: false, phase: 'closed', label: '已收盘', hint: `下个交易日 ${hm(cfg.sessions[0][0])}（${cfg.tzName}）开盘` }
}

/** 徽章文案：开盘中带当地时钟，收盘只给状态 */
export function statusBadge(st: MarketStatus): string {
  if (st.phase === 'open') return st.clock === '' ? st.label : `${st.label} ${st.clock}`
  return st.label
}
