<template>
  <section class="sec faq">
    <h2>{{ title }}</h2>
    <details v-for="(f, i) in faqs" :key="i" :open="i === 0 && openFirst">
      <summary>{{ f.q }}</summary>
      <div class="a">{{ f.a }}</div>
    </details>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; faqs: { q: string; a: string }[]; openFirst?: boolean }>(), { openFirst: true })
</script>
