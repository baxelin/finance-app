<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Repeat, Upload } from '@lucide/vue'
import api from '../lib/api'
import { formatCurrency, formatDate, formatMonthLabel } from '../lib/format'
import { todayIso, addDaysIso, weekRangeIso, shiftMonth } from '../lib/dateUtils'
import BaseButton from '../components/ui/BaseButton.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import TransactionFormModal from '../components/TransactionFormModal.vue'
import EditTransactionModal from '../components/EditTransactionModal.vue'
import ImportTransactionsModal from '../components/ImportTransactionsModal.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import { useAccountsStore } from '../stores/accounts'

const accountsStore = useAccountsStore()
const importModalOpen = ref(false)

const now = new Date()
const periodMode = ref('month')
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const anchorDate = ref(todayIso())
const rangeFrom = ref(todayIso())
const rangeTo = ref(todayIso())

const statusFilter = ref('all')
const accountFilter = ref('')

const transactions = ref([])
const loading = ref(false)
const modalOpen = ref(false)
const editingTransaction = ref(null)
const deleteTarget = ref(null)

const periodLabel = computed(() => {
  if (periodMode.value === 'month') return formatMonthLabel(year.value, month.value)
  if (periodMode.value === 'year') return String(year.value)
  if (periodMode.value === 'day') return formatDate(anchorDate.value)
  if (periodMode.value === 'week') {
    const { from, to } = weekRangeIso(anchorDate.value)
    return `${formatDate(from)} — ${formatDate(to)}`
  }
  return ''
})

function shiftPeriod(delta) {
  if (periodMode.value === 'month') {
    const shifted = shiftMonth({ year: year.value, month: month.value }, delta)
    year.value = shifted.year
    month.value = shifted.month
  } else if (periodMode.value === 'year') {
    year.value += delta
  } else if (periodMode.value === 'day') {
    anchorDate.value = addDaysIso(anchorDate.value, delta)
  } else if (periodMode.value === 'week') {
    anchorDate.value = addDaysIso(anchorDate.value, delta * 7)
  }
}

function periodParams() {
  switch (periodMode.value) {
    case 'month':
      return { month: `${year.value}-${String(month.value).padStart(2, '0')}` }
    case 'year':
      return { from: `${year.value}-01-01`, to: `${year.value}-12-31` }
    case 'day':
      return { from: anchorDate.value, to: anchorDate.value }
    case 'week':
      return weekRangeIso(anchorDate.value)
    default:
      return { from: rangeFrom.value, to: rangeTo.value }
  }
}

async function fetchTransactions() {
  loading.value = true
  try {
    const params = {
      ...periodParams(),
      ...(statusFilter.value !== 'all' && { status: statusFilter.value }),
      ...(accountFilter.value && { accountId: accountFilter.value }),
    }
    const { data } = await api.get('/transactions', { params })
    transactions.value = data
  } finally {
    loading.value = false
  }
}

async function confirmTransaction(t) {
  await api.post(`/transactions/${t.id}/confirm`)
  await fetchTransactions()
}

function signedAmount(t) {
  if (t.type === 'expense') return -t.amount
  if (t.type === 'income') return t.amount
  return t.destinationAccountId ? t.amount : -t.amount
}

const deleteActions = computed(() => {
  const t = deleteTarget.value
  if (!t) return []
  if (t.installmentGroupId) {
    return [
      { label: 'Somente esta parcela', value: 'single', variant: 'danger' },
      { label: 'Todas as parcelas', value: 'group', variant: 'danger' },
    ]
  }
  if (t.recurrenceRuleId) {
    return [
      { label: 'Somente este', value: 'single', variant: 'danger' },
      { label: 'Este e os próximos', value: 'future', variant: 'danger' },
    ]
  }
  return [{ label: 'Excluir', value: 'single', variant: 'danger' }]
})

async function performDelete(scope) {
  const t = deleteTarget.value
  deleteTarget.value = null
  const query = scope !== 'single' ? `?scope=${scope}` : ''
  await api.delete(`/transactions/${t.id}${query}`)
  await fetchTransactions()
}

onMounted(() => {
  accountsStore.fetchAccounts()
  fetchTransactions()
})

