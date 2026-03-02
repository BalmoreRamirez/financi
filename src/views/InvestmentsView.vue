<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore, type Investment } from '../stores/finance'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Message from 'primevue/message'
import Paginator from 'primevue/paginator'
import TableComponents from '../components/TableComponents.vue'
import ViewTitle from '../components/ViewTitle.vue'
import { unifiedSelectPt } from '../utils/selectStyles'

const store = useFinanceStore()

// Paginación
const first = ref(0)
const rows = ref(10)

const showModal = ref(false)
const showSellModal = ref(false)
const editingInvestment = ref<Investment | null>(null)
const sellingInvestment = ref<Investment | null>(null)
const isEditing = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  nombre: '',
  descripcion: '',
  costo: 0,
  gananciaEstimada: 0,
  origenAccountId: null as number | null  // RN-04: Cuenta de origen
})

const sellForm = ref({
  destinoAccountId: null as number | null
})

// RN-04: Solo cuentas Caja o Banco para recibir el dinero
const cashAccounts = computed(() => 
  store.accounts
    .filter(a => a.nombre === 'Caja' || a.nombre === 'Banco')
    .map(a => ({ label: `${a.nombre} (${formatCurrency(a.saldo)})`, value: a.id }))
)

// Inversiones paginadas
const paginatedInvestments = computed(() => {
  const start = first.value
  const end = start + rows.value
  return store.investments.slice(start, end)
})

const onPageChange = (event: { first: number; rows: number }) => {
  first.value = event.first
  rows.value = event.rows
}

const investmentsTableData = computed(() => {
  return paginatedInvestments.value.map((investment) => ({
    Nombre: { text: investment.nombre, class: 'font-medium' },
    Descripción: investment.descripcion,
    Costo: { text: formatCurrency(investment.costo), align: 'right' },
    'Gan. Estimada': { text: formatCurrency(investment.gananciaEstimada), align: 'right', class: 'text-orange-500' },
    'Gan. Real': {
      text: investment.vendida ? formatCurrency(investment.gananciaReal) : '-',
      align: 'right',
      class: 'text-green-600 font-semibold'
    },
    Estado: {
      type: 'badge',
      label: investment.vendida ? 'VENDIDA' : 'ACTIVA',
      class: investment.vendida ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700',
      align: 'center'
    },
    Acciones: investment.vendida
      ? { text: investment.fechaVenta || '-', class: 'text-gray-400 text-xs', align: 'center' }
      : {
          type: 'actions',
          actions: [
            { key: 'sell', icon: 'pi-dollar', title: 'Vender inversión', class: 'text-green-600 hover:bg-green-50' },
            { key: 'edit', icon: 'pi-pencil', title: 'Editar', class: 'text-primary hover:bg-primary/10' },
            { key: 'delete', icon: 'pi-trash', title: 'Eliminar', class: 'text-red-500 hover:bg-red-50' }
          ]
        },
    __raw: investment
  }))
})

