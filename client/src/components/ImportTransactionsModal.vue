<script setup>
import { ref, computed, watch } from 'vue'
import { UploadCloud, FileText, X, AlertTriangle, Trash2, Loader2 } from '@lucide/vue'
import Modal from './ui/Modal.vue'
import BaseButton from './ui/BaseButton.vue'
import { useAccountsStore } from '../stores/accounts'
import { useCategoriesStore } from '../stores/categories'
import { formatDate } from '../lib/format'
import api from '../lib/api'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'imported'])

const accountsStore = useAccountsStore()
const categoriesStore = useCategoriesStore()

const step = ref('upload')
const uploadAccountId = ref('')
const files = ref([])
const dragging = ref(false)
const fileInput = ref(null)

const processing = ref(false)
const saving = ref(false)
const error = ref('')

const rows = ref([])

function resetState() {
  step.value = 'upload'
  uploadAccountId.value = ''
  files.value = []
  dragging.value = false
  processing.value = false
  saving.value = false
  error.value = ''
  rows.value = []
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    resetState()
    if (accountsStore.accounts.length === 0) accountsStore.fetchAccounts()
    if (categoriesStore.categories.length === 0) categoriesStore.fetchCategories()
  }
)

function addFiles(fileList) {
  const incoming = Array.from(fileList).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
  for (const f of incoming) {
    if (!files.value.some((existing) => existing.name === f.name && existing.size === f.size)) {
      files.value.push(f)
    }
  }
}

function handleDrop(e) {
  dragging.value = false
  addFiles(e.dataTransfer.files)
}

function handleFileSelect(e) {
  addFiles(e.target.files)
  e.target.value = ''
}

function removeFile(index) {
  files.value.splice(index, 1)
}

async function processFiles() {
  error.value = ''
  processing.value = true
  try {
    const formData = new FormData()
    formData.append('accountId', uploadAccountId.value)
    for (const f of files.value) formData.append('files', f)

    const { data } = await api.post('/imports/parse', formData)
    rows.value = data.rows.map((row) => {
      const direction = row.type === 'expense' || (row.type === 'transfer' && row.accountId === Number(uploadAccountId.value)) ? 'out' : 'in'
      const counterAccountId = row.type === 'transfer' ? (direction === 'out' ? row.destinationAccountId : row.accountId) : null
      return {
        ...row,
        direction,
        classification: row.type === 'transfer' ? `transfer:${counterAccountId}` : 'plain',
        approved: !row.conflict,
      }
    })
    step.value = 'review'
  } catch (err) {
    error.value = err.response?.data?.error || 'Erro ao processar o(s) arquivo(s)'
  } finally {
    processing.value = false
  }
}

function removeRow(tempId) {
  rows.value = rows.value.filter((r) => r.tempId !== tempId)
}

function classificationOptions(row) {
  const plainLabel = row.direction === 'out' ? 'Despesa' : 'Receita'
  const options = [{ value: 'plain', label: plainLabel }]
  for (const acc of accountsStore.accounts) {
    if (acc.id === Number(uploadAccountId.value)) continue
    options.push({ value: `transfer:${acc.id}`, label: `Transferência → ${acc.name}` })
  }
  return options
}

function effectiveType(row) {
  return row.classification.startsWith('transfer:') ? 'transfer' : row.direction === 'out' ? 'expense' : 'income'
}

function categoryOptions(row) {
  const type = effectiveType(row)
  return categoriesStore.categories.filter((c) => c.type === type)
}

const approvedCount = computed(() => rows.value.filter((r) => r.approved).length)
const conflictCount = computed(() => rows.value.filter((r) => r.conflict).length)

