# Trader Shelf · tradershelf.com — 项目规划

> **2026-11-06 立项并当日完成 Phase 1 上线（生产站已带真数据运行）。**
> 定位：**股票 / 证券 / Crypto 工具门户**——以「大盘云图」为引流爆款，长尾静态页矩阵吃搜索流量，广告 + affiliate 变现。
> 初期目标：月 $20（中文财经 AdSense RPM 约 $1.5–4，需月 5,000–13,000 PV ≈ 日均 170–450 PV）。
> 线上：**https://tradershelf.com**（Nuxt 3 SSG，47 路由，东财真数据）· 演示母版 https://demo.tradershelf.com
> 日常更新：`npm run deploy`（抓数据 → generate → wrangler 部署，一条命令）。

---

## 1. 三个前置问题的直接结论

### ① 开源项目能否在 GitHub 上部署？

**能跑，但只配当预览，不配当生产。**

- `FisherWenray/stock-market-cloud`：React 18 + Vite 纯前端，本地 `npm run dev` 就能看；GitHub Pages 也能跑（纯静态）。
- `wenyuanw/a-share-heatmap`：Next.js 项目，需构建后部署，支持 Vercel 一键部署（作者自己就部署在 **dapan.app**）。
- 但生产站不走 GitHub / Vercel，理由：
  1. **github.io 大陆访问基本不可用**，核心用户是中文股民；
  2. GitHub Pages 对挂广告的商业化有限制，AdSense 认真做必须在自己域名上；
  3. 工作区标准链路（本地 build + `wrangler deploy` 直传 Cloudflare，与 git 解耦）已跑顺 15+ 个站，tradershelf.com 沿用即可。
- GitHub 的正确角色：**存代码的仓库**（public，README 带站点链接，顺手当一条外链资产）。

### ② 示例 HTML 怎么结合？——拆三层拿，不要整页搬

| 层 | 从开源项目拿什么 | 说明 |
|---|---|---|
| **数据层**（最有价值） | 行情接口 URL、参数、字段映射、降级逻辑 | a-share-heatmap 用东财全市场快照 + 腾讯批量行情兜底；stock-market-cloud 用腾讯接口 + 本地缓存。参数都是踩过坑的，照抄省最多时间 |
| **布局/渲染层** | treemap 排布算法 + 配色映射 + 悬浮交互 | stock-market-cloud 用 d3-hierarchy squarify，模块可直接抽出来用；或 ECharts treemap 薄封装。两者都省掉了"从零写 treemap" |
| **页面外壳层** | ❌ 全部扔掉 | 它们的 Title/Meta/DOM 一个字不进生产页——这是判重重灾区，也是我们要做信息增量的地方 |

⚠️ 竞争认知：两个开源项目作者自己的线上站（dapan.app、stock.wenyaoyefei.com）就是"开源默认态"的上限样本——工具功能别跟他们拼，**我们拼的是他们没有的：SSG 文本增量 + 长尾页矩阵 + 每日归档**。

### ③ 热力图需要重复开发吗？

**渲染不用重写，数据和壳才是开发量。**

- 两个项目都是 **MIT license（2026-11-06 已核实）**，可以合法直接搬代码模块，只需在 `THIRD_PARTY_NOTICES.md` 保留版权声明。
- 热力图本质 = treemap（面积=市值）+ 红绿配色（颜色=涨跌幅）+ 标签/悬浮，stock-market-cloud 已支持 A股/港股/美股三市场切换、10 秒刷新、中英双语，**美股港股不需要"重复开发"，调它就行**。
- 真正要自己开发的：① 数据管线（接口、缓存、降级、收盘静态化）；② 市场适配（美股/港股/Crypto 页**颜色翻转：绿涨红跌**，见 `demo/us.html`；交易时段状态；数字格式）；③ SEO 外壳（自动文案、表格、长尾页矩阵）——这是护城河，也是工作量所在。

---

## 2. 域名与现有资产

