<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../lib/api'
import { formatCurrency, formatDate, formatMonthLabel } from '../lib/format'
import { yearMonthOf } from '../lib/dateUtils'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { useCardsStore } from '../stores/cards'

const props = defineProps({ id: { type: String, required: true } })

const cardsStore = useCardsStore()
const invoices = ref([])
const selectedInvoice = ref(null)
const purchases = ref([])
const loading = ref(true)

const card = computed(() => cardsStore.cards.find((c) => c.id === Number(props.id)))

async function fetchInvoices() {
  const { data } = await api.get(`/cards/${props.id}/invoices`)
  invoices.value = data
}

function invoicePath(invoice) {
  const { year, month } = yearMonthOf(invoice.competenceDate)
  return `/cards/${props.id}/invoices/${year}/${month}`
}

function invoiceLabel(invoice) {
  const { year, month } = yearMonthOf(invoice.competenceDate)
  return formatMonthLabel(year, month)
}

async function selectInvoice(invoice) {
  selectedInvoice.value = invoice
  const { data } = await api.get(invoicePath(invoice))
  purchases.value = data
}

async function confirmInvoice(invoice) {
  await api.post(`${invoicePath(invoice)}/confirm`)
  await fetchInvoices()
  if (selectedInvoice.value === invoice) await selectInvoice(invoice)
}

onMounted(async () => {
  if (cardsStore.cards.length === 0) await cardsStore.fetchCards()
  await fetchInvoices()
  if (invoices.value.length) await selectInvoice(invoices.value[0])
  loading.value = false
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold text-slate-800">{{ card?.name || 'Cartão' }}</h1>

    <div class="grid grid-cols-3 gap-6">
      <BaseCard title="Faturas" class="col-span-1">
        <div class="flex flex-col gap-2">
          <button
            v-for="inv in invoices"
            :key="inv.key"
            class="flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
            :class="selectedInvoice === inv ? 'bg-accent-50 text-accent-700' : 'hover:bg-slate-100'"
            @click="selectInvoice(inv)"
          >
            <span>{{ invoiceLabel(inv) }}</span>
            <span class="flex items-center gap-2">
              <span class="font-medium">{{ formatCurrency(inv.total) }}</span>
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="inv.status === 'confirmed' ? 'bg-income-500/10 text-income-600' : 'bg-slate-200 text-slate-500'"
              >
                {{ inv.status === 'confirmed' ? 'Paga' : 'Aberta' }}
              </span>
            </span>
          </button>
          <p v-if="!loading && invoices.length === 0" class="py-6 text-center text-sm text-slate-400">
            Nenhuma compra registrada neste cartão.
          </p>
        </div>
      </BaseCard>

      <BaseCard title="Compras da fatura" class="col-span-2">
        <div v-if="selectedInvoice" class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-500">Vencimento {{ formatDate(selectedInvoice.competenceDate) }}</p>
            <p class="text-xl font-semibold text-slate-800">{{ formatCurrency(selectedInvoice.total) }}</p>
          </div>
          <BaseButton v-if="selectedInvoice.status === 'pending'" @click="confirmInvoice(selectedInvoice)">
            Confirmar pagamento
          </BaseButton>
        </div>

        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th class="pb-2 font-medium">Data</th>
              <th class="pb-2 font-medium">Descrição</th>
              <th class="pb-2 font-medium">Categoria</th>
              <th class="pb-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in purchases" :key="p.id" class="border-b border-slate-50 last:border-0">
              <td class="py-2 text-slate-500">{{ formatDate(p.date) }}</td>
              <td class="py-2 text-slate-700">
                {{ p.description }}
                <span v-if="p.installmentTotal" class="ml-1 text-xs text-slate-400">({{ p.installmentNumber }}/{{ p.installmentTotal }})</span>
              </td>
              <td class="py-2 text-slate-500">{{ p.category?.name || '—' }}</td>
              <td class="py-2 text-right font-medium text-slate-700">{{ formatCurrency(p.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </BaseCard>
    </div>
  </div>
</template>
