import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../lib/api'

export const useCardsStore = defineStore('cards', () => {
  const cards = ref([])
  const loading = ref(false)

  async function fetchCards() {
    loading.value = true
    try {
      const { data } = await api.get('/cards')
      cards.value = data
    } finally {
      loading.value = false
    }
  }

  async function createCard(payload) {
    const { data } = await api.post('/cards', payload)
    await fetchCards()
    return data
  }

  async function updateCard(id, payload) {
    const { data } = await api.put(`/cards/${id}`, payload)
    await fetchCards()
    return data
  }

  async function deleteCard(id) {
    await api.delete(`/cards/${id}`)
    await fetchCards()
  }

  return { cards, loading, fetchCards, createCard, updateCard, deleteCard }
})
