<script setup>
import Modal from './Modal.vue'
import BaseButton from './BaseButton.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Confirmar' },
  message: { type: String, default: '' },
  actions: {
    type: Array,
    default: () => [{ label: 'Confirmar', value: 'confirm', variant: 'primary' }],
  },
})

const emit = defineEmits(['close', 'choose'])
</script>

<template>
  <Modal :open="open" :title="title" @close="$emit('close')">
    <p v-if="message" class="mb-5 text-sm text-slate-600">{{ message }}</p>
    <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <BaseButton variant="ghost" type="button" @click="$emit('close')">Cancelar</BaseButton>
      <BaseButton
        v-for="action in actions"
        :key="action.value"
        :variant="action.variant || 'secondary'"
        type="button"
        @click="$emit('choose', action.value)"
      >
        {{ action.label }}
      </BaseButton>
    </div>
  </Modal>
</template>
