<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon: { type: [Object, Function], default: null },
  valueClass: { type: String, default: 'text-slate-900' },
})
</script>

<template>
  <div class="rounded-2xl bg-surface p-5 ring-1 ring-slate-900/5">
    <p class="flex items-center gap-2 text-sm text-slate-500">
      <component :is="icon" v-if="icon" :size="16" />
      {{ label }}
    </p>
    <p class="mt-2 text-2xl font-semibold tabular-nums" :class="valueClass">{{ value }}</p>
    <slot />
  </div>
</template>