- tradershelf.com 已在 Cloudflare；子域 `calm.tradershelf.com` 已跑着「停一刻」。主站挂根域，互不干扰；做起来后导航互链，品牌统一为「交易者的工具架（Trader Shelf）」。
- 部署：SSG 产物 → `wrangler deploy`（Workers 静态直传 + 自定义域；workers.dev 大陆被墙，一律自定义域）。
- 搜索引擎：主攻 **Bing + Google**（无备案不指望百度）。**IndexNow 是归档页秒收录的主杠杆**，每次部署后推送新增 URL。

## 3. 技术架构（Nuxt 3 SSG）

选型理由：与工作区 9+ 个站同栈，维护心智成本最低；nitro 产出纯静态；后续 i18n、工具页扩展顺手。（Astro 备选：仅当页面量 >5k、构建速度成瓶颈时再考虑。）

```
tradershelf/
  data/                 # 收盘管线产出的行情快照 JSON
  scripts/
    fetch-quotes.mjs    # 拉行情 → data/*.json（东财主源，新浪/腾讯降级）
    gen-pages.mjs       # 快照 → 长尾页数据（复盘文案、表格行、涨跌家数）
  pages/                # 门户 / 市场 / 板块 / 归档 / 工具 模板
  components/           # HeatmapCanvas(treemap 封装) / QuoteTable / AdSlot / FaqBlock
  worker/               # /api/quote 盘中代理（东财/CoinGecko，KV 缓存 30–60s）
  public/               # sitemap 分片 / og 图（脚本生成 1200×630）/ robots
```

**数据双通道：**

- 盘中：页面 JS → 自家 Worker `/api/quote`（边缘 KV 缓存 30–60s；隐藏上游接口细节 + 解决 CoinGecko 大陆可达性）→ 东财 / CoinGecko。
- 收盘后：GitHub Actions cron（每交易日 16:10 北京时间）→ fetch 当日全量 → 生成复盘文案 + 归档页 + 板块页数据 → 构建 → `wrangler deploy`（凭据走 secret）→ IndexNow 推送新 URL。**归档页生成后永不重建，纯累积。**

| 市场 | 主源 | 降级 |
|---|---|---|
| A股 | 东方财富 clist（a-share-heatmap 已验证的参数） | 新浪 hq、腾讯 qt.gtimg |
| 美股/港股 | 东财国际接口（stock-market-cloud 三市场方案） | Yahoo quote |
| Crypto | CoinGecko free（经 Worker 代理） | 币安公开 ticker |

## 4. 页面矩阵（SEO 核心，首批 ~35 页）

| URL | Title（示例） | 模板 | 优先级 | 目标词群（Bing 数据） |
|---|---|---|---|---|
| `/` | 大盘云图_股票热力图_美股港股Crypto行情云图 - Trader Shelf | 门户 | P0 | 大盘云图 41k / stock heat map |
| `/a/` | A股大盘云图_沪深两市实时热力图 | 市场 | P0 | a股热力图 / 板块图 |
| `/us/` | 美股大盘云图_标普500纳斯达克100实时热力图 | 市场（配色翻转） | P0 | 美股大盘云图 216+99 |
| `/hk/` | 港股大盘云图_恒生指数科技股实时热力图 | 市场 | P0 | 港股大盘云图 |
| `/crypto/` | 加密货币热力图_BTC/以太坊全网市值云图(24h) | 市场 | P0 | crypto heatmap（高 RPM） |
| `/xingtu/` | 大盘星图在线看_大盘星图网页版（对比评测） | 截流专题 | P0 | 大盘星图 6,027 / 东方财富大盘星图 886 |
| `/index/hs300` `/zz500` `/sse50` `/cyb` `/kcb` | 沪深300大盘云图_权重股实时热力图 等 | 指数 ×5 | P1 | 上证指数大盘星图 208 等 |
| `/index/sp500` `/nasdaq100` `/hstech` | 标普500云图(中文) 等 | 指数 ×3 | P1 | 英文词中文化长尾 |
| `/sector/semiconductor` | 半导体板块热力图_A股芯片股实时涨跌云图 | 板块 | P1 | 半导体 板块图 |
| `/sector/ai` `/cpo` `/baijiu` `/quanshang` `/bank` `/guangfu` `/junggong` `/yiyao` `/fangdichan` `/meitan` `/hongli` | （同模板：板块名+热力图/云图） | 板块 ×11 | P1 | 各板块长尾（板块图 336 等） |
| `/archive/YYYY-MM-DD` | M月D日大盘云图复盘_今日板块涨跌全景 | 归档 | P2 每日自动 | 日期长尾，纯累积（IndexNow 主战场） |
| `/tools/fear-greed` `/grid` `/compound` | 恐慌贪婪指数 / 网格计算器 / 复利计算器 | 工具 ×3 | P2 | crypto fear & greed 等高 RPM 词 |
| `/about` `/privacy` `/disclaimer` `/contact` | 关于 / 隐私政策 / 免责声明 / 联系 | 站点 ×4 | P1 | AdSense 审核硬要求 |
| `/en/` | Crypto & Stock Heatmap - Real-time Market Map | 英文版 | P2 | 英文高 RPM（stock heat map 3.4k） |

