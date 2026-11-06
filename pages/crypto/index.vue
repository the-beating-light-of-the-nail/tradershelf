<template>
  <MarketPage :m="m" :review="review" />
</template>

<script setup lang="ts">
import { snap, marketGroups, marketReview } from '~/utils/data'

const review = marketReview('crypto')
const m = {
  key: 'crypto',
  title: '加密货币热力图',
  h1: '加密货币热力图 · BTC / 以太坊全网市值云图（24h）',
  sub: '按市值排布的主流币热力图，颜色代表 24 小时涨跌幅——绿涨红跌（国际配色）。加密货币 7×24 全天候交易，无收盘概念。',
  closeSuffix: ' 快照',
  refreshLabel: '快照模式（实时行情接入中）',
  subs: ['市值前 30', 'DeFi', 'Meme', 'Layer2'],
  palette: 'intl-wide' as const,
  live: false,
  liveFs: null,
  groups: () => marketGroups('crypto'),
  countLabel: 'Crypto · 市值前 30 币种',
  sizeLabel: '面积 = 流通市值（美元）',
  ccy: 'usd' as const,
  capCol: '市值',
  tableTitle: '加密货币市值前 20 币种（24h）',
  tableRows: ((snap.crypto?.coins || []) as any[]).slice(0, 20).map((c) => ({ code: c.code, name: c.code, cname: c.cname, pct: c.pct, price: c.price, mcap: c.mcap })),
  capNote: '市值为站内快照估值',
  idxTitle: '跨市场参照',
  idxCards: (snap.indices || []).filter((i: any) => ['NDX', 'HSI'].includes(i.code)),
  faqTitle: '加密货币热力图常见问题',
  faqs: [
    { q: 'Crypto 热力图的数据是实时的吗？', a: '当前为站内快照模式（约每个交易日更新），币价实时行情通道正在接入，届时页面将像 A 股页一样自动刷新。' },
    { q: '热力图包含哪些币种？', a: '按流通市值排名的前 30 主流币种，覆盖 BTC、ETH、SOL 等公链与主流 DeFi、Meme 币，颜色代表 24 小时涨跌幅。' },
    { q: '为什么 Crypto 用绿涨红跌？', a: '加密货币为全球市场，沿用国际配色惯例（绿涨红跌），与 A 股页面的红涨绿跌相反，图例已标注。' },
    { q: '本页内容构成投资建议吗？', a: '不构成。所有数据仅供参考，加密货币价格波动剧烈，交易前请自行研究并评估风险，本站不面向美国及受限地区居民。' },
  ],
  canonical: 'https://tradershelf.com/crypto',
  seo: {
    title: '加密货币热力图_BTC以太坊全网市值云图(24h) - Trader Shelf',
    description: 'Crypto 热力图：比特币、以太坊等市值前 30 币种 24 小时涨跌云图，按市值排布、绿涨红跌，7×24 全天候看盘，免费在线。',
    ogTitle: '加密货币热力图_BTC以太坊全网市值云图 - Trader Shelf',
    ogDescription: '市值前 30 币种 24h 涨跌热力图。',
    ogType: 'website',
    ogSiteName: 'Trader Shelf',
    ogUrl: 'https://tradershelf.com/crypto',
  },
  ld: {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trader Shelf', item: 'https://tradershelf.com/' },
      { '@type': 'ListItem', position: 2, name: '加密货币热力图', item: 'https://tradershelf.com/crypto' },
    ],
  },
}
</script>
