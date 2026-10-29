<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import {
  LayoutDashboard,
  ArrowLeftRight,
  RefreshCw,
  Landmark,
  CreditCard,
  Tag,
  TrendingUp,
  Settings,
  Bell,
  PanelLeft,
  ChevronDown,
} from '@lucide/vue'
import { useAccountsStore } from './stores/accounts'
import { useHousehold } from './composables/useHousehold'

const route = useRoute()
const accountsStore = useAccountsStore()
const { displayName: householdName, initials: householdInitials } = useHousehold()
const collapsed = ref(false)

const navGroups = [
  {
    label: 'Controle',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/lancamentos', label: 'Transações', icon: ArrowLeftRight },
      { to: '/recorrentes', label: 'Recorrentes', icon: RefreshCw },
      { to: '/contas', label: 'Contas', icon: Landmark },
      { to: '/cartoes', label: 'Cartões', icon: CreditCard },
    ],
  },
  {
    label: 'Organização',
    items: [
      { to: '/categorias', label: 'Categorias', icon: Tag },
      { to: '/investimentos', label: 'Investimentos', icon: TrendingUp },
      { to: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
]

const pageTitle = computed(() => route.meta?.title || 'FinApp')

onMounted(() => accountsStore.fetchAccounts())
</script>

<template>
  <div class="flex min-h-screen">
    <aside
      class="flex shrink-0 flex-col border-r border-slate-200 bg-surface py-6 transition-all duration-200"
      :class="collapsed ? 'w-0 overflow-hidden px-0 opacity-0' : 'w-64 px-4 opacity-100'"
    >
      <div class="mb-8 flex items-center gap-2.5 px-2">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-sm font-bold text-white">FA</span>
        <span class="text-lg font-semibold tracking-tight text-slate-900">FinApp</span>
      </div>

      <nav class="flex flex-1 flex-col gap-6 overflow-y-auto">
        <div v-for="group in navGroups" :key="group.label">
          <p class="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ group.label }}</p>
          <div class="flex flex-col gap-1">
            <RouterLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              active-class="!bg-ink-900 !text-white"
            >
              <component :is="item.icon" :size="18" />
              <span>{{ item.label }}</span>
            </RouterLink>
          </div>
        </div>
      </nav>

      <div class="mt-4 flex items-center gap-2.5 rounded-xl px-3 py-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">{{ householdInitials }}</span>
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-slate-800">{{ householdName }}</p>
          <p class="truncate text-xs text-slate-400">Finanças do casal</p>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex items-center justify-between border-b border-slate-200 bg-surface px-6 py-3.5">
        <div class="flex items-center gap-3">
          <button
            class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            title="Mostrar/ocultar menu"
            @click="collapsed = !collapsed"
          >
            <PanelLeft :size="18" />
          </button>
          <h2 class="text-sm font-medium text-slate-700">{{ pageTitle }}</h2>
        </div>

        <div class="flex items-center gap-1.5">
          <button class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800" title="Notificações">
            <Bell :size="18" />
          </button>
          <RouterLink to="/configuracoes" class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800" title="Configurações">
            <Settings :size="18" />
          </RouterLink>
          <div class="ml-2 flex items-center gap-2 rounded-xl py-1 pl-1 pr-2">
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700">{{ householdInitials }}</span>
            <span class="text-sm font-medium text-slate-700">{{ householdName }}</span>
            <ChevronDown :size="15" class="text-slate-400" />
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto bg-surface-muted px-8 py-7">
        <RouterView />
      </main>
    </div>
  </div>
</template>
