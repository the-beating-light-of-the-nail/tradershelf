<template>
  <!-- 广告位占位：AdSense 过审后替换为 <ins class="adsbygoogle"> 插码；首月每页 ≤2 位 -->
  <aside :class="cls" aria-label="广告位">
    <span class="t1">广告位 {{ name }} · {{ label }}</span>
    <span class="t2">{{ desc }}</span>
  </aside>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{ name: string; variant?: 'banner' | 'rect' | 'inread'; dark?: boolean; label?: string; desc?: string }>(),
  { variant: 'banner' },
)
const cls = computed(() => [
  'ad-slot',
  props.variant === 'banner' ? 'ad-banner' : props.variant === 'rect' ? 'ad-rect' : 'ad-inread',
  props.dark ? 'ad-dark' : '',
])
const label = computed(() => props.label || (props.variant === 'banner' ? '响应式横幅' : props.variant === 'rect' ? '300×250' : '信息流原生'))
const desc = computed(() => props.desc || 'AdSense 预留 · 过审后启用')
</script>
