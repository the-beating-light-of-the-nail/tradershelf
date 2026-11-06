<template>
  <div class="shell">
    <!-- ======== 左侧导航工作台 ======== -->
    <aside class="sidebar">
      <NuxtLink class="logo side-logo" to="/">
        <span class="logo-mark"><i></i><i></i><i></i><i></i></span>
        Trader<em>Shelf</em>
      </NuxtLink>
      <nav class="side-nav" aria-label="主导航">
        <div class="side-group">市场热力图</div>
        <NuxtLink class="side-link" to="/" :class="{ on: path === '/' }">A股大盘云图</NuxtLink>
        <NuxtLink class="side-link" to="/us" :class="{ on: path === '/us' }">美股大盘云图</NuxtLink>
        <NuxtLink class="side-link" to="/hk" :class="{ on: path === '/hk' }">港股大盘云图</NuxtLink>
        <NuxtLink class="side-link" to="/crypto" :class="{ on: path === '/crypto' }">Crypto 热力图</NuxtLink>
        <a class="side-link" href="#" title="Phase 2 上线">大盘星图<span style="margin-left:auto;font-size:11px;color:#5d6a7d">规划中</span></a>

        <div class="side-group">板块热力图</div>
        <NuxtLink
          v-for="s in sectors" :key="s.slug" class="side-link"
          :to="`/sector/${s.slug}`" :class="{ on: path === '/sector/' + s.slug }"
        >{{ s.display }}</NuxtLink>

        <div class="side-group">工具与归档</div>
        <NuxtLink class="side-link" to="/archive" :class="{ on: path.startsWith('/archive') }">每日归档</NuxtLink>
        <a class="side-link" href="#" title="Phase 2 上线">恐慌贪婪指数</a>
        <a class="side-link" href="#" title="Phase 2 上线">网格计算器</a>
        <a class="side-link" href="#" title="Phase 2 上线">复利计算器</a>
      </nav>
      <div class="side-foot">
        <button class="nav-cta side-fav" type="button" title="Ctrl+D 收藏本站，每个交易日开盘即看">★ 收藏看盘</button>
        <div class="side-links-row">
          <NuxtLink to="/about">关于</NuxtLink>
          <NuxtLink to="/privacy">隐私</NuxtLink>
          <NuxtLink to="/disclaimer">免责</NuxtLink>
          <NuxtLink to="/contact">联系</NuxtLink>
        </div>
      </div>
    </aside>
    <div class="side-mask" aria-hidden="true" @click="close"></div>

    <!-- ======== 主内容 ======== -->
    <div class="main">
      <div class="mobilebar">
        <button class="burger" type="button" aria-label="打开导航" @click="toggle">☰</button>
        <NuxtLink class="logo" to="/"><span class="logo-mark"><i></i><i></i><i></i><i></i></span> Trader<em>Shelf</em></NuxtLink>
      </div>

      <slot />

      <!-- ======== 页脚 ======== -->
      <footer class="footer">
        <div class="wrap">
          <div class="ft-grid">
            <div>
              <h4>Trader Shelf · 交易者的工具架</h4>
              <p style="margin: 0 0 8px">
                一个页面看全 A股、美股、港股与加密货币的大盘云图热力图。热力图按市值排布、颜色代表涨跌幅，每个交易日收盘后自动生成复盘与归档，支持回看任意历史交易日。
                本站为独立工具站，与东方财富、同花顺、Finviz、TradingView 等无关联。
              </p>
              <p style="margin: 0">姊妹项目：<a href="https://calm.tradershelf.com" rel="nofollow">停一刻 · 交易者休息小站</a></p>
            </div>
            <div>
              <h4>市场云图</h4>
              <ul>
                <li><NuxtLink to="/">A股大盘云图</NuxtLink></li>
                <li><NuxtLink to="/us">美股大盘云图</NuxtLink></li>
                <li><NuxtLink to="/hk">港股大盘云图</NuxtLink></li>
                <li><NuxtLink to="/crypto">Crypto 热力图</NuxtLink></li>
                <li><a href="#">大盘星图<span style="color:#5d6a7d">（规划中）</span></a></li>
              </ul>
            </div>
            <div>
              <h4>板块精选</h4>
              <ul>
                <li v-for="s in sectors.slice(0, 5)" :key="s.slug"><NuxtLink :to="`/sector/${s.slug}`">{{ s.display }}热力图</NuxtLink></li>
              </ul>
            </div>
            <div>
              <h4>站点</h4>
              <ul>
                <li><NuxtLink to="/about">关于本站</NuxtLink></li>
                <li><NuxtLink to="/privacy">隐私政策</NuxtLink></li>
                <li><NuxtLink to="/disclaimer">免责声明</NuxtLink></li>
                <li><NuxtLink to="/contact">联系我们</NuxtLink></li>
                <li><NuxtLink to="/archive">每日归档</NuxtLink></li>
                <li><a href="/sitemap.xml">网站地图</a></li>
              </ul>
            </div>
          </div>
          <div class="disclaimer">
            免责声明：本站行情数据来自公开接口整理，可能存在延迟或误差，所有内容仅供参考，不构成任何投资建议。股市有风险，投资需谨慎。加密货币相关内容不面向美国及受限地区居民，亦不构成税务或法律建议。
          </div>
          <div class="ft-bottom">
            <span>© 2026 tradershelf.com</span>
            <span>Trader Shelf · 交易者的工具架</span>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const path = computed(() => route.path)
const sectors = (await import('~/data/sectors.config.json')).default as any[]

const toggle = () => document.body.classList.toggle('side-open')
const close = () => document.body.classList.remove('side-open')
watch(path, close)
useHead({ htmlAttrs: { lang: 'zh-CN' } })
</script>