**内链规则**（防孤儿页 + 权重流动）：每页 ≥8 条内链 = 面包屑 + 市场Tab + 相关板块 3–5 + 当日归档 + 上级入口 + 页脚矩阵。板块页互链相关板块（半导体↔算力↔CPO），归档页链「今日 / 前一天 / 后一天」。

## 5. 单页 SEO 模板规范（demo 已可视化）

- Title 关键词前置 ≤32 字；description 100–120 字，带「实时 / 免费 / 收盘复盘」功能词。
- H1 唯一且含主词；H2 = 数据区块标题（关键词变体）。
- **首屏下 300 字自动文案**（模板填空，收盘管线生成）：
  > `{日期}{市场}大盘云图复盘：全市场上涨{X}家、下跌{Y}家，成交{额}。领涨板块为{Top1}（+{pct}%），领跌为{Bottom1}。主力资金净流入前三个股……云图按流通市值排布，颜色代表当日涨跌幅。`
- 结构化数据：门户 = WebSite；市场/板块/归档页 = BreadcrumbList + FAQPage；工具页后期 + SoftwareApplication。
- 技术件：sitemap 分片（≤5k URL/片）、robots、canonical 全站自指、OG/Twitter 卡、每模板 1 张 1200×630 OG 图（脚本生成）。

## 6. 广告与变现

**AdSense 过审 checklist（金融类从严）：**

1. 先攒 ≥30 个有真实文字的页面（归档+板块天然达标）再申请；
2. `/privacy`（含 Cookie/广告个性化说明）、`/about`、`/disclaimer`（"数据仅供参考、可能延迟、不构成投资建议"）必须上线；
3. 首月每页 ≤2 个广告位，先放内容页，工具页首版不放（防"内容单薄"拒审）；
4. **防误点**：广告位与「全屏 / 切换 Tab」等交互控件保持 ≥60px 距离，不用箭头/假按钮诱导。

广告位规划（demo 可视化）：A 首屏下响应式横幅 / B 信息流原生（卡片间，中长期收入主力）/ C 长尾页文中 / D 侧栏矩形 / E 底部。

拒审 fallback：Adsterra（工作区已有接入经验）。进阶（Phase 3+）：Crypto 页挂合规交易所/券商 affiliate，单个有效开户佣金常 >$20。

## 7. 路线图

| 阶段 | 内容 | 验收标准 |
|---|---|---|
| **Phase 0 ✅** | 本规划 + `demo/` 三页设计演示；在演示上确认/修改方向、加内容 | 方向拍板 |
| **Phase 1 ✅** | Nuxt 骨架 + A股热力图真数据（盘中 Worker 代理）+ P0 6 页 + P1 前 12 页 + sitemap/robots + 上线 tradershelf.com | 20+ 页可访问，Bing Webmaster / GSC 就绪 |
| **Phase 2（进行中）** | 美股/港股/Crypto（配色翻转+时段状态）+ 收盘归档管线（Actions cron）+ IndexNow + AdSense 前置 4 页 | 归档页逐日累积并被收录；提交 AdSense |
| **Phase 3** | 计算器矩阵、EN 版、浏览器插件（角标显上证/BTC，点击回主站） | 日 PV 200+ |

