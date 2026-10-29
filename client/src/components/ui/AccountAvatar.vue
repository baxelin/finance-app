<script setup>
import IconAvatar from './IconAvatar.vue'
import { colorForKey } from '../../lib/icons'

defineProps({
  account: { type: Object, required: true },
  size: { type: String, default: 'md' },
})
</script>

<template>
  <IconAvatar :icon="account.type === 'joint' ? 'family' : 'wallet'" :color="colorForKey(account.name)" :size="size" />
</template>
