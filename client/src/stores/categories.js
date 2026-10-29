import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../lib/api'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref([])
  const loading = ref(false)

  const flat = computed(() => categories.value.flatMap((c) => [c, ...(c.children || [])]))

  async function fetchCategories() {
    loading.value = true
    try {
      const { data } = await api.get('/categories')
      categories.value = data
    } finally {
      loading.value = false
    }
  }

  async function createCategory(payload) {
    const { data } = await api.post('/categories', payload)
    await fetchCategories()
    return data
  }

  async function updateCategory(id, payload) {
    const { data } = await api.put(`/categories/${id}`, payload)
    await fetchCategories()
    return data
  }

  async function deleteCategory(id) {
    await api.delete(`/categories/${id}`)
    await fetchCategories()
  }

  function byId(id) {
    return flat.value.find((c) => c.id === id)
  }

  return { categories, flat, loading, fetchCategories, createCategory, updateCategory, deleteCategory, byId }
})
