<script setup>
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import api from '../lib/api'
import { formatCurrency, formatMonthLabel } from '../lib/format'
import IconAvatar from '../components/ui/IconAvatar.vue'
import AccountAvatar from '../components/ui/AccountAvatar.vue'
import StatCard from '../components/ui/StatCard.vue'
import { shiftMonth } from '../lib/dateUtils'
import { colorForKey } from '../lib/icons'
import { useCardsStore } from '../stores/cards'
import { useHousehold } from '../composables/useHousehold'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, Filler)

const cardsStore = useCardsStore()
const { displayName: householdName } = useHousehold()

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

const summary = ref(null)
const cardInvoices = ref({})

async function fetchSummary() {
  const { data } = await api.get('/dashboard/summary', { params: { year: year.value, month: month.value } })
  summary.value = data
}

async function fetchCardInvoices() {
  await cardsStore.fetchCards()
  const entries = await Promise.all(
    cardsStore.cards.map(async (card) => {
      try {
        const { data } = await api.get(`/cards/${card.id}/invoices/${year.value}/${month.value}`)
        const total = data.reduce((sum, t) => sum + t.amount, 0)
        return [card.id, total]
      } catch {
        return [card.id, 0]
      }
    })
  )
  cardInvoices.value = Object.fromEntries(entries)
}

function showMonth(delta) {
  const shifted = shiftMonth({ year: year.value, month: month.value }, delta)
  year.value = shifted.year
  month.value = shifted.month
}

watch(
  [year, month],
  () => {
    fetchSummary()
    fetchCardInvoices()
  },
  { immediate: true }
)

const monthLabel = computed(() => formatMonthLabel(year.value, month.value))

const rhythmChartData = computed(() => {
  if (!summary.value) return { labels: [], datasets: [] }
  const days = summary.value.spendRhythm.current.length
  return {
    labels: Array.from({ length: days }, (_, i) => i + 1),
    datasets: [
      {
        label: 'Este mês',
        data: summary.value.spendRhythm.current,
        borderColor: '#18181b',
        backgroundColor: 'rgba(24,24,27,0.06)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Mês passado',
        data: summary.value.spendRhythm.previous,
        borderColor: '#cbd5e1',
        borderDash: [4, 4],
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }
})

const rhythmOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } },
  scales: {
    y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) } },
    x: { grid: { display: false } },
  },
}

const categoryPalette = ['#18181b', '#0ea5e9', '#16a34a', '#f97316', '#a855f7', '#db2777', '#14b8a6', '#eab308']
const categoryChartData = computed(() => {
  if (!summary.value) return { labels: [], datasets: [] }
  const entries = Object.entries(summary.value.expensesByCategory)
  return {
    labels: entries.map(([name]) => name),
    datasets: [
      {
        data: entries.map(([, value]) => value),
        backgroundColor: entries.map((_, i) => categoryPalette[i % categoryPalette.length]),
        borderWidth: 0,
      },
    ],
  }
})
const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } },
}
</script>

