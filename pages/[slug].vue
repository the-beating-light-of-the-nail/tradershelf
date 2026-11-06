<template>
  <div class="wrap light-zone prose-page">
    <nav class="crumb" aria-label="面包屑">
      <ol>
        <li><NuxtLink to="/">首页</NuxtLink></li>
        <li><strong>{{ c.title }}</strong></li>
      </ol>
    </nav>
    <div class="page-head">
      <h1>{{ c.title }}</h1>
      <p class="sub">Trader Shelf · 交易者的工具架</p>
    </div>
    <section v-html="c.body" />
    <p style="margin-top: 30px"><NuxtLink to="/">← 返回大盘云图</NuxtLink></p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const pages: Record<string, { title: string; seo: string; body: string }> = {
  about: {
    title: '关于本站',
    seo: '关于 Trader Shelf 交易者的工具架：独立的大盘云图与行情工具站',
    body: `
<h2>我们做什么</h2>
<p>Trader Shelf（交易者的工具架）是一个独立的行情工具站：一个页面看全 A股、美股、港股与加密货币的大盘云图热力图。热力图按市值排布、颜色代表当日涨跌幅，每个交易日收盘后自动生成复盘与归档，支持回看任意历史交易日。</p>
<h2>我们不是谁</h2>
<p>本站为独立工具站，与东方财富、同花顺、Finviz、TradingView 等任何机构无关联，也不提供证券经纪、投资顾问或资产管理服务。</p>
<h2>数据从哪来</h2>
<p>行情数据来自公开接口整理（可能存在延迟或误差），站内文字复盘由程序根据当日行情数据自动生成。所有内容仅供参考，不构成任何投资建议。</p>
<h2>联系与姊妹项目</h2>
<p>意见反馈请见<a href="/contact">联系我们</a>。姊妹项目：<a href="https://calm.tradershelf.com" rel="nofollow">停一刻 · 交易者休息小站</a>——盯盘间隙，记得休息。</p>`,
  },
  privacy: {
    title: '隐私政策',
    seo: 'Trader Shelf 隐私政策：不收集个人行情数据，广告与统计 Cookie 说明',
    body: `
<h2>我们收集什么</h2>
<p>本站不要求注册、不收集用户的自选股或浏览行为档案。服务器仅记录常规访问日志（IP、User-Agent、访问路径），用于安全与性能监测。</p>
<h2>Cookie 与广告</h2>
<p>本站可能投放第三方展示广告（如 Google AdSense）。第三方广告供应商可能使用 Cookie 依据您的浏览记录展示个性化广告；您可在 <a href="https://adssettings.google.com" rel="nofollow">Google 广告设置</a> 中管理个性化偏好，或通过 <a href="https://www.aboutads.info" rel="nofollow">aboutads.info</a> 退出第三方供应商个性化广告。</p>
<h2>本地存储</h2>
<p>站点可能使用浏览器 localStorage 记忆界面偏好（如配色）。这些数据仅保存在您的浏览器中，不上传服务器。</p>
<h2>第三方链接</h2>
<p>本站包含指向第三方网站的链接，其隐私实践不受本政策约束。</p>
<h2>政策更新</h2>
<p>政策如有更新将在此页面公示。继续使用本站即表示您了解并同意本政策。</p>`,
  },
  disclaimer: {
    title: '免责声明',
    seo: 'Trader Shelf 免责声明：数据仅供参考，不构成投资建议',
    body: `
<h2>数据性质</h2>
<p>本站行情数据来自公开接口整理，可能存在延迟、缺失或误差；页面文字复盘由程序自动生成，可能存在计算或表述错误。所有数据与内容仅供参考。</p>
<h2>不构成投资建议</h2>
<p>本站任何内容均不构成证券、基金、加密货币或其他金融产品的投资建议、要约或招揽。股市有风险，投资需谨慎；加密货币价格波动剧烈，并可能受所在辖区法律限制。请独立判断并自行承担投资决策的全部责任。</p>
<h2>免责范围</h2>
<p>在适用法律允许的最大范围内，本站对因使用或依赖本站内容而产生的任何直接或间接损失不承担责任。</p>
<h2>版权</h2>
<p>本站页面结构、文案与程序化生成内容版权归 tradershelf.com 所有。行情数据版权归其来源机构所有。</p>`,
  },
  contact: {
    title: '联系我们',
    seo: '联系 Trader Shelf：意见反馈、广告合作与数据勘误',
    body: `
<h2>意见反馈</h2>
<p>功能建议、数据勘误、坏链反馈，欢迎邮件至：<strong>contact（#）tradershelf.com</strong>（发送时请将 （#） 替换为 @）。</p>
<h2>广告合作</h2>
<p>本站接受合规展示广告与金融工具类合作（券商/交易所推广需符合所在辖区法规）。商务联系请使用上述邮箱并注明「广告合作」。</p>
<h2>响应时间</h2>
<p>本站为独立维护项目，邮件通常在 3 个工作日内回复。</p>`,
  },
}

const c = pages[slug]
if (!c) throw createError({ statusCode: 404, statusMessage: '页面不存在', fatal: true })

useSeoMeta({ title: `${c.title} - Trader Shelf`, description: c.seo })
useHead({ link: [{ rel: 'canonical', href: `https://tradershelf.com/${slug}` }] })
</script>
