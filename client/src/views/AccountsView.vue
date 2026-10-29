<script setup>
import { computed, onMounted } from 'vue'
import { Wallet } from '@lucide/vue'
import PageHeader from '../components/ui/PageHeader.vue'
import StatCard from '../components/ui/StatCard.vue'
import AccountAvatar from '../components/ui/AccountAvatar.vue'
import { formatCurrency } from '../lib/format'
import { useAccountsStore } from '../stores/accounts'

const accountsStore = useAccountsStore()

const totalBalance = computed(() => accountsStore.accounts.reduce((sum, a) => sum + (a.balance || 0), 0))

onMounted(() => accountsStore.fetchAccounts())
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Minhas Contas" description="Veja o saldo de cada conta e o saldo consolidado do casal" />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatCard label="Saldo total" :icon="Wallet" :value="formatCurrency(totalBalance)" />
      <StatCard label="Contas cadastradas" :value="accountsStore.accounts.length" />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="acc in accountsStore.accounts" :key="acc.id" class="rounded-2xl bg-surface p-5 ring-1 ring-slate-900/5">
        <div class="flex items-center gap-3">
          <AccountAvatar :account="acc" />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-slate-800">{{ acc.name }}</p>
            <p class="text-xs text-slate-400">{{ acc.type === 'joint' ? 'Conta conjunta' : 'Conta pessoal' }}</p>
          </div>
        </div>
        <p class="mt-4 text-2xl font-semibold tabular-nums" :class="acc.balance < 0 ? 'text-expense-600' : 'text-slate-900'">
          {{ formatCurrency(acc.balance) }}
        </p>
        <p class="mt-1 text-xs text-slate-400">Previsto no mês: {{ formatCurrency(acc.projectedMonthBalance) }}</p>
      </div>
    </div>
  </div>
</template>
