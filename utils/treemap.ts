/**
 * Squarified treemap 布局引擎（自研实现，无依赖）
 * 参考 Bruls / Huizing / van Wijk《Squarified Treemaps》，MIT
 */

export interface TMInput {
  v: number
  d: any
}
export interface TMRect {
  x: number
  y: number
  w: number
  h: number
  d: any
}

/** 单层 squarify：items 按值铺满 (x,y,w,h) */
export function squarify(items: TMInput[], x: number, y: number, w: number, h: number, out: TMRect[] = []): TMRect[] {
  const list = items
    .filter((i) => i.v > 0 && isFinite(i.v))
    .map((i) => ({ v: i.v, d: i.d }))
    .sort((a, b) => b.v - a.v)
  if (!list.length || w <= 0 || h <= 0) return out

  const total = list.reduce((s, i) => s + i.v, 0)
  const scale = (w * h) / total
  for (const it of list) it.v *= scale

  const worst = (row: { v: number }[], side: number) => {
    const s = row.reduce((a, i) => a + i.v, 0)
    const len = s / side
    let max = 0
    for (const it of row) max = Math.max(max, (len * len) / it.v, it.v / (len * len))
    return max
  }

  let cx = x, cy = y, cw = w, ch = h
  const pool = [...list]
  while (pool.length) {
    const alongWidth = cw >= ch // 宽边较长 → 沿高方向排一行
    const side = alongWidth ? ch : cw
    const row = [pool.shift()!]
    while (pool.length && worst([...row, pool[0]], side) <= worst(row, side)) row.push(pool.shift()!)
    const sum = row.reduce((s, i) => s + i.v, 0)
    if (alongWidth) {
      const rw = sum / ch
      let ry = cy
      for (const it of row) {
        const rh = it.v / rw
        out.push({ x: cx, y: ry, w: rw, h: rh, d: it.d })
        ry += rh
      }
      cx += rw
      cw -= rw
    } else {
      const rh = sum / cw
      let rx = cx
      for (const it of row) {
        const rw2 = it.v / rh
        out.push({ x: rx, y: cy, w: rw2, h: rh, d: it.d })
        rx += rw2
      }
      cy += rh
      ch -= rh
    }
  }
  return out
}

/* ---------- 涨跌配色 ---------- */
const CN = ['#a01010', '#b31b1b', '#cf3d33', '#d06055', '#c04a42', '#96504a', '#36445f', '#3d6f5d', '#2e8a5f', '#1f9c63', '#128a52', '#0f7a46']
const INTL = ['#067a45', '#0f8a52', '#159a5c', '#23945f', '#4a8a66', '#41604f', '#36445f', '#8f4a42', '#c04a42', '#d63a33', '#e52d2d', '#a01010']
const BASE_TH = [7, 5, 3, 2, 1, 0.3, -0.3, -1, -2, -3, -5]

export type PaletteMode = 'cn' | 'intl' | 'intl-wide'

export function heatColor(pct: number, mode: PaletteMode = 'cn'): string {
  const th = mode === 'intl-wide' ? BASE_TH.map((v) => v * 2) : BASE_TH
  const pal = mode === 'cn' ? CN : INTL
  if (typeof pct !== 'number' || isNaN(pct)) return pal[6]
  for (let i = 0; i < th.length; i++) if (pct >= th[i]) return pal[i]
  return pal[11]
}

export const fmtPct = (p: number) => (typeof p === 'number' && isFinite(p) ? (p > 0 ? '+' : '') + p.toFixed(2) + '%' : '--')
