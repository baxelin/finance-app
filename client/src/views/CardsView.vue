<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Plus } from '@lucide/vue'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import IconAvatar from '../components/ui/IconAvatar.vue'
import ItemActionsMenu from '../components/ui/ItemActionsMenu.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import CardFormModal from '../components/CardFormModal.vue'
import { colorForKey } from '../lib/icons'
import { useCardsStore } from '../stores/cards'

const cardsStore = useCardsStore()
const loaded = ref(false)

const modalOpen = ref(false)
const editingCard = ref(null)
const deleteTarget = ref(null)

function openCreate() {
  editingCard.value = null
  modalOpen.value = true
}

function openEdit(card) {
  editingCard.value = card
  modalOpen.value = true
}

async function handleSubmit(payload) {
  if (editingCard.value) {
    await cardsStore.updateCard(editingCard.value.id, payload)
  } else {
    await cardsStore.createCard(payload)
  }
  modalOpen.value = false
}

async function performDelete() {
  try {
    await cardsStore.deleteCard(deleteTarget.value.id)
  } catch (err) {
    alert(err.response?.data?.error || 'Não foi possível excluir este cartão.')
  } finally {
    deleteTarget.value = null
  }
}

onMounted(async () => {
  await cardsStore.fetchCards()
  loaded.value = true
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Cartões de crédito" description="Gerencie seus cartões e acompanhe as faturas">
      <template #actions>
        <BaseButton @click="openCreate">
          <Plus :size="16" />
          Adicionar Cartão
        </BaseButton>
      </template>
    </PageHeader>

    <div v-if="loaded && cardsStore.cards.length === 0" class="text-slate-400">Nenhum cartão cadastrado ainda.</div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink v-for="card in cardsStore.cards" :key="card.id" :to="`/cartoes/${card.id}`">
        <div class="group relative rounded-2xl bg-surface p-5 ring-1 ring-slate-900/5 transition-shadow hover:shadow-md">
          <ItemActionsMenu @edit="openEdit(card)" @delete="deleteTarget = card" />

          <div class="flex items-center gap-3">
            <IconAvatar icon="card" :color="colorForKey(card.name)" />
            <div class="min-w-0">
              <p class="truncate text-base font-semibold text-slate-800">{{ card.name }}</p>
              <p class="text-xs text-slate-500">{{ card.account?.name }}</p>
            </div>
          </div>
          <p class="mt-4 text-xs text-slate-400">Fecha dia {{ card.closingDay }} · Vence dia {{ card.dueDay }}</p>
        </div>
      </RouterLink>
    </div>

    <CardFormModal :open="modalOpen" :editing="editingCard" @close="modalOpen = false" @submit="handleSubmit" />

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Excluir cartão"
      :message="`Tem certeza que deseja excluir '${deleteTarget?.name}'?`"
      @close="deleteTarget = null"
      @choose="performDelete"
    />
  </div>
</template>
