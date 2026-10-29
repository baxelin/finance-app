<script setup>
import { ref, computed, watch } from 'vue'
import Modal from './ui/Modal.vue'
import BaseButton from './ui/BaseButton.vue'
import { useAccountsStore } from '../stores/accounts'
import { useCategoriesStore } from '../stores/categories'
import { useCardsStore } from '../stores/cards'
import { todayIso } from '../lib/dateUtils'
import api from '../lib/api'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'created'])

const accountsStore = useAccountsStore()
const categoriesStore = useCategoriesStore()
const cardsStore = useCardsStore()

const FREQUENCIES = [
  { value: 'daily', label: 'Diária' },
  { value: 'every_4_days', label: 'A cada 4 dias' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
]

function emptyForm() {
  return {
    type: 'expense',
    description: '',
    amount: '',
    date: todayIso(),
    accountId: '',
    categoryId: '',
    destinationAccountId: '',
    isThirdPartyTransfer: false,
    isCard: false,
    creditCardId: '',
    installmentEnabled: false,
    installmentMode: 'total',
    installments: 2,
    totalAmount: '',
    perInstallmentAmount: '',
    installmentEndMonth: '',
    recurrenceEnabled: false,
    recurrenceFrequency: 'monthly',
    recurrenceEndDate: '',
    recurrenceAutoConfirm: false,
  }
}

const form = ref(emptyForm())
const submitting = ref(false)
const error = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      form.value = emptyForm()
      error.value = ''
      if (accountsStore.accounts.length === 0) accountsStore.fetchAccounts()
      if (categoriesStore.categories.length === 0) categoriesStore.fetchCategories()
      if (cardsStore.cards.length === 0) cardsStore.fetchCards()
    }
  }
)

watch(
  () => form.value.type,
  () => {
    form.value.categoryId = ''
    form.value.isCard = false
    form.value.recurrenceEnabled = false
  }
)

const categoryOptions = computed(() =>
  categoriesStore.categories.filter((c) => c.type === form.value.type)
)

const cardOptions = computed(() => cardsStore.cards)

