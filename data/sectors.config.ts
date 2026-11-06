// TS shim：单一数据源在 sectors.config.json（scripts/fetch-data.mjs 与本文件共用）
import cfg from './sectors.config.json'

export interface SectorConfig {
  slug: string
  name: string // 东财板块名（精确匹配解析 BK 码）
  display: string
  kw: string
  related: string[]
}

export default cfg as SectorConfig[]
