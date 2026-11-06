<template>
  <MarketPage :m="m" :review="review" />
</template>

<script setup lang="ts">
import { snap, marketGroups, marketReview, fmtCap } from '~/utils/data'

const review = marketReview('us')
const m = {
  key: 'us',
  title: '美股大盘云图',
  h1: '美股大盘云图 · 标普500 / 纳斯达克 实时热力图',
  sub: '按市值排布的美股热力图（中文版），面积越大权重越高，颜色代表当日涨跌幅——绿涨红跌（国际配色），与 A 股页自动区分。',
  closeSuffix: ' 美东收盘',
  refreshLabel: '盘中每 15 秒自动刷新',
  subs: ['标普500 权重榜', '纳斯达克100', '道琼斯', '全市场'],
  palette: 'intl' as const,
  live: true,
  liveFs: 'm:105,m:106,m:107',
  groups: () => marketGroups('us'),
  countLabel: `美股 · 市值前 ${snap.us?.length || 80} 大公司`,
  sizeLabel: '面积 = 公司市值（美元）',
  ccy: 'usd' as const,
  capCol: '市值',
  tableTitle: '美股市值权重前 20 公司',
  tableRows: (snap.us || []).slice(0, 20),
  capNote: '市值单位美元',
  idxTitle: '美股核心指标',
  idxCards: (snap.indices || []).filter((i: any) => ['NDX', 'SPX', 'DJIA'].includes(i.code)),
  faqTitle: '美股热力图常见问题',
  faqs: [
    { q: '美股热力图为什么绿色代表上涨？', a: '国际市场惯例为绿涨红跌，与A股的红涨绿跌相反。本站美股、港股、Crypto页面自动切换为国际配色，并在图例中标注，避免误读。' },
    { q: '美股大盘云图的数据是实时的吗？', a: '盘中通过行情接口自动刷新（约15秒级快照），收盘后当日云图自动固化到归档页，可随时回看任意交易日的历史热力图。' },
    { q: '支持哪些美股指数视图？', a: '当前展示按市值排名的美股大公司全景，标普500、纳斯达克100、道琼斯分指数视图即将上线，按市值排布，颜色代表当日涨跌幅。' },
    { q: '与 Finviz 等英文热力图有什么区别？', a: '中文界面与中文公司译名，附带每个交易日的中文复盘归档与板块资金解读，免费使用无需注册。' },
  ],
  canonical: 'https://tradershelf.com/us',
  seo: {
    title: '美股大盘云图_标普500纳斯达克实时热力图 - Trader Shelf',
    description: '美股大盘云图中文版：标普500、纳斯达克实时热力图，按市值排布、绿涨红跌国际配色，附当日权重股涨跌榜与每日中文复盘归档，免费无需注册。',
    ogTitle: '美股大盘云图_标普500纳斯达克实时热力图 - Trader Shelf',
    ogDescription: '美股热力图中文版，按市值排布、绿涨红跌，附权重股榜与每日复盘归档。',
    ogType: 'website',
    ogSiteName: 'Trader Shelf',
    ogUrl: 'https://tradershelf.com/us',
  },
  ld: {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trader Shelf', item: 'https://tradershelf.com/' },
      { '@type': 'ListItem', position: 2, name: '美股大盘云图', item: 'https://tradershelf.com/us' },
    ],
  },
}
</script>
