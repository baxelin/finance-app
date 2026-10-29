import { computed } from 'vue'
import { useAccountsStore } from '../stores/accounts'

export function useHousehold() {
  const accountsStore = useAccountsStore()

  const partnerNames = computed(() =>
    accountsStore.accounts.filter((account) => account.type === 'individual').map((account) => account.owner || account.name)
  )

  const displayName = computed(() => partnerNames.value.join(' & '))
  const initials = computed(() => partnerNames.value.map((name) => name.charAt(0).toUpperCase()).join(''))

  return { displayName, initials }
}