### Phase 2 进度明细（2026-11-06）

| 事项 | 状态 | 说明 |
|---|---|---|
| 美股 / 港股页面 + 配色翻转 | ✅ | 绿涨红跌 + 独立调色板，ESG/中概分组 |
| Crypto 实时化 | ✅ | `worker/index.js` 边缘代理三源降级 **CoinGecko → CoinLore → CoinCap**（CoinGecko 免费额度对 Cloudflare 共享出口常返 429，实测 CoinLore 稳定）→ 页面 `/api/crypto` 每 60s 轮询；构建管线同样三级降级（直连 → 自家代理 → 上次快照），**永不伪造价格**；稳定币（USDT/USDC 等）从云图/表格/复盘文案中剔除 |
| 交易时段状态 | ✅ | `utils/session.ts` 按**市场所在时区**判断（Asia/Shanghai / America/New_York），徽章五态：交易中 HH:MM / 午间休市 / 未开盘（美股为盘前）/ 已收盘 / 周末休市，收盘灰点不闪；美股夏令时由 `Intl` 自动换算（此前硬编码 21:30，冬令时错一小时）；每 30s 重算，跨收盘自动切换。**已知边界**：不含法定节假日表，A股/港股假日会显示「交易中」，此时上游数据不更新、时间戳不推进 |
| 收盘归档管线 | ✅ | `.github/workflows/daily-archive.yml`：交易日 16:10 抓数 → 构建 → 部署 → IndexNow → **把归档 JSON 回写仓库**（关键：否则每次 CI 新克隆会丢历史）；休市日无新归档自动跳过 |
| IndexNow | ✅ | `scripts/indexnow.mjs`（key 见 `public/25bbee4fdfb142adbeb07fc3bfda0087.txt`），部署后自动推核心页 + 最近 3 天归档 |
| AdSense 前置 4 页 | ✅ | about / privacy / disclaimer / contact 已上线；`AdSlot` 仍为占位，等过审换插码 |
| 星图截流页 `/xingtu` | ✅ 提前完成 | PLAN 里本属 Phase 3，已上线并接入 sitemap/内链（侧栏「NEW」、页脚、首页工具架、首屏「换成星图看」） |

**CI 需要在仓库配置的 Secrets**：`CLOUDFLARE_API_TOKEN`（Workers Scripts:Edit）、`CLOUDFLARE_ACCOUNT_ID`。未配置时 workflow 的部署步骤会失败，手工 `npm run deploy` 不受影响。

**本地一条命令**：`npm run deploy` = 抓数据 → `nuxt generate` → `wrangler deploy` → IndexNow 推送。

**路由形态**：`[assets] html_handling = "drop-trailing-slash"`，`/crypto` 直出 200（不再 307 到 `/crypto/`），与 canonical / sitemap 的无斜杠形式一致。
**404 处理**：`not_found_handling = "none"` + `binding = "ASSETS"`，未命中路径由 worker 渲染站内 404 页、**保持 404 状态码**（若用 `"404-page"`，Cloudflare 会 307 到 `/404` 且返回 200，形成软 404）。

### Phase 2 验收记录（2026-11-06 晚，对标竞品实测）

**功能/SEO 验收通过**（全部线上实测）：15 路由全 200 + 未知路径真 404；SSR 文本层完好（首页 497 tiles / 星图 220 星体 / 板块页表格 + 2 组 JSON-LD）；`/api/crypto` 三源降级实测 CoinLore 实时生效（BTC/ETH 24h 真价）；稳定币过滤正常——线上"Tether"实为 **XAUT 黄金币**（非稳定币，合理保留）、"USDT"字样来自 FAQ 文案，均非 bug；canonical/OG/schema/缓存/demo-noindex 全过；IndexNow key 线上可达 + dry-run 7 URL 正常。

