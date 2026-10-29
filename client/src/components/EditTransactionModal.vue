<script setup>
import { ref, computed, watch } from 'vue'
import Modal from './ui/Modal.vue'
import BaseButton from './ui/BaseButton.vue'
import { useCategoriesStore } from '../stores/categories'
import api from '../lib/api'

const props = defineProps({
  transaction: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])

const categoriesStore = useCategoriesStore()

const form = ref({ description: '', categoryId: '', amount: '', date: '', status: 'pending' })
const scope = ref('single')
const submitting = ref(false)
const error = ref('')

const isOpen = computed(() => !!props.transaction)

const categoryOptions = computed(() =>
  categoriesStore.categories.filter((c) => c.type === (props.transaction?.type === 'income' ? 'income' : 'expense'))
)

watch(
  () => props.transaction,
  (t) => {
    if (!t) return
    form.value = {
      description: t.description,
      categoryId: t.categoryId || '',
      amount: t.amount,
      date: new Date(t.date).toISOString().slice(0, 10),
      status: t.status,
    }
    scope.value = 'single'
    error.value = ''
    if (categoriesStore.categories.length === 0) categoriesStore.fetchCategories()
  }
)

const isInstallment = computed(() => !!props.transaction?.installmentGroupId)
const isRecurring = computed(() => !!props.transaction?.recurrenceRuleId)
const canEditAmountAndDate = computed(() => scope.value === 'single')

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    const payload = {
      description: form.value.description,
      categoryId: form.value.categoryId || null,
      status: form.value.status,
    }
    if (canEditAmountAndDate.value) {
      payload.amount = Number(form.value.amount)
      payload.date = form.value.date
    }
    const query = scope.value !== 'single' ? `?scope=${scope.value}` : ''
    await api.put(`/transactions/${props.transaction.id}${query}`, payload)
    emit('saved')
    emit('close')
  } catch (err) {
    error.value = err.response?.data?.error || 'Erro ao salvar alterações'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Modal :open="isOpen" title="Editar lançamento" @close="$emit('close')">
    <form v-if="transaction" class="flex flex-col gap-4" @submit.prevent="submit">
      <div v-if="isInstallment" class="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 text-sm">
        <span class="font-medium text-slate-600">Aplicar alteração a:</span>
        <label class="flex items-center gap-2">
          <input v-model="scope" type="radio" value="single" />
          Somente esta parcela ({{ transaction.installmentNumber }}/{{ transaction.installmentTotal }})
        </label>
        <label class="flex items-center gap-2">
          <input v-model="scope" type="radio" value="group" />
          Todas as parcelas do grupo
        </label>
      </div>

      <div v-else-if="isRecurring" class="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 text-sm">
        <span class="font-medium text-slate-600">Aplicar alteração a:</span>
        <label class="flex items-center gap-2">
          <input v-model="scope" type="radio" value="single" />
          Somente este lançamento
        </label>
        <label class="flex items-center gap-2">
          <input v-model="scope" type="radio" value="future" />
          Este e os próximos (ainda previstos)
        </label>
      </div>

      <div>
        <label class="form-label">Descrição</label>
        <input v-model="form.description" required class="form-control w-full" />
      </div>

      <div v-if="transaction.type !== 'transfer'">
        <label class="form-label">Categoria</label>
        <select v-model="form.categoryId" class="form-control w-full">
          <option value="">Selecione</option>
          <optgroup v-for="parent in categoryOptions" :key="parent.id" :label="parent.name">
            <option :value="parent.id">{{ parent.name }}</option>
            <option v-for="child in parent.children" :key="child.id" :value="child.id">— {{ child.name }}</option>
          </optgroup>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="form-label">Data</label>
          <input v-model="form.date" type="date" :disabled="!canEditAmountAndDate" required class="form-control w-full disabled:bg-slate-50 disabled:text-slate-400" />
        </div>
        <div>
          <label class="form-label">Valor (R$)</label>
          <input v-model="form.amount" type="number" step="0.01" min="0" :disabled="!canEditAmountAndDate" required class="form-control w-full disabled:bg-slate-50 disabled:text-slate-400" />
        </div>
      </div>

      <div>
        <label class="form-label">Status</label>
        <select v-model="form.status" class="form-control w-full">
          <option value="pending">Previsto</option>
          <option value="confirmed">Confirmado</option>
        </select>
      </div>

      <p v-if="error" class="text-sm text-expense-600">{{ error }}</p>

      <div class="mt-2 flex justify-end gap-3">
        <BaseButton variant="ghost" type="button" @click="$emit('close')">Cancelar</BaseButton>
        <BaseButton type="submit" :disabled="submitting">{{ submitting ? 'Salvando…' : 'Salvar' }}</BaseButton>
      </div>
    </form>
  </Modal>
</template>
