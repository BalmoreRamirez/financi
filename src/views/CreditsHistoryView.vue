<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores/finance'
import Dialog from 'primevue/dialog'
import Paginator from 'primevue/paginator'
import TableComponents from '../components/TableComponents.vue'
import ViewTitle from '../components/ViewTitle.vue'

const store = useFinanceStore()

// Paginación
const first = ref(0)
const rows = ref(10)

// Filtrar solo créditos completados
const completedCredits = computed(() =>
  store.credits.filter(credit => credit.estado === 'completado')
)

// Créditos paginados
const paginatedCredits = computed(() => {
  const start = first.value
  const end = start + rows.value
  return completedCredits.value.slice(start, end)
})

const onPageChange = (event: { first: number; rows: number }) => {
  first.value = event.first
  rows.value = event.rows
}

const creditsTableData = computed(() => {
  return paginatedCredits.value.map((credit) => ({
    Nombre: { text: credit.nombre, class: 'font-medium' },
    Monto: { text: formatCurrency(credit.monto), align: 'right' },
    Interés: { text: `${credit.interes}%`, align: 'right' },
    Total: { text: formatCurrency(credit.montoTotal), align: 'right', class: 'font-semibold' },
    Abonado: { text: formatCurrency(credit.abonado), align: 'right', class: 'text-green-600' },
    'Fecha Inicio': credit.fechaInicio,
    'Fecha Fin': credit.fechaFin || 'N/A',
    Acciones: {
      type: 'actions',
      actions: [
        { key: 'payments', icon: 'pi-list', title: 'Ver abonos', class: 'text-blue-500 hover:bg-blue-50' }
      ]
    },
    __raw: credit
  }))
})

// Totales de créditos completados
const totalMonto = computed(() => completedCredits.value.reduce((sum, c) => sum + c.monto, 0))
const totalTotal = computed(() => completedCredits.value.reduce((sum, c) => sum + c.montoTotal, 0))
const totalAbonado = computed(() => completedCredits.value.reduce((sum, c) => sum + c.abonado, 0))

const creditsFooterData = computed(() => ({
  Nombre: '',
  Monto: { text: `Total: ${formatCurrency(totalMonto.value)}`, align: 'left', class: 'text-primary' },
  Interés: '',
  Total: { text: `Total: ${formatCurrency(totalTotal.value)}`, align: 'left', class: 'text-ink' },
  Abonado: { text: `Total: ${formatCurrency(totalAbonado.value)}`, align: 'left', class: 'text-green-600' },
  'Fecha Inicio': '',
  'Fecha Fin': '',
  Acciones: ''
}))

// Modal para ver abonos
const showPaymentsModal = ref(false)
const selectedCredit = ref<any>(null)

const paymentsTableData = computed(() => {
  if (!selectedCredit.value) return []
  return selectedCredit.value.abonos.map((abono: any, index: number) => ({
    '#': { text: index + 1, class: 'text-gray-500' },
    Fecha: abono.fecha,
    Monto: { text: formatCurrency(abono.monto), align: 'right', class: 'text-green-600 font-medium' },
    Nota: abono.nota || '-'
  }))
})

const onCreditTableAction = (payload: { action: string; row: any }) => {
  const credit = payload.row.__raw
  if (!credit) return

  if (payload.action === 'payments') {
    selectedCredit.value = credit
    showPaymentsModal.value = true
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount)
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    aprobado: 'Aprobado',
    proceso: 'En Proceso',
    completado: 'Completado'
  }
  return labels[status] || status
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    aprobado: 'bg-blue-100 text-blue-700',
    proceso: 'bg-amber-100 text-amber-700',
    completado: 'bg-green-100 text-green-700'
  }
  return classes[status] || ''
}
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
      <ViewTitle title="Historial de Créditos" />
      <div class="text-sm text-gray-500">
        Total de créditos completados: <span class="font-semibold text-ink">{{ completedCredits.length }}</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="completedCredits.length === 0" class="bg-white rounded-xl shadow-card p-8 text-center">
      <i class="pi pi-check-circle text-6xl text-gray-300 mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">No hay créditos completados</h3>
      <p class="text-gray-500">Los créditos completados aparecerán aquí cuando finalices su pago.</p>
    </div>

    <!-- Credits Table -->
    <div v-else class="bg-white rounded-xl shadow-card overflow-x-auto">
      <TableComponents
        :data="creditsTableData"
        :footerData="creditsFooterData"
        @action="onCreditTableAction"
      />
      <!-- Paginación -->
      <Paginator
        v-if="completedCredits.length > rows"
        :first="first"
        :rows="rows"
        :totalRecords="completedCredits.length"
        :rowsPerPageOptions="[10, 20, 50]"
        @page="onPageChange"
        class="border-t border-gray-100"
      />
    </div>

    <!-- Payments Modal -->
    <Dialog
      v-if="selectedCredit"
      v-model:visible="showPaymentsModal"
      :header="'Abonos de ' + (selectedCredit?.nombre ?? '')"
      modal
      class="w-full max-w-2xl"
    >
      <div class="p-2">
        <!-- Status Badge -->
        <div class="flex justify-center mb-4">
          <span :class="['px-3 py-1 rounded-full text-sm font-medium', getStatusClass(selectedCredit.estado)]">
            {{ getStatusLabel(selectedCredit.estado) }}
          </span>
        </div>

        <!-- Summary -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 p-4 bg-cloud rounded-lg">
          <div class="text-center">
            <p class="text-sm text-gray-500">Total Crédito</p>
            <p class="text-lg font-bold text-ink">{{ formatCurrency(selectedCredit.montoTotal) }}</p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-500">Total Abonado</p>
            <p class="text-lg font-bold text-green-600">{{ formatCurrency(selectedCredit.abonado) }}</p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-500">Resta</p>
            <p class="text-lg font-bold text-green-600">{{ formatCurrency(selectedCredit.resta) }}</p>
          </div>
        </div>

        <!-- Payments List -->
        <div v-if="selectedCredit.abonos && selectedCredit.abonos.length > 0">
          <h3 class="text-sm font-semibold text-ink mb-3">Historial de Abonos</h3>
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <TableComponents :data="paymentsTableData" />
          </div>
        </div>
        <div v-else class="text-center text-gray-500 py-8">
          No hay abonos registrados
        </div>
      </div>
    </Dialog>
  </div>
</template>