**竞品对标结论**（52etf.site / dapan.app / stock.wenyaoyefei.com 实测抓取）：三家热力图全部是**纯 JS 画布、HTML 源码里零股票文本**（dapan.app 首屏仅"热力图加载中..."，stock.wenyaoyefei 连标题都是英文），52etf 有 FAQ+复盘时间轴但同样无 SSR 个股层——**SSR 文本层 + 归档矩阵是全赛道唯一**；功能层差距（缩放钻取/截图分享/自选股/雪球跳转）属 Phase 3+。

**⚠ P0 待决——同名仓库双项目冲突**：GitHub `the-beating-light-of-the-nail/tradershelf`（2026-11-06 12:02 另一会话创建）装着**另一个项目**：英文纯静态计算器站（仓位/risk-reward 工具，14 文件），其 wrangler.toml 同样 `name="tradershelf"` + 挂 tradershelf.com。该站从未部署（workers 部署史最早为本项目 16:28 首部署，无覆盖事故），但**两边谁后 deploy 谁覆盖生产 worker**。候选：A. 本项目为正主，收编两个计算器进 `/tools/`（public/ 直通零改造），旧仓改名让位；B. 静态站为正主，本项目换名/域；C. 静态站拆去 tool.tradershelf.com。**倾向 A**（金融工具按既定决策应住主域子目录，且计算器本就在 Phase 3 规划内）。

**待办**：① 仓库冲突拍板；② 配 Secrets（`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`）激活收盘管线；③ 本机 git 传输全挂（SSL_ERROR_SYSCALL，代理亦挂、API 通），恢复后需将本地全史对齐远端（远端 2 提交是另一项目，处置依赖 ①）。

## 8. 风险与合规

- **License**：两个参考项目均 MIT（2026-11-06 核实：stock-market-cloud、a-share-heatmap）。搬代码须在 `THIRD_PARTY_NOTICES.md` 保留原版权声明。
- **接口反爬/字段变更**：多源降级 + 响应结构校验；失败时页面回落到最近静态快照并标注时间。
- **商标**：星图页只用「对比/平替」说明性用法，页首注明「非东方财富官方」，不冒充。
- **免责**：全站页脚固定免责声明；行情数据标注延迟与来源。
- **大陆访问**：workers.dev 被墙 → 一律自定义域；无备案 → 不投百度，主攻 Bing/Google。

## 9. demo/ 文件说明（本轮交付）

**线上演示（2026-11-06 已部署）：<https://demo.tradershelf.com>**（Worker 名 `tradershelf-demo`，`npx wrangler deploy` 即更新；已加 `X-Robots-Tag: noindex` 防止占位页被收录污染根域 SEO；`.html` 后缀自动 307 到无后缀路径，与生产路由形态一致）。

- `assets/style.css` —— 全站样式（已存在的双层设计：深色盯盘首屏 + 浅色门户内容区，含中外两套涨跌配色变量）。
- `index.html` 门户首页模板 —— 看：首屏云图+市场Tab、AI 复盘卡、行业冷暖、资金流、工具架、页脚长尾矩阵、广告位 A/B/D/E、WebSite JSON-LD。
- `us.html` 市场级长尾页（美股）—— 看：面包屑、H1、300 字自动文案区、**配色翻转（绿涨红跌）**、权重股表格、FAQ + FAQPage JSON-LD、相关页内链。
- `sector-semiconductor.html` 板块级长尾页 —— 看：板块复盘文案、成分股表格、板块概览侧栏、相关板块内链网。
- 打开方式：双击或拖进浏览器（纯静态零依赖，琥珀色「⚙ 演示说明」标出了生产环境由数据管线自动生成的区域）。
- ⚠ demo 是设计母版（对应未来 Nuxt 的三个 layout），不要直接推上线——纯静态无法自动更新，Phase 1 由我 Nuxt 化。
