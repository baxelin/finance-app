<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const open = ref(false)
const root = ref(null)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function onClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) close()
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

defineExpose({ close })
</script>

<template>
  <div ref="root" class="relative">
    <div @click.stop="toggle">
      <slot name="trigger" :open="open" />
    </div>
    <Transition name="menu-fade">
      <div
        v-if="open"
        class="absolute right-0 z-30 mt-2 min-w-40 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-900/10"
        @click="close"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.12s ease;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
