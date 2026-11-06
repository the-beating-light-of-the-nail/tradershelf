<template>
  <div class="wrap light-zone">
    <nav class="crumb" aria-label="面包屑">
      <ol>
        <li><NuxtLink to="/">首页</NuxtLink></li>
        <li><strong>每日归档</strong></li>
      </ol>
    </nav>
    <div class="page-head">
      <h1>大盘云图每日归档</h1>
      <p class="sub">每个交易日收盘后自动生成当日全市场复盘与板块涨跌快照，可回看任意历史交易日。</p>
    </div>

    <section class="sec">
      <h2>归档列表（{{ dates.length }} 个交易日）</h2>
      <div class="tbl-wrap">
        <table class="data">
          <caption>收盘数据自动归档 · IndexNow 秒推送收录</caption>
          <thead>
            <tr><th>日期</th><th>市场</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in dates" :key="d">
              <td>{{ d }}</td>
              <td>A股 + 板块</td>
              <td><NuxtLink :to="`/archive/${d}`">查看{{ d }}复盘 →</NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <AdSlot name="E" style="margin-bottom: 0" />
  </div>
</template>

<script setup lang="ts">
import { archiveDates } from '~/utils/data'
const dates = archiveDates
useSeoMeta({
  title: '大盘云图每日归档_历史交易日板块涨跌回看 - Trader Shelf',
  description: '每个交易日收盘后自动归档当日大盘云图与板块涨跌快照，支持回看任意历史交易日的市场全景。',
})
useHead({ link: [{ rel: 'canonical', href: 'https://tradershelf.com/archive' }] })
</script>
