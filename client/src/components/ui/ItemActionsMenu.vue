<script setup>
import { MoreVertical, Pencil, Trash2 } from '@lucide/vue'
import DropdownMenu from './DropdownMenu.vue'

defineEmits(['edit', 'delete'])
</script>

<template>
  <DropdownMenu class="absolute right-3 top-3">
    <template #trigger>
      <button
        class="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 group-hover:opacity-100"
        title="Ações"
        @click.prevent
      >
        <MoreVertical :size="16" />
      </button>
    </template>
    <button class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50" @click.prevent="$emit('edit')">
      <Pencil :size="14" /> Editar
    </button>
    <button class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-expense-600 hover:bg-slate-50" @click.prevent="$emit('delete')">
      <Trash2 :size="14" /> Excluir
    </button>
  </DropdownMenu>
</template>
