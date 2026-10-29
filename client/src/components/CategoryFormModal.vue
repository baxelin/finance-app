<script setup>
import { computed, reactive, watch } from 'vue'
import Modal from './ui/Modal.vue'
import BaseButton from './ui/BaseButton.vue'
import IconAvatar from './ui/IconAvatar.vue'
import { ICON_PICKER_OPTIONS, COLOR_PALETTE, resolveIcon } from '../lib/icons'

const props = defineProps({
  open: { type: Boolean, default: false },
  editing: { type: Object, default: null },
  parentOptions: { type: Array, default: () => [] },
  forcedParentId: { type: [Number, String, null], default: undefined },
})

const emit = defineEmits(['close', 'submit'])

const form = reactive({
  name: '',
  type: 'expense',
  parentId: '',
  icon: 'tag',
  color: COLOR_PALETTE[0],
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    if (props.editing) {
      form.name = props.editing.name
      form.type = props.editing.type
      form.parentId = props.editing.parentId || ''
      form.icon = props.editing.icon || 'tag'
      form.color = props.editing.color || COLOR_PALETTE[0]
    } else {
      form.name = ''
      form.type = 'expense'
      form.parentId = props.forcedParentId ?? ''
      form.icon = 'tag'
      form.color = COLOR_PALETTE[0]
    }
  }
)

const title = computed(() => (props.editing ? 'Editar categoria' : 'Nova categoria'))
const isSubcategory = computed(() => props.forcedParentId !== undefined && props.forcedParentId !== null)

function submit() {
  emit('submit', {
    name: form.name,
    type: form.type,
    parentId: form.parentId || null,
    icon: form.icon,
    color: form.color,
  })
}
</script>

<template>
  <Modal :open="open" :title="title" @close="$emit('close')">
    <form class="flex flex-col gap-5" @submit.prevent="submit">
      <div class="flex items-center gap-4">
        <IconAvatar :icon="form.icon" :color="form.color" size="lg" />
        <div class="flex-1">
          <label class="form-label">Nome</label>
          <input v-model="form.name" required class="form-control w-full" />
        </div>
      </div>

      <div v-if="!isSubcategory" class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">Tipo</label>
          <select v-model="form.type" class="form-control w-full">
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
        </div>
        <div>
          <label class="form-label">Categoria pai</label>
          <select v-model="form.parentId" class="form-control w-full">
            <option value="">Nenhuma (categoria raiz)</option>
            <option v-for="p in parentOptions.filter((p) => p.type === form.type)" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-slate-600">Cor</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="c in COLOR_PALETTE"
            :key="c"
            type="button"
            class="h-8 w-8 rounded-full ring-offset-2 transition-all"
            :class="form.color === c ? 'ring-2 ring-ink-900' : ''"
            :style="{ backgroundColor: c }"
            @click="form.color = c"
          />
        </div>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-slate-600">Ícone</label>
        <div class="grid max-h-48 grid-cols-8 gap-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
          <button
            v-for="key in ICON_PICKER_OPTIONS"
            :key="key"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            :class="form.icon === key ? 'bg-ink-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-200'"
            @click="form.icon = key"
          >
            <component :is="resolveIcon(key)" :size="16" />
          </button>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" type="button" @click="$emit('close')">Cancelar</BaseButton>
        <BaseButton type="submit">{{ editing ? 'Salvar' : 'Adicionar' }}</BaseButton>
      </div>
    </form>
  </Modal>
</template>
