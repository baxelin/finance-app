<script setup>
defineProps({
  title: { type: String, default: '' },
})
</script>

<template>
  <div class="rounded-2xl bg-surface p-6 shadow-sm shadow-slate-200/60 ring-1 ring-slate-900/5">
    <div v-if="title || $slots.actions" class="mb-4 flex items-center justify-between">
      <h3 v-if="title" class="text-sm font-medium text-slate-500">{{ title }}</h3>
      <slot name="actions" />
    </div>
    <slot />
  </div>
</template>
