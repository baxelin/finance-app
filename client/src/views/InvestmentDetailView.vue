<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../lib/format'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import Modal from '../components/ui/Modal.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()

const investment = ref(null)
const modalOpen = ref(false)
const deleteOpen = ref(false)
const newValue = ref('')
const submitting = ref(false)

async function fetchInvestment() {
  const { data } = await api.get(`/investments/${props.id}`)
  investment.value = data
}

async function submit() {
  submitting.value = true
  try {
    await api.post(`/investments/${props.id}/entries`, { value: Number(newValue.value) })
    newValue.value = ''
    modalOpen.value = false
    await fetchInvestment()
  } finally {
    submitting.value = false
  }
}

async function deleteInvestment() {
  await api.delete(`/investments/${props.id}`)
  router.push('/investimentos')
}

const chartData = computed(() => {
  if (!investment.value) return { labels: [], datasets: [] }
  return {
    labels: investment.value.entries.map((e) => formatDate(e.date)),
    datasets: [
      {
        label: 'Valor',
        data: investment.value.entries.map((e) => e.value),
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        tension: 0.3,
      },
    ],
  }
})

const chartOptions = { responsive: true, plugins: { legend: { display: false } } }

onMounted(fetchInvestment)
</script>

<template>
  <div v-if="investment" class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">{{ investment.name }}</h1>
        <p class="text-sm text-slate-500">{{ investment.account?.name }}</p>
      </div>
      <div class="flex gap-3">
        <BaseButton variant="ghost" @click="deleteOpen = true">Excluir</BaseButton>
        <BaseButton @click="modalOpen = true">Atualizar valor</BaseButton>
      </div>
    </div>

    <BaseCard title="Valor atual">
      <p class="text-3xl font-semibold tabular-nums text-slate-800">{{ formatCurrency(investment.currentValue) }}</p>
    </BaseCard>

    <BaseCard title="Evolução">
      <Line v-if="investment.entries.length > 1" :data="chartData" :options="chartOptions" />
      <p v-else class="py-10 text-center text-sm text-slate-400">Registre mais valores para ver a evolução.</p>
    </BaseCard>

    <Modal :open="modalOpen" title="Atualizar valor" @close="modalOpen = false">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div>
          <label class="form-label">Novo valor (R$)</label>
          <input v-model="newValue" type="number" step="0.01" min="0" required class="form-control w-full" />
        </div>
        <div class="mt-2 flex justify-end gap-3">
          <BaseButton variant="ghost" type="button" @click="modalOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" :disabled="submitting">Salvar</BaseButton>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      :open="deleteOpen"
      title="Excluir investimento"
      :message="`Tem certeza que deseja excluir '${investment.name}'? Todo o histórico será perdido.`"
      :actions="[{ label: 'Excluir', value: 'confirm', variant: 'danger' }]"
      @close="deleteOpen = false"
      @choose="deleteInvestment"
    />
  </div>
</template>