async function save() {
  error.value = ''
  saving.value = true
  try {
    const payload = rows.value
      .filter((r) => r.approved)
      .map((row) => {
        const type = effectiveType(row)
        const counterAccountId = row.classification.startsWith('transfer:') ? Number(row.classification.split(':')[1]) : null
        return {
          rawDescription: row.rawDescription,
          description: row.description,
          date: row.date,
          amount: Number(row.amount),
          type,
          categoryId: type === 'transfer' ? null : row.categoryId || null,
          accountId: type === 'transfer' ? (row.direction === 'out' ? Number(uploadAccountId.value) : counterAccountId) : Number(uploadAccountId.value),
          destinationAccountId: type === 'transfer' ? (row.direction === 'out' ? counterAccountId : Number(uploadAccountId.value)) : null,
        }
      })

    await api.post('/imports/commit', { rows: payload })
    emit('imported')
    emit('close')
  } catch (err) {
    error.value = err.response?.data?.error || 'Erro ao salvar as transações'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal :open="open" size="xl" :title="step === 'upload' ? 'Importar extrato' : 'Revisar transações importadas'" @close="$emit('close')">
    <div v-if="step === 'upload'" class="flex flex-col gap-4">
      <div>
        <label class="form-label">Conta do extrato</label>
        <select v-model="uploadAccountId" class="form-control w-full">
          <option value="">Selecione</option>
          <option v-for="acc in accountsStore.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
        </select>
      </div>

      <div
        class="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition-colors"
        :class="dragging ? 'border-accent-400 bg-accent-50' : 'border-slate-200 bg-slate-50'"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="handleDrop"
        @click="fileInput.click()"
      >
        <UploadCloud :size="28" class="text-slate-400" />
        <p class="text-sm text-slate-600">Arraste o PDF do extrato aqui ou clique para procurar no computador</p>
        <p class="text-xs text-slate-400">Por enquanto, apenas extratos em PDF</p>
        <input ref="fileInput" type="file" accept=".pdf,application/pdf" multiple class="hidden" @change="handleFileSelect" @click.stop />
      </div>

      <ul v-if="files.length" class="flex flex-col gap-2">
        <li v-for="(f, i) in files" :key="f.name + f.size" class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <span class="inline-flex items-center gap-2 text-slate-600">
            <FileText :size="14" />
            {{ f.name }}
          </span>
          <button type="button" class="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600" @click="removeFile(i)">
            <X :size="14" />
          </button>
        </li>
      </ul>

      <p v-if="error" class="text-sm text-expense-600">{{ error }}</p>

      <div class="mt-2 flex justify-end gap-3">
        <BaseButton variant="ghost" type="button" @click="$emit('close')">Cancelar</BaseButton>
        <BaseButton
          variant="primary"
          type="button"
          :disabled="processing || !uploadAccountId || files.length === 0"
          @click="processFiles"
        >
          <Loader2 v-if="processing" :size="16" class="animate-spin" />
          {{ processing ? 'Processando…' : 'Processar' }}
        </BaseButton>
      </div>
    </div>

    <div v-else class="flex flex-col gap-4">
      <div class="flex items-center justify-between text-sm text-slate-500">
        <span>{{ approvedCount }} selecionadas de {{ rows.length }}<span v-if="conflictCount"> · {{ conflictCount }} conflito(s)</span></span>
      </div>

      <div v-if="rows.length === 0" class="py-10 text-center text-sm text-slate-400">
        Nenhuma transação encontrada nesse(s) arquivo(s).
      </div>

      <div v-else class="max-h-[55vh] overflow-y-auto rounded-2xl ring-1 ring-slate-900/5">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-surface">
            <tr class="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th class="px-3 py-2 font-medium"></th>
              <th class="px-3 py-2 font-medium">Data</th>
              <th class="px-3 py-2 font-medium">Descrição</th>
              <th class="px-3 py-2 font-medium">Classificação</th>
              <th class="px-3 py-2 font-medium">Categoria</th>
              <th class="px-3 py-2 text-right font-medium">Valor</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.tempId" class="border-b border-slate-50 last:border-0 align-top" :class="row.conflict ? 'bg-red-50' : ''">
              <td class="px-3 py-2">
                <input v-model="row.approved" type="checkbox" class="mt-2 rounded border-slate-300" />
              </td>
              <td class="px-3 py-2">
                <input v-model="row.date" type="date" class="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
              </td>
              <td class="px-3 py-2">
                <input v-model="row.description" type="text" class="w-48 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <p v-if="row.conflict" class="mt-1 inline-flex items-center gap-1 text-xs text-expense-600">
                  <AlertTriangle :size="12" />
                  duplica "{{ row.conflict.description }}" em {{ formatDate(row.conflict.date) }}
                </p>
              </td>
              <td class="px-3 py-2">
                <select v-model="row.classification" class="w-44 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
                  <option v-for="opt in classificationOptions(row)" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </td>
              <td class="px-3 py-2">
                <select
                  v-if="effectiveType(row) !== 'transfer'"
                  v-model="row.categoryId"
                  class="w-44 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option :value="null">Sem categoria</option>
                  <optgroup v-for="parent in categoryOptions(row)" :key="parent.id" :label="parent.name">
                    <option :value="parent.id">{{ parent.name }}</option>
                    <option v-for="child in parent.children" :key="child.id" :value="child.id">— {{ child.name }}</option>
                  </optgroup>
                </select>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
              <td class="px-3 py-2 text-right">
                <input v-model="row.amount" type="number" step="0.01" min="0" class="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm" />
              </td>
              <td class="px-3 py-2 text-right">
                <button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-expense-600" title="Remover" @click="removeRow(row.tempId)">
                  <Trash2 :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="error" class="text-sm text-expense-600">{{ error }}</p>

      <div class="mt-2 flex justify-end gap-3">
        <BaseButton variant="ghost" type="button" @click="$emit('close')">Cancelar</BaseButton>
        <BaseButton variant="primary" type="button" :disabled="saving || approvedCount === 0" @click="save">
          {{ saving ? 'Salvando…' : `Salvar (${approvedCount})` }}
        </BaseButton>
      </div>
    </div>
  </Modal>
</template>
