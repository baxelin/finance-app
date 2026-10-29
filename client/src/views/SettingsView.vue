<script setup>
import { ref, onMounted, computed } from 'vue'
import { Plus, Trash2, RotateCcw } from '@lucide/vue'
import api from '../lib/api'
import { formatCurrency } from '../lib/format'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import { useCategoriesStore } from '../stores/categories'

const categoriesStore = useCategoriesStore()

const resetDialogOpen = ref(false)
const resetting = ref(false)

async function performReset() {
  resetting.value = true
  try {
    await api.post('/settings/reset')
    window.location.reload()
  } catch (err) {
    alert(err.response?.data?.error || 'Não foi possível reiniciar os dados.')
  } finally {
    resetting.value = false
    resetDialogOpen.value = false
  }
}

const budgets = ref([])
const newBudget = ref({ categoryId: '', monthlyLimit: '' })

async function fetchBudgets() {
  const { data } = await api.get('/budgets')
  budgets.value = data
}

async function submitBudget() {
  await api.post('/budgets', {
    categoryId: newBudget.value.categoryId,
    monthlyLimit: Number(newBudget.value.monthlyLimit),
  })
  newBudget.value = { categoryId: '', monthlyLimit: '' }
  await fetchBudgets()
}

async function removeBudget(id) {
  await api.delete(`/budgets/${id}`)
  await fetchBudgets()
}

const expenseCategories = computed(() => categoriesStore.categories.filter((c) => c.type === 'expense'))

onMounted(() => {
  categoriesStore.fetchCategories()
  fetchBudgets()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Configurações" description="Defina orçamentos mensais por categoria" />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="rounded-2xl bg-surface p-6 ring-1 ring-slate-900/5">
        <h3 class="mb-4 text-sm font-medium text-slate-500">Orçamentos definidos</h3>
        <div class="flex flex-col gap-3">
          <div v-for="b in budgets" :key="b.id" class="flex items-center justify-between text-sm">
            <span class="text-slate-700">{{ b.category.name }}</span>
            <div class="flex items-center gap-3">
              <span class="font-medium tabular-nums text-slate-700">{{ formatCurrency(b.monthlyLimit) }}</span>
              <button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-expense-600" @click="removeBudget(b.id)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <p v-if="budgets.length === 0" class="text-sm text-slate-400">Nenhum orçamento definido.</p>
        </div>
      </div>

      <div class="rounded-2xl bg-surface p-6 ring-1 ring-slate-900/5">
        <h3 class="mb-4 text-sm font-medium text-slate-500">Novo orçamento</h3>
        <form class="flex flex-col gap-4" @submit.prevent="submitBudget">
          <div>
            <label class="form-label">Categoria</label>
            <select v-model="newBudget.categoryId" required class="form-control w-full">
              <option value="">Selecione</option>
              <optgroup v-for="parent in expenseCategories" :key="parent.id" :label="parent.name">
                <option :value="parent.id">{{ parent.name }} (categoria inteira)</option>
                <option v-for="child in parent.children" :key="child.id" :value="child.id">— {{ child.name }}</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label class="form-label">Limite mensal (R$)</label>
            <input v-model="newBudget.monthlyLimit" type="number" step="0.01" min="0" required class="form-control w-full" />
          </div>
          <BaseButton type="submit">
            <Plus :size="16" />
            Salvar orçamento
          </BaseButton>
        </form>
      </div>
    </div>

    <div class="rounded-2xl bg-surface p-6 ring-1 ring-expense-500/20">
      <h3 class="mb-1 text-sm font-medium text-expense-600">Zona de risco</h3>
      <p class="mb-4 text-sm text-slate-500">
        Apaga permanentemente todas as contas, cartões, transações, orçamentos, investimentos e recorrências, restaurando o app ao estado inicial.
      </p>
      <BaseButton variant="danger" @click="resetDialogOpen = true">
        <RotateCcw :size="16" />
        Reiniciar do zero
      </BaseButton>
    </div>

    <ConfirmDialog
      :open="resetDialogOpen"
      title="Reiniciar do zero"
      message="Essa ação é irreversível e vai apagar TODOS os dados do app (contas, cartões, transações, orçamentos, investimentos e recorrências). Tem certeza que deseja continuar?"
      :actions="[{ label: resetting ? 'Apagando...' : 'Sim, apagar tudo', value: 'confirm', variant: 'danger' }]"
      @close="resetDialogOpen = false"
      @choose="performReset"
    />
  </div>
</template>
