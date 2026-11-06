// Trader Shelf · Nuxt 3 SSG 配置
// 构建：node scripts/fetch-data.mjs（先抓真数据）→ nuxt generate → wrangler deploy
import { readdirSync, existsSync } from 'node:fs'
import sectors from './data/sectors.config'

// 归档页路由：扫描 data/archive/*.json 动态生成（每日收盘管线累积）
const archiveRoutes: string[] = []
try {
  const dir = './data/archive'
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (/^\d{4}-\d{2}-\d{2}\.json$/.test(f)) archiveRoutes.push('/archive/' + f.replace('.json', ''))
    }
  }
} catch { /* 无归档时跳过 */ }

export default defineNuxtConfig({
  ssr: true,
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2026-10-01',
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'theme-color', content: '#0c1017' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        {
          rel: 'icon',
          href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230c1017'/%3E%3Crect x='6' y='8' width='20' height='4' rx='1.5' fill='%23f0b64a'/%3E%3Crect x='6' y='14' width='12' height='4' rx='1.5' fill='%23d9303e'/%3E%3Crect x='6' y='20' width='20' height='4' rx='1.5' fill='%230e9f77'/%3E%3C/svg%3E",
        },
      ],
    },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: [
        '/',
        '/us', '/hk', '/crypto',
        '/xingtu',
        '/about', '/privacy', '/disclaimer', '/contact',
        '/archive',
        '/sitemap.xml',
        ...sectors.filter((s: any) => !s.disabled).map((s: any) => '/sector/' + s.slug),
        ...archiveRoutes,
      ],
    },
  },
})
