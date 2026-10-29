<script setup>
import { computed, reactive, watch } from 'vue'
import Modal from './ui/Modal.vue'
import BaseButton from './ui/BaseButton.vue'
import { useAccountsStore } from '../stores/accounts'

const props = defineProps({
  open: { type: Boolean, default: false },
  editing: { type: Object, default: null },
})

const emit = defineEmits(['close', 'submit'])
const accountsStore = useAccountsStore()

const form = reactive({ name: '', accountId: '', closingDay: '', dueDay: '' })

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    if (props.editing) {
      form.name = props.editing.name
      form.accountId = props.editing.accountId
      form.closingDay = props.editing.closingDay
      form.dueDay = props.editing.dueDay
    } else {
      form.name = ''
      form.accountId = ''
      form.closingDay = ''
      form.dueDay = ''
    }
  }
)

const title = computed(() => (props.editing ? 'Editar cartão' : 'Novo cartão'))

function submit() {
  emit('submit', {
    name: form.name,
    accountId: form.accountId,
    closingDay: Number(form.closingDay),
    dueDay: Number(form.dueDay),
  })
}
</script>

<template>
  <Modal :open="open" :title="title" @close="$emit('close')">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div>
        <label class="form-label">Nome</label>
        <input v-model="form.name" required class="form-control w-full" />
      </div>
      <div v-if="!editing">
        <label class="form-label">Conta vinculada</label>
        <select v-model="form.accountId" required class="form-control w-full">
          <option value="">Selecione</option>
          <option v-for="acc in accountsStore.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">Dia de fechamento</label>
          <input v-model="form.closingDay" type="number" min="1" max="31" required class="form-control w-full" />
        </div>
        <div>
          <label class="form-label">Dia de vencimento</label>
          <input v-model="form.dueDay" type="number" min="1" max="31" required class="form-control w-full" />
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" type="button" @click="$emit('close')">Cancelar</BaseButton>
        <BaseButton type="submit">{{ editing ? 'Salvar' : 'Adicionar' }}</BaseButton>
      </div>
    </form>
  </Modal>
</template>
