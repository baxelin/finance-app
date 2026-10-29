import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../lib/api'

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref([])
  const loading = ref(false)

  async function fetchAccounts() {
    loading.value = true
    try {
      const { data } = await api.get('/accounts')
      accounts.value = data
    } finally {
      loading.value = false
    }
  }

  return { accounts, loading, fetchAccounts }
})
