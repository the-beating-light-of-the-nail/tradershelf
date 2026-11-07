#!/usr/bin/env node
/**
 * Trader Shelf · 合并工具层 SPA 进 Nuxt SSG 产物
 * app/dist（vite base=/app 构建）→ .output/public/app/，随 wrangler assets 一并部署。
 * 幂等：目标目录已存在则先清空再拷贝。
 */
import { cpSync, rmSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, 'app', 'dist')
const dst = join(root, '.output', 'public', 'app')

if (!existsSync(src) || !readdirSync(src).length) {
  console.error('[merge-app] app/dist 不存在或为空——先跑 `npm run build:app`')
  process.exit(1)
}
mkdirSync(join(root, '.output', 'public'), { recursive: true })
rmSync(dst, { recursive: true, force: true })
cpSync(src, dst, { recursive: true })
console.log('[merge-app] app/dist → .output/public/app ✓  ', readdirSync(dst).join(' '))
