<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../lib/api'
import { formatCurrency } from '../lib/format'
import { Plus } from '@lucide/vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import Modal from '../components/ui/Modal.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import { useAccountsStore } from '../stores/accounts'

const accountsStore = useAccountsStore()
const investments = ref([])
const loading = ref(true)
const modalOpen = ref(false)
const form = ref({ name: '', accountId: '', currentValue: '' })
const submitting = ref(false)

async function fetchInvestments() {
  loading.value = true
  const { data } = await api.get('/investments')
  investments.value = data
  loading.value = false
}

async function submit() {
  submitting.value = true
  try {
    await api.post('/investments', {
      name: form.value.name,
      accountId: form.value.accountId,
      currentValue: Number(form.value.currentValue),
    })
    form.value = { name: '', accountId: '', currentValue: '' }
    modalOpen.value = false
    await fetchInvestments()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  accountsStore.fetchAccounts()
  fetchInvestments()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Investimentos" description="Acompanhe a evolução dos seus investimentos">
      <template #actions>
        <BaseButton @click="modalOpen = true">
          <Plus :size="16" />
          Adicionar Investimento
        </BaseButton>
      </template>
    </PageHeader>

    <div v-if="!loading && investments.length === 0" class="text-slate-400">Nenhum investimento cadastrado.</div>

    <div class="grid grid-cols-3 gap-6">
      <RouterLink v-for="inv in investments" :key="inv.id" :to="`/investimentos/${inv.id}`">
        <BaseCard class="transition-shadow hover:shadow-md">
          <p class="text-base font-semibold text-slate-800">{{ inv.name }}</p>
          <p class="mt-1 text-sm text-slate-500">{{ inv.account?.name }}</p>
          <p class="mt-3 text-xl font-semibold tabular-nums text-slate-800">{{ formatCurrency(inv.currentValue) }}</p>
        </BaseCard>
      </RouterLink>
    </div>

    <Modal :open="modalOpen" title="Novo investimento" @close="modalOpen = false">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div>
          <label class="form-label">Nome</label>
          <input v-model="form.name" required class="form-control w-full" />
        </div>
        <div>
          <label class="form-label">Conta</label>
          <select v-model="form.accountId" required class="form-control w-full">
            <option value="">Selecione</option>
            <option v-for="acc in accountsStore.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Valor atual (R$)</label>
          <input v-model="form.currentValue" type="number" step="0.01" min="0" required class="form-control w-full" />
        </div>
        <div class="mt-2 flex justify-end gap-3">
          <BaseButton variant="ghost" type="button" @click="modalOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" :disabled="submitting">Salvar</BaseButton>
        </div>
      </form>
    </Modal>
  </div>
</template>