<template>
  <div v-if="summary" class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Olá, {{ householdName }}!</h1>
        <p class="mt-1 text-sm text-slate-500">Aqui está o resumo das suas finanças</p>
      </div>
      <div class="flex items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-900/5">
        <button class="rounded-xl p-2 text-slate-500 hover:bg-slate-100" @click="showMonth(-1)"><ChevronLeft :size="16" /></button>
        <span class="min-w-32 text-center text-sm font-medium text-slate-800">{{ monthLabel }}</span>
        <button class="rounded-xl p-2 text-slate-500 hover:bg-slate-100" @click="showMonth(1)"><ChevronRight :size="16" /></button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Saldo atual" :value="formatCurrency(summary.totalBalance)">
        <div class="mt-4 flex flex-col gap-1.5">
          <div v-for="acc in summary.accounts" :key="acc.id" class="flex items-center justify-between text-xs">
            <span class="text-slate-500">{{ acc.name }}</span>
            <span class="font-medium text-slate-700 tabular-nums">{{ formatCurrency(acc.balance) }}</span>
          </div>
        </div>
      </StatCard>

      <StatCard label="Receitas do mês" :value="formatCurrency(summary.totalIncomeThisMonth)" value-class="text-income-600">
        <p class="mt-4 text-xs text-slate-400">Saldo previsto: {{ formatCurrency(summary.totalProjectedMonthBalance) }}</p>
      </StatCard>

      <StatCard label="Despesas do mês" :value="formatCurrency(summary.totalExpenseThisMonth)" value-class="text-expense-600">
        <p class="mt-4 text-xs" :class="summary.expenseDeltaVsPrevMonth > 0 ? 'text-expense-600' : 'text-income-600'">
          {{ summary.expenseDeltaVsPrevMonth >= 0 ? '+' : '' }}{{ formatCurrency(summary.expenseDeltaVsPrevMonth) }} vs. mês anterior
        </p>
      </StatCard>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="rounded-2xl bg-surface p-5 ring-1 ring-slate-900/5 lg:col-span-2">
        <p class="mb-4 text-sm font-medium text-slate-500">Ritmo de gasto</p>
        <div class="h-64">
          <Line :data="rhythmChartData" :options="rhythmOptions" />
        </div>
      </div>

      <div class="rounded-2xl bg-surface p-5 ring-1 ring-slate-900/5">
        <p class="mb-2 text-sm font-medium text-slate-500">Gastos por categoria</p>
        <div v-if="categoryChartData.labels.length" class="h-64">
          <Doughnut :data="categoryChartData" :options="donutOptions" />
        </div>
        <p v-else class="py-16 text-center text-sm text-slate-400">Sem gastos registrados neste mês.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-2xl bg-surface p-5 ring-1 ring-slate-900/5">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-medium text-slate-500">Meus cartões</p>
          <RouterLink to="/cartoes" class="text-xs font-medium text-accent-600 hover:underline">Ver todos</RouterLink>
        </div>
        <div v-if="cardsStore.cards.length === 0" class="py-6 text-center text-sm text-slate-400">Nenhum cartão cadastrado.</div>
        <div v-else class="flex flex-col divide-y divide-slate-50">
          <RouterLink
            v-for="card in cardsStore.cards"
            :key="card.id"
            :to="`/cartoes/${card.id}`"
            class="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:opacity-80"
          >
            <div class="flex items-center gap-3">
              <IconAvatar icon="card" :color="colorForKey(card.name)" size="sm" />
              <div>
                <p class="text-sm font-medium text-slate-800">{{ card.name }}</p>
                <p class="text-xs text-slate-400">{{ card.account?.name }}</p>
              </div>
            </div>
            <span class="text-sm font-semibold tabular-nums text-slate-700">{{ formatCurrency(cardInvoices[card.id] || 0) }}</span>
          </RouterLink>
        </div>
      </div>

      <div class="rounded-2xl bg-surface p-5 ring-1 ring-slate-900/5">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-medium text-slate-500">Minhas contas</p>
          <RouterLink to="/contas" class="text-xs font-medium text-accent-600 hover:underline">Ver todas</RouterLink>
        </div>
        <div class="flex flex-col divide-y divide-slate-50">
          <div v-for="acc in summary.accounts" :key="acc.id" class="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div class="flex items-center gap-3">
              <AccountAvatar :account="acc" size="sm" />
              <p class="text-sm font-medium text-slate-800">{{ acc.name }}</p>
            </div>
            <span class="text-sm font-semibold tabular-nums text-slate-700">{{ formatCurrency(acc.balance) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="summary.budgetProgress.length" class="rounded-2xl bg-surface p-5 ring-1 ring-slate-900/5">
      <p class="mb-4 text-sm font-medium text-slate-500">Orçamentos</p>
      <div class="flex flex-col gap-4">
        <div v-for="b in summary.budgetProgress" :key="b.category">
          <div class="mb-1 flex items-center justify-between text-sm">
            <span class="text-slate-600">{{ b.category }}</span>
            <span class="text-slate-500">{{ formatCurrency(b.spent) }} / {{ formatCurrency(b.monthlyLimit) }}</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full rounded-full"
              :class="b.percentage > 100 ? 'bg-expense-500' : 'bg-ink-900'"
              :style="{ width: Math.min(b.percentage, 100) + '%' }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="py-20 text-center text-slate-400">Carregando…</div>
</template>
