<script setup>
import { computed, onMounted, ref } from 'vue'
import { Plus } from '@lucide/vue'
import PageHeader from '../components/ui/PageHeader.vue'
import TabPills from '../components/ui/TabPills.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import CategoryFormModal from '../components/CategoryFormModal.vue'
import CategoryTile from '../components/CategoryTile.vue'
import { useCategoriesStore } from '../stores/categories'

const categoriesStore = useCategoriesStore()
const tab = ref('categories')

const subcategories = computed(() =>
  categoriesStore.categories.flatMap((parent) => (parent.children || []).map((child) => ({ ...child, parentName: parent.name })))
)

const tabs = computed(() => [
  { value: 'categories', label: 'Categorias', count: categoriesStore.categories.length },
  { value: 'subcategories', label: 'Subcategorias', count: subcategories.value.length },
])

const modalOpen = ref(false)
const editingCategory = ref(null)
const modalForcedParentId = ref(undefined)
const deleteTarget = ref(null)

function openCreate() {
  editingCategory.value = null
  modalForcedParentId.value = tab.value === 'subcategories' ? (subcategories.value[0]?.parentId ?? null) : undefined
  modalOpen.value = true
}

function openEdit(category) {
  editingCategory.value = category
  modalForcedParentId.value = category.parentId ?? undefined
  modalOpen.value = true
}

async function handleSubmit(payload) {
  if (editingCategory.value) {
    await categoriesStore.updateCategory(editingCategory.value.id, payload)
  } else {
    await categoriesStore.createCategory(payload)
  }
  modalOpen.value = false
}

async function performDelete() {
  try {
    await categoriesStore.deleteCategory(deleteTarget.value.id)
  } catch (err) {
    alert(err.response?.data?.error || 'Não foi possível excluir esta categoria.')
  } finally {
    deleteTarget.value = null
  }
}

const TYPE_BADGES = {
  default: { label: 'Padrão', classes: 'bg-slate-100 text-slate-500' },
  income: { label: 'Receita', classes: 'bg-income-500/10 text-income-600' },
  expense: { label: 'Despesa', classes: 'bg-expense-500/10 text-expense-600' },
}

function badgeFor(category) {
  return category.isDefault ? TYPE_BADGES.default : TYPE_BADGES[category.type]
}

onMounted(() => categoriesStore.fetchCategories())
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Categorias" description="Gerencie suas categorias de receitas e despesas">
      <template #actions>
        <BaseButton @click="openCreate">
          <Plus :size="16" />
          Adicionar Categoria
        </BaseButton>
      </template>
    </PageHeader>

    <TabPills v-model="tab" :tabs="tabs" />

    <div v-if="tab === 'categories'" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <CategoryTile v-for="cat in categoriesStore.categories" :key="cat.id" :category="cat" @edit="openEdit(cat)" @delete="deleteTarget = cat">
        <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="badgeFor(cat).classes">{{ badgeFor(cat).label }}</span>
      </CategoryTile>
    </div>

    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <CategoryTile v-for="cat in subcategories" :key="cat.id" :category="cat" @edit="openEdit(cat)" @delete="deleteTarget = cat">
        <span class="text-[11px] text-slate-400">{{ cat.parentName }}</span>
      </CategoryTile>
      <p v-if="subcategories.length === 0" class="col-span-full py-10 text-center text-sm text-slate-400">Nenhuma subcategoria cadastrada.</p>
    </div>

    <CategoryFormModal
      :open="modalOpen"
      :editing="editingCategory"
      :parent-options="categoriesStore.categories"
      :forced-parent-id="modalForcedParentId"
      @close="modalOpen = false"
      @submit="handleSubmit"
    />

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Excluir categoria"
      :message="`Tem certeza que deseja excluir '${deleteTarget?.name}'?`"
      @close="deleteTarget = null"
      @choose="performDelete"
    />
  </div>
</template>