watch([periodMode, year, month, anchorDate, rangeFrom, rangeTo, statusFilter, accountFilter], fetchTransactions)
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Transações" description="Visualize e gerencie todas as suas transações financeiras">
      <template #actions>
        <BaseButton variant="secondary" @click="importModalOpen = true">
          <Upload :size="16" />
          Upload
        </BaseButton>
        <BaseButton @click="modalOpen = true">
          <Plus :size="16" />
          Adicionar Transação
        </BaseButton>
      </template>
    </PageHeader>

    <div class="rounded-2xl bg-surface p-4 ring-1 ring-slate-900/5">
      <div class="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div class="flex items-center gap-3">
          <select v-model="periodMode" class="form-control">
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
            <option value="range">Intervalo</option>
            <option value="year">Ano</option>
          </select>
        </div>

        <div class="flex items-center justify-center gap-3">
          <template v-if="periodMode === 'range'">
            <input v-model="rangeFrom" type="date" class="form-control" />
            <span class="text-slate-400">até</span>
            <input v-model="rangeTo" type="date" class="form-control" />
          </template>
          <template v-else>
            <button class="rounded-full p-2 text-slate-500 hover:bg-slate-100" @click="shiftPeriod(-1)"><ChevronLeft :size="16" /></button>
            <span class="min-w-48 text-center text-base font-medium text-slate-800">{{ periodLabel }}</span>
            <button class="rounded-full p-2 text-slate-500 hover:bg-slate-100" @click="shiftPeriod(1)"><ChevronRight :size="16" /></button>
          </template>
        </div>

        <div class="flex items-center justify-start gap-3 md:justify-end">
          <select v-model="accountFilter" class="form-control">
            <option value="">Todas as contas</option>
            <option v-for="acc in accountsStore.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
          </select>
          <select v-model="statusFilter" class="form-control">
            <option value="all">Todos os status</option>
            <option value="pending">Previstos</option>
            <option value="confirmed">Confirmados</option>
          </select>
        </div>
      </div>
    </div>

    <div class="rounded-2xl bg-surface p-2 ring-1 ring-slate-900/5">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
            <th class="px-4 py-3 font-medium">Data</th>
            <th class="px-4 py-3 font-medium">Descrição</th>
            <th class="px-4 py-3 font-medium">Categoria</th>
            <th class="px-4 py-3 font-medium">Conta</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 text-right font-medium">Valor</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && transactions.length === 0">
            <td colspan="7" class="py-10 text-center text-slate-400">Nenhum lançamento neste período.</td>
          </tr>
          <tr v-for="t in transactions" :key="t.id" class="border-b border-slate-50 last:border-0">
            <td class="px-4 py-3 text-slate-500">{{ formatDate(t.competenceDate) }}</td>
            <td class="px-4 py-3 font-medium text-slate-700">
              <span class="inline-flex items-center gap-1.5">
                {{ t.description }}
                <Repeat v-if="t.recurrenceRuleId" :size="12" class="text-slate-400" />
              </span>
              <span v-if="t.installmentTotal" class="ml-1 text-xs text-slate-400">({{ t.installmentNumber }}/{{ t.installmentTotal }})</span>
              <span v-if="t.creditCard" class="ml-1 text-xs text-slate-400">· {{ t.creditCard.name }}</span>
            </td>
            <td class="px-4 py-3 text-slate-500">{{ t.category?.name || '—' }}</td>
            <td class="px-4 py-3 text-slate-500">{{ t.account?.name }}<span v-if="t.destinationAccount"> → {{ t.destinationAccount.name }}</span></td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="t.status === 'confirmed' ? 'bg-income-500/10 text-income-600' : 'bg-slate-200 text-slate-500'"
              >
                {{ t.status === 'confirmed' ? 'Confirmado' : 'Previsto' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right font-semibold tabular-nums" :class="signedAmount(t) < 0 ? 'text-expense-600' : 'text-income-600'">
              {{ formatCurrency(signedAmount(t)) }}
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  v-if="t.status === 'pending'"
                  class="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-accent-100 hover:text-accent-700"
                  @click="confirmTransaction(t)"
                >
                  Confirmar
                </button>
                <button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Editar" @click="editingTransaction = t">
                  <Pencil :size="14" />
                </button>
                <button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-expense-600" title="Excluir" @click="deleteTarget = t">
                  <Trash2 :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <TransactionFormModal :open="modalOpen" @close="modalOpen = false" @created="fetchTransactions" />
    <EditTransactionModal :transaction="editingTransaction" @close="editingTransaction = null" @saved="fetchTransactions" />
    <ImportTransactionsModal :open="importModalOpen" @close="importModalOpen = false" @imported="fetchTransactions" />
    <ConfirmDialog
      :open="!!deleteTarget"
      title="Excluir lançamento"
      :message="`Tem certeza que deseja excluir '${deleteTarget?.description}'?`"
      :actions="deleteActions"
      @close="deleteTarget = null"
      @choose="performDelete"
    />
  </div>
</template>
