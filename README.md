# TraderShelf

tradershelf.com — 主域品牌站：交易者小工具架。内置两个纯前端计算器（仓位 / 风报比）+ 收编子站 calm.tradershelf.com（停一刻）。英文站，纯静态零构建。

## 结构

```
public/                 # 全部静态资产（零构建，直接部署）
├── index.html          # 主页：hero + 工具卡 + about
├── tools/
│   ├── position-size/  # 仓位计算器（纯前端 JS）
│   └── risk-reward/    # 风报比计算器（纯前端 JS）
├── assets/style.css    # 全站共享样式（深色终端风）
├── 404.html / robots.txt / sitemap.xml / favicon.svg / og.png
scripts/gen-og.mjs      # og.png 生成器（node:zlib 手写 PNG，零依赖）
wrangler.toml           # Cloudflare Workers assets 直传 + 自定义域 tradershelf.com
```

## 命令

```bash
node scripts/gen-og.mjs    # 重新生成 og.png（改了构图才需要）
npx wrangler dev           # 本地预览
npx wrangler deploy        # 部署（注意：本机需 Node 22 跑 wrangler，见工作区 memory）
```

## 约定

- 无后端、无追踪、无账户——所有计算在浏览器本地完成（对外文案明确承诺，勿加任何上报）。
- 新工具：`public/tools/<slug>/index.html` + sitemap 加一条 + 主页加卡。
- 工具页 JS 内联自包含，无外部依赖。
- SEO 基建每页必备：canonical / OG / Twitter / JSON-LD（WebApplication + FAQPage）。
- 免责声明页脚常驻：非投资建议。
