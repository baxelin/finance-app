<script setup>
import { X } from '@lucide/vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md', validator: (value) => ['md', 'xl'].includes(value) },
})

defineEmits(['close'])

const SIZE_CLASSES = { md: 'max-w-lg', xl: 'max-w-5xl' }
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        @click.self="$emit('close')"
      >
        <Transition name="modal-slide" appear>
          <div
            v-if="open"
            class="flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl"
            :class="SIZE_CLASSES[size]"
          >
            <div class="mb-5 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-800">{{ title }}</h2>
              <button
                class="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Fechar"
                @click="$emit('close')"
              >
                <X :size="18" />
              </button>
            </div>
            <slot />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active {
  transition: all 0.2s ease;
}
.modal-slide-leave-active {
  transition: all 0.15s ease;
}
.modal-slide-enter-from,
.modal-slide-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
