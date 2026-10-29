<script setup>
import IconAvatar from './ui/IconAvatar.vue'
import ItemActionsMenu from './ui/ItemActionsMenu.vue'

defineProps({
  category: { type: Object, required: true },
})

defineEmits(['edit', 'delete'])
</script>

<template>
  <div class="group relative rounded-2xl bg-surface p-5 ring-1 ring-slate-900/5">
    <ItemActionsMenu @edit="$emit('edit')" @delete="$emit('delete')" />
    <div class="flex flex-col items-center gap-3 py-2 text-center">
      <IconAvatar :icon="category.icon" :color="category.color" size="lg" />
      <p class="text-sm font-medium text-slate-800">{{ category.name }}</p>
      <slot />
    </div>
  </div>
</template>
