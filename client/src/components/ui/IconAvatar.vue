<script setup>
import { computed } from 'vue'
import { resolveIcon } from '../../lib/icons'

const props = defineProps({
  icon: { type: String, default: 'tag' },
  color: { type: String, default: '#64748b' },
  size: { type: String, default: 'md', validator: (value) => ['sm', 'md', 'lg'].includes(value) },
})

const iconComponent = computed(() => resolveIcon(props.icon))

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
}

const iconSizes = {
  sm: 15,
  md: 20,
  lg: 26,
}
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full"
    :class="sizeClasses[size]"
    :style="{ backgroundColor: color }"
  >
    <component :is="iconComponent" :size="iconSizes[size]" color="#fff" :stroke-width="2" />
  </span>
</template>