const canRecur = computed(() => form.value.type === 'income' || form.value.type === 'expense')

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    const payload = {
      type: form.value.type,
      description: form.value.description,
      date: form.value.date,
      accountId: form.value.accountId,
    }

    if (form.value.type === 'transfer') {
      payload.amount = Number(form.value.amount)
      if (!form.value.isThirdPartyTransfer) {
        payload.destinationAccountId = form.value.destinationAccountId
      }
    } else {
      payload.categoryId = form.value.categoryId || null

      if (form.value.type === 'expense' && form.value.isCard) {
        payload.creditCardId = form.value.creditCardId

        if (form.value.installmentEnabled) {
          if (form.value.installmentMode === 'total') {
            payload.installment = {
              mode: 'total',
              totalAmount: Number(form.value.totalAmount),
              installments: Number(form.value.installments),
            }
          } else {
            const [year, month] = form.value.installmentEndMonth.split('-').map(Number)
            payload.installment = {
              mode: 'perInstallment',
              perInstallmentAmount: Number(form.value.perInstallmentAmount),
              endMonth: { year, month },
            }
          }
        } else {
          payload.amount = Number(form.value.amount)
        }
      } else {
        payload.amount = Number(form.value.amount)
        if (canRecur.value && form.value.recurrenceEnabled) {
          payload.recurrence = {
            frequency: form.value.recurrenceFrequency,
            endDate: form.value.recurrenceEndDate || null,
            autoConfirm: form.value.recurrenceAutoConfirm,
          }
        }
      }
    }

    await api.post('/transactions', payload)
    emit('created')
    emit('close')
  } catch (err) {
    error.value = err.response?.data?.error || 'Erro ao salvar lançamento'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Modal :open="open" title="Novo lançamento" @close="$emit('close')">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          v-for="t in [{ v: 'expense', l: 'Despesa' }, { v: 'income', l: 'Receita' }, { v: 'transfer', l: 'Transferência' }]"
          :key="t.v"
          type="button"
          class="rounded-lg py-2 text-sm font-medium transition-colors"
          :class="form.type === t.v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="form.type = t.v"
        >
          {{ t.l }}
        </button>
      </div>

      <div>
        <label class="form-label">Descrição</label>
        <input v-model="form.description" required class="form-control w-full" />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="form-label">Data</label>
          <input v-model="form.date" type="date" required class="form-control w-full" />
        </div>
        <div v-if="!(form.type === 'expense' && form.isCard && form.installmentEnabled)">
          <label class="form-label">Valor (R$)</label>
          <input v-model="form.amount" type="number" step="0.01" min="0" required class="form-control w-full" />
        </div>
      </div>

      <div v-if="form.type !== 'transfer'">
        <label class="form-label">Categoria</label>
        <select v-model="form.categoryId" class="form-control w-full">
          <option value="">Selecione</option>
          <optgroup v-for="parent in categoryOptions" :key="parent.id" :label="parent.name">
            <option :value="parent.id">{{ parent.name }}</option>
            <option v-for="child in parent.children" :key="child.id" :value="child.id">— {{ child.name }}</option>
          </optgroup>
        </select>
      </div>

      <div>
        <label class="form-label">{{ form.type === 'transfer' ? 'Conta de origem' : 'Conta' }}</label>
        <select v-model="form.accountId" required class="form-control w-full">
          <option value="">Selecione</option>
          <option v-for="acc in accountsStore.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
        </select>
      </div>

      <template v-if="form.type === 'transfer'">
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input v-model="form.isThirdPartyTransfer" type="checkbox" class="rounded border-slate-300" />
          Transferência para terceiro (sem conta no sistema)
        </label>
        <div v-if="!form.isThirdPartyTransfer">
          <label class="form-label">Conta de destino</label>
          <select v-model="form.destinationAccountId" required class="form-control w-full">
            <option value="">Selecione</option>
            <option
              v-for="acc in accountsStore.accounts.filter((a) => a.id !== form.accountId)"
              :key="acc.id"
              :value="acc.id"
            >
              {{ acc.name }}
            </option>
          </select>
        </div>
      </template>

      <template v-if="form.type === 'expense'">
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input v-model="form.isCard" type="checkbox" class="rounded border-slate-300" />
          Gasto no cartão de crédito
        </label>

        <div v-if="form.isCard" class="flex flex-col gap-4 rounded-xl bg-slate-50 p-4">
          <div>
            <label class="form-label">Cartão</label>
            <select v-model="form.creditCardId" required class="form-control w-full">
              <option value="">Selecione</option>
              <option v-for="card in cardOptions" :key="card.id" :value="card.id">{{ card.name }}</option>
            </select>
          </div>

          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input v-model="form.installmentEnabled" type="checkbox" class="rounded border-slate-300" />
            Parcelado
          </label>

          <div v-if="form.installmentEnabled" class="flex flex-col gap-3">
            <div class="grid grid-cols-2 gap-2 rounded-lg bg-white p-1">
              <button type="button" class="rounded-md py-1.5 text-xs font-medium" :class="form.installmentMode === 'total' ? 'bg-accent-100 text-accent-700' : 'text-slate-500'" @click="form.installmentMode = 'total'">Valor total + parcelas</button>
              <button type="button" class="rounded-md py-1.5 text-xs font-medium" :class="form.installmentMode === 'perInstallment' ? 'bg-accent-100 text-accent-700' : 'text-slate-500'" @click="form.installmentMode = 'perInstallment'">Valor da parcela + mês final</button>
            </div>

            <div v-if="form.installmentMode === 'total'" class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Valor total (R$)</label>
                <input v-model="form.totalAmount" type="number" step="0.01" min="0" required class="form-control w-full" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Nº de parcelas</label>
                <input v-model="form.installments" type="number" min="2" required class="form-control w-full" />
              </div>
            </div>
            <div v-else class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Valor da parcela (R$)</label>
                <input v-model="form.perInstallmentAmount" type="number" step="0.01" min="0" required class="form-control w-full" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Mês final</label>
                <input v-model="form.installmentEndMonth" type="month" required class="form-control w-full" />
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-if="canRecur && !(form.type === 'expense' && form.isCard)">
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input v-model="form.recurrenceEnabled" type="checkbox" class="rounded border-slate-300" />
          Lançamento recorrente
        </label>

        <div v-if="form.recurrenceEnabled" class="flex flex-col gap-3 rounded-xl bg-slate-50 p-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Frequência</label>
            <select v-model="form.recurrenceFrequency" class="form-control w-full">
              <option v-for="f in FREQUENCIES" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Data final (opcional)</label>
            <input v-model="form.recurrenceEndDate" type="date" class="form-control w-full" />
          </div>
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input v-model="form.recurrenceAutoConfirm" type="checkbox" class="rounded border-slate-300" />
            Confirmar automaticamente (ex: salário certo)
          </label>
        </div>
      </template>

      <p v-if="error" class="text-sm text-expense-600">{{ error }}</p>

      <div class="mt-2 flex justify-end gap-3">
        <BaseButton variant="ghost" type="button" @click="$emit('close')">Cancelar</BaseButton>
        <BaseButton variant="primary" type="submit" :disabled="submitting">{{ submitting ? 'Salvando…' : 'Salvar' }}</BaseButton>
      </div>
    </form>
  </Modal>
</template>