const onInvestmentTableAction = (payload: { action: string; row: Record<string, unknown> }) => {
  const investment = payload.row.__raw as Investment | undefined
  if (!investment) return

  if (payload.action === 'sell') openSellModal(investment)
  if (payload.action === 'edit') openEditModal(investment)
  if (payload.action === 'delete') deleteInvestment(investment.id)
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

const openNewModal = () => {
  isEditing.value = false
  editingInvestment.value = null
  form.value = {
    nombre: '',
    descripcion: '',
    costo: 0,
    gananciaEstimada: 0,
    origenAccountId: null
  }
  errorMessage.value = ''
  successMessage.value = ''
  showModal.value = true
}

const openEditModal = (investment: Investment) => {
  if (investment.vendida) {
    errorMessage.value = 'No se puede editar una inversión vendida'
    return
  }
  isEditing.value = true
  editingInvestment.value = investment
  form.value = {
    nombre: investment.nombre,
    descripcion: investment.descripcion,
    costo: investment.costo,
    gananciaEstimada: investment.gananciaEstimada,
    origenAccountId: null
  }
  errorMessage.value = ''
  successMessage.value = ''
  showModal.value = true
}

const openSellModal = (investment: Investment) => {
  if (investment.vendida) {
    return
  }
  sellingInvestment.value = investment
  sellForm.value.destinoAccountId = null
  errorMessage.value = ''
  successMessage.value = ''
  showSellModal.value = true
}

const saveInvestment = () => {
  errorMessage.value = ''
  successMessage.value = ''
  
  if (isEditing.value && editingInvestment.value) {
    store.updateInvestment(editingInvestment.value.id, form.value)
    showModal.value = false
  } else {
    // Nueva inversión requiere cuenta de origen
    if (!form.value.origenAccountId) {
      errorMessage.value = 'Seleccione la cuenta de origen de la inversión (RN-04)'
      return
    }
    
    const result = store.addInvestment(
      {
        nombre: form.value.nombre,
        descripcion: form.value.descripcion,
        costo: form.value.costo,
        gananciaEstimada: form.value.gananciaEstimada
      },
      form.value.origenAccountId
    )
    
    if (result.success) {
      successMessage.value = result.message
      setTimeout(() => {
        showModal.value = false
      }, 1000)
    } else {
      errorMessage.value = result.message
    }
  }
}

const confirmSell = () => {
  if (!sellingInvestment.value || !sellForm.value.destinoAccountId) {
    errorMessage.value = 'Selecciona una cuenta de destino'
    return
  }

  const result = store.sellInvestment(sellingInvestment.value.id, sellForm.value.destinoAccountId)
  
  if (result.success) {
    successMessage.value = result.message
    setTimeout(() => {
      showSellModal.value = false
    }, 1500)
  } else {
    errorMessage.value = result.message
  }
}

const deleteInvestment = (id: number) => {
  const investment = store.investments.find(i => i.id === id)
  if (investment?.vendida) {
    alert('No se puede eliminar una inversión vendida')
    return
  }
  if (confirm('¿Estás seguro de eliminar esta inversión?')) {
    store.deleteInvestment(id)
  }
}
</script>

<template>
  <div class="p-4 sm:p-6">
    <!-- Indicadores resumen de flujo de inversiones -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl shadow-card p-4 flex flex-col items-start">
        <span class="text-xs text-gray-500 mb-1">Total Invertido</span>
        <span class="text-lg font-bold text-primary">{{ formatCurrency(store.investments.reduce((sum, inv) => sum + inv.costo, 0)) }}</span>
      </div>
      <div class="bg-white rounded-xl shadow-card p-4 flex flex-col items-start">
        <span class="text-xs text-gray-500 mb-1">Total Vendido</span>
        <span class="text-lg font-bold text-green-600">{{ formatCurrency(store.investments.filter(inv => inv.vendida).reduce((sum, inv) => sum + inv.costo, 0)) }}</span>
      </div>
      <div class="bg-white rounded-xl shadow-card p-4 flex flex-col items-start">
        <span class="text-xs text-gray-500 mb-1">Ganancia Estimada</span>
        <span class="text-lg font-bold text-orange-500">{{ formatCurrency(store.totalEstimatedGains) }}</span>
      </div>
      <div class="bg-white rounded-xl shadow-card p-4 flex flex-col items-start">
        <span class="text-xs text-gray-500 mb-1">Ganancia Realizada</span>
        <span class="text-lg font-bold text-green-700">{{ formatCurrency(store.investments.filter(inv => inv.vendida).reduce((sum, inv) => sum + (inv.gananciaReal || 0), 0)) }}</span>
      </div>
    </div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <ViewTitle title="Inversiones" />
        <p class="text-sm text-gray-500 mt-1">
          Ganancia estimada: {{ formatCurrency(store.totalEstimatedGains) }} | 
          Ganancia realizada: {{ formatCurrency(store.totalGains) }}
        </p>
      </div>
      <button 
        @click="openNewModal"
        class="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition"
      >
        <i class="pi pi-plus"></i>
        Nueva Inversión
      </button>
    </div>

    <!-- Investments Table -->
    <div class="bg-white rounded-xl shadow-card overflow-x-auto">
      <TableComponents
        :data="investmentsTableData"
        @action="onInvestmentTableAction"
      />
      
      <!-- Paginación -->
      <Paginator
        v-if="store.investments.length > rows"
        :first="first"
        :rows="rows"
        :totalRecords="store.investments.length"
        :rowsPerPageOptions="[10, 20, 50]"
        @page="onPageChange"
        class="border-t border-gray-100"
      />
    </div>

    <!-- Create/Edit Modal -->
    <Dialog 
      v-model:visible="showModal" 
      :header="isEditing ? 'Editar Inversión' : 'Nueva Inversión'"
      modal
      class="w-full max-w-lg"
    >
      <div class="space-y-4 p-2">
        <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success" :closable="false">{{ successMessage }}</Message>
        
        <div>
          <label class="block text-sm font-medium text-ink mb-1">Nombre</label>
          <InputText v-model="form.nombre" class="w-full" placeholder="Nombre de la inversión" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1">Descripción</label>
          <Textarea v-model="form.descripcion" rows="3" class="w-full" placeholder="Describe la inversión" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Costo</label>
            <InputNumber v-model="form.costo" mode="currency" currency="MXN" locale="es-MX" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Ganancia Estimada</label>
            <InputNumber v-model="form.gananciaEstimada" mode="currency" currency="MXN" locale="es-MX" class="w-full" />
          </div>
        </div>
        
        <!-- RN-04: Cuenta de origen (solo para nueva inversión) -->
        <div v-if="!isEditing">
          <label class="block text-sm font-medium text-ink mb-1">Cuenta de origen (RN-04)</label>
          <Select
            v-model="form.origenAccountId"
            :options="cashAccounts"
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccionar Caja o Banco"
            class="w-full"
            :pt="unifiedSelectPt"
          />
          <p class="text-xs text-gray-500 mt-1">El dinero de la inversión saldrá de esta cuenta</p>
        </div>
        
        <Message severity="info" :closable="false">
          RN-03: La ganancia solo se realizará cuando vendas la inversión.
        </Message>
      </div>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 w-full">
          <button 
            @click="showModal = false"
            class="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button 
            @click="saveInvestment"
            class="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition"
          >
            {{ isEditing ? 'Guardar' : 'Crear' }}
          </button>
        </div>
      </template>
    </Dialog>

    <!-- Sell Modal -->
    <Dialog 
      v-model:visible="showSellModal" 
      header="Vender Inversión"
      modal
      class="w-full max-w-md"
    >
      <div class="space-y-4 p-2" v-if="sellingInvestment">
        <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success" :closable="false">{{ successMessage }}</Message>

        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="font-semibold text-ink">{{ sellingInvestment.nombre }}</h3>
          <div class="mt-2 space-y-1 text-sm">
            <p><span class="text-gray-500">Costo:</span> {{ formatCurrency(sellingInvestment.costo) }}</p>
            <p><span class="text-gray-500">Ganancia:</span> <span class="text-green-600 font-semibold">{{ formatCurrency(sellingInvestment.gananciaEstimada) }}</span></p>
            <p><span class="text-gray-500">Total a recibir:</span> <span class="text-primary font-bold">{{ formatCurrency(sellingInvestment.total) }}</span></p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-ink mb-1">Cuenta de destino (RN-04)</label>
          <Select
            v-model="sellForm.destinoAccountId"
            :options="cashAccounts"
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccionar cuenta"
            class="w-full"
            :pt="unifiedSelectPt"
          />
          <p class="text-xs text-gray-500 mt-1">El ingreso debe ir a Caja o Banco</p>
        </div>
      </div>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 w-full">
          <button 
            @click="showSellModal = false"
            class="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button 
            @click="confirmSell"
            class="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition inline-flex items-center justify-center gap-2"
          >
            <i class="pi pi-check"></i>
            Confirmar Venta
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
