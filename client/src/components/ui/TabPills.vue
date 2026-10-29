<script setup>
defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="inline-flex flex-wrap items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-900/5">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      class="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
      :class="modelValue === tab.value ? 'bg-ink-900 text-white' : 'text-slate-500 hover:text-slate-800'"
      @click="$emit('update:modelValue', tab.value)"
    >
      <component :is="tab.icon" v-if="tab.icon" :size="15" />
      <span>{{ tab.label }}</span>
      <span
        v-if="tab.count !== undefined"
        class="rounded-full px-1.5 py-0.5 text-xs font-semibold"
        :class="modelValue === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'"
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>
