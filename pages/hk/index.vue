<template>
  <MarketPage :m="m" :review="review" />
</template>

<script setup lang="ts">
import { snap, marketGroups, marketReview } from '~/utils/data'

const review = marketReview('hk')
const m = {
  key: 'hk',
  title: '港股大盘云图',
  h1: '港股大盘云图 · 恒生指数成分实时热力图',
  sub: '按市值排布的港股热力图（中文版），面积越大权重越高。港股沿用红涨绿跌的中文市场习惯配色，已剔除人民币柜台。',
  closeSuffix: ' 港股收盘',
  refreshLabel: '盘中每 15 秒自动刷新',
  subs: ['恒生综指大市值', '恒生科技', '国企指数', '全市场'],
  palette: 'cn' as const,
  live: true,
  liveFs: 'm:116',
  groups: () => marketGroups('hk'),
  countLabel: `港股 · 市值前 ${snap.hk?.length || 60} 大公司（剔除人民币柜台）`,
  sizeLabel: '面积 = 公司市值（港元）',
  ccy: 'hkd' as const,
  capCol: '市值',
  tableTitle: '港股市值前 20 公司',
  tableRows: (snap.hk || []).slice(0, 20),
  capNote: '市值单位港元',
  idxTitle: '港股核心指标',
  idxCards: (snap.indices || []).filter((i: any) => ['HSI', 'NDX'].includes(i.code)),
  faqTitle: '港股热力图常见问题',
  faqs: [
    { q: '港股热力图用什么配色？', a: '港股沿用中文市场习惯的红涨绿跌配色，与 A 股一致；美股与 Crypto 页面才使用国际配色（绿涨红跌），图例均有标注。' },
    { q: '为什么看不到腾讯控股-R 等人民币柜台股票？', a: '本页已剔除人民币柜台（-R 后缀及 8/9 开头代码），避免同一公司重复占位，只保留港币柜台主线股票。' },
    { q: '港股大盘云图多久更新一次？', a: '盘中约 15 秒自动刷新；收盘后当日云图自动固化到归档页，可回看任意历史交易日。' },
    { q: '数据来源与准确性如何？', a: '数据来自公开行情接口整理，可能存在延迟或误差，仅供参考，不构成投资建议。' },
  ],
  canonical: 'https://tradershelf.com/hk',
  seo: {
    title: '港股大盘云图_恒生指数科技股实时热力图 - Trader Shelf',
    description: '港股大盘云图：恒生指数与大市值港股实时热力图，按市值排布、红涨绿跌，附当日权重股涨跌榜与每日复盘归档，腾讯、阿里、美团一图看全。',
    ogTitle: '港股大盘云图_恒生指数科技股实时热力图 - Trader Shelf',
    ogDescription: '港股实时热力图 + 权重股榜 + 每日复盘归档。',
    ogType: 'website',
    ogSiteName: 'Trader Shelf',
    ogUrl: 'https://tradershelf.com/hk',
  },
  ld: {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trader Shelf', item: 'https://tradershelf.com/' },
      { '@type': 'ListItem', position: 2, name: '港股大盘云图', item: 'https://tradershelf.com/hk' },
    ],
  },
}
</script>
