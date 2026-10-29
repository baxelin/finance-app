import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: 'Dashboard' },
  },
  {
    path: '/lancamentos',
    name: 'transactions',
    component: () => import('../views/TransactionsView.vue'),
    meta: { title: 'Transações' },
  },
  {
    path: '/recorrentes',
    name: 'recurring',
    component: () => import('../views/RecurringView.vue'),
    meta: { title: 'Recorrentes' },
  },
  {
    path: '/contas',
    name: 'accounts',
    component: () => import('../views/AccountsView.vue'),
    meta: { title: 'Contas' },
  },
  {
    path: '/cartoes',
    name: 'cards',
    component: () => import('../views/CardsView.vue'),
    meta: { title: 'Cartões' },
  },
  {
    path: '/cartoes/:id',
    name: 'card-detail',
    component: () => import('../views/CardDetailView.vue'),
    props: true,
    meta: { title: 'Cartões' },
  },
  {
    path: '/categorias',
    name: 'categories',
    component: () => import('../views/CategoriesView.vue'),
    meta: { title: 'Categorias' },
  },
  {
    path: '/investimentos',
    name: 'investments',
    component: () => import('../views/InvestmentsView.vue'),
    meta: { title: 'Investimentos' },
  },
  {
    path: '/investimentos/:id',
    name: 'investment-detail',
    component: () => import('../views/InvestmentDetailView.vue'),
    props: true,
    meta: { title: 'Investimentos' },
  },
  {
    path: '/configuracoes',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: 'Configurações' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
