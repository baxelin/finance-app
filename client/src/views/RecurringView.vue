<script setup>
import { computed, onMounted, ref } from 'vue'
import { DollarSign, Calendar, RefreshCw, Layers } from '@lucide/vue'
import PageHeader from '../components/ui/PageHeader.vue'
import TabPills from '../components/ui/TabPills.vue'
import StatCard from '../components/ui/StatCard.vue'
import { formatCurrency, formatDate } from '../lib/format'
import api from '../lib/api'

const tab = ref('recurring')
const rules = ref([])
const installmentGroups = ref([])
const loading = ref(false)

async function fetchAll() {
  loading.value = true
  try {
    const [rulesRes, installmentsRes] = await Promise.all([api.get('/recurring/rules'), api.get('/recurring/installments')])
    rules.value = rulesRes.data
    installmentGroups.value = installmentsRes.data
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

const activeExpenseRules = computed(() => rules.value.filter((r) => r.isActive && r.type === 'expense'))

const tabs = computed(() => [
  { value: 'recurring', label: 'Recorrentes', count: rules.value.length, icon: RefreshCw },
  { value: 'installments', label: 'Parceladas', count: installmentGroups.value.length, icon: Layers },
])

const totalMonthly = computed(() => activeExpenseRules.value.reduce((sum, r) => sum + r.monthlyAmount, 0))
const averageMonthly = computed(() => (activeExpenseRules.value.length ? totalMonthly.value / activeExpenseRules.value.length : 0))
const totalYearly = computed(() => totalMonthly.value * 12)

const openInstallments = computed(() => installmentGroups.value.filter((g) => g.nextDueDate))
const totalRemaining = computed(() => openInstallments.value.reduce((sum, g) => sum + g.totalAmount, 0))
const averageInstallment = computed(() => (openInstallments.value.length ? totalRemaining.value / openInstallments.value.length : 0))

const FREQUENCY_LABELS = {
  daily: 'Diária',
  every_4_days: 'A cada 4 dias',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Recorrentes/Parceladas" description="Acompanhe assinaturas, contas recorrentes e compras parceladas" />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <template v-if="tab === 'recurring'">
        <StatCard label="Total mensal" :icon="DollarSign" :value="formatCurrency(totalMonthly)" />
        <StatCard label="Média por assinatura" :icon="Calendar" :value="formatCurrency(averageMonthly)" />
        <StatCard label="Total por ano" :icon="Calendar" :value="formatCurrency(totalYearly)" />
      </template>
      <template v-else>
        <StatCard label="Total em aberto" :icon="DollarSign" :value="formatCurrency(totalRemaining)" />
        <StatCard label="Média por compra" :icon="Layers" :value="formatCurrency(averageInstallment)" />
        <StatCard label="Compras parceladas" :icon="Layers" :value="installmentGroups.length" />
      </template>
    </div>

    <TabPills v-model="tab" :tabs="tabs" />

    <div class="rounded-2xl bg-surface p-2 ring-1 ring-slate-900/5">
      <table v-if="tab === 'recurring'" class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
            <th class="px-4 py-3 font-medium">Próxima data</th>
            <th class="px-4 py-3 font-medium">Descrição</th>
            <th class="px-4 py-3 font-medium">Frequência</th>
            <th class="px-4 py-3 font-medium">Categoria</th>
            <th class="px-4 py-3 font-medium">Conta</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 text-right font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && rules.length === 0">
            <td colspan="7" class="py-10 text-center text-slate-400">Nenhum lançamento recorrente cadastrado.</td>
          </tr>
          <tr v-for="r in rules" :key="r.id" class="border-b border-slate-50 last:border-0">
            <td class="px-4 py-3 text-slate-500">{{ r.nextOccurrence ? formatDate(r.nextOccurrence) : '—' }}</td>
            <td class="px-4 py-3 font-medium text-slate-700">{{ r.description }}</td>
            <td class="px-4 py-3 text-slate-500">{{ FREQUENCY_LABELS[r.frequency] || r.frequency }}</td>
            <td class="px-4 py-3 text-slate-500">{{ r.category?.name || '—' }}</td>
            <td class="px-4 py-3 text-slate-500">{{ r.account?.name }}</td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="r.isActive ? 'bg-income-500/10 text-income-600' : 'bg-slate-200 text-slate-500'"
              >
                {{ r.isActive ? 'Ativa' : 'Encerrada' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right font-semibold tabular-nums" :class="r.type === 'expense' ? 'text-expense-600' : 'text-income-600'">
              {{ formatCurrency(r.amount) }}
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
            <th class="px-4 py-3 font-medium">Próxima parcela</th>
            <th class="px-4 py-3 font-medium">Descrição</th>
            <th class="px-4 py-3 font-medium">Categoria</th>
            <th class="px-4 py-3 font-medium">Cartão/Conta</th>
            <th class="px-4 py-3 font-medium">Progresso</th>
            <th class="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && installmentGroups.length === 0">
            <td colspan="6" class="py-10 text-center text-slate-400">Nenhuma compra parcelada encontrada.</td>
          </tr>
          <tr v-for="g in installmentGroups" :key="g.installmentGroupId" class="border-b border-slate-50 last:border-0">
            <td class="px-4 py-3 text-slate-500">{{ g.nextDueDate ? formatDate(g.nextDueDate) : '—' }}</td>
            <td class="px-4 py-3 font-medium text-slate-700">{{ g.description }}</td>
            <td class="px-4 py-3 text-slate-500">{{ g.category?.name || '—' }}</td>
            <td class="px-4 py-3 text-slate-500">{{ g.creditCard?.name || g.account?.name }}</td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="g.paidCount >= g.installmentTotal ? 'bg-income-500/10 text-income-600' : 'bg-slate-200 text-slate-500'"
              >
                {{ g.paidCount }}/{{ g.installmentTotal }}
              </span>
            </td>
            <td class="px-4 py-3 text-right font-semibold tabular-nums text-expense-600">{{ formatCurrency(g.totalAmount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
