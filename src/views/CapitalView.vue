<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores/finance'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Message from 'primevue/message'

const store = useFinanceStore()

// Modal state
const showModal = ref(false)
const showClosingModal = ref(false)
const operationType = ref<'aporte' | 'retiro'>('aporte')
const errorMessage = ref('')
const successMessage = ref('')
const closingError = ref('')
const closingSuccess = ref('')

// Form data
const formData = ref({
  descripcion: '',
  monto: 0,
  fecha: new Date().toISOString().split('T')[0] ?? '',
  cuentaDestinoId: null as number | null
})

// Cierre contable form
const currentDate = new Date()
const closingForm = ref({
  mes: currentDate.getMonth() + 1,
  anio: currentDate.getFullYear()
})

// Opciones de meses
const mesesOptions = [
  { label: 'Enero', value: 1 },
  { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 },
  { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 },
  { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 },
  { label: 'Diciembre', value: 12 }
]

// Opciones de años (últimos 5 años)
const aniosOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => ({
    label: String(currentYear - i),
    value: currentYear - i
  }))
})

// Cuenta de Capital
const capitalAccount = computed(() => 
  store.accounts.find(a => a.nombre === 'Capital')
)

// Cuentas de efectivo disponibles (Caja o Banco)
const cashAccounts = computed(() => 
  store.accounts
    .filter(a => a.nombre === 'Caja' || a.nombre === 'Banco')
    .map(a => ({ label: `${a.nombre} (${formatCurrency(a.saldo)})`, value: a.id }))
)

// Total Capital actual
const totalCapital = computed(() => capitalAccount.value?.saldo ?? 0)

// Cálculo de utilidad (Ingresos - Gastos)
const totalIngresos = computed(() => 
  store.accounts
    .filter(a => a.tipo === 'ingreso')
    .reduce((sum, a) => sum + a.saldo, 0)
)

const totalGastos = computed(() => 
  store.accounts
    .filter(a => a.tipo === 'gasto')
    .reduce((sum, a) => sum + a.saldo, 0)
)

const utilidadNeta = computed(() => totalIngresos.value - totalGastos.value)

// Patrimonio total (Capital + Utilidad no distribuida)
const patrimonioTotal = computed(() => totalCapital.value + utilidadNeta.value)

// Transacciones de capital (filtrar del historial)
const capitalTransactions = computed(() => {
  return store.transactions
    .filter(t => t.detalles.some(d => d.accountName === 'Capital'))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

const formatDate = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const openAporteModal = () => {
  operationType.value = 'aporte'
  resetForm()
  showModal.value = true
}

const openRetiroModal = () => {
  operationType.value = 'retiro'
  resetForm()
  showModal.value = true
}

const resetForm = () => {
  formData.value = {
    descripcion: '',
    monto: 0,
    fecha: new Date().toISOString().split('T')[0] ?? '',
    cuentaDestinoId: null
  }
  errorMessage.value = ''
  successMessage.value = ''
}

const closeModal = () => {
  showModal.value = false
  errorMessage.value = ''
  successMessage.value = ''
}

const processOperation = () => {
  errorMessage.value = ''
  successMessage.value = ''

  // Validaciones
  if (!formData.value.descripcion.trim()) {
    errorMessage.value = 'La descripción es requerida'
    return
  }

  if (formData.value.monto <= 0) {
    errorMessage.value = 'El monto debe ser mayor a 0'
    return
  }

  if (!formData.value.cuentaDestinoId) {
    errorMessage.value = 'Debe seleccionar una cuenta'
    return
  }

  const cuentaEfectivo = store.accounts.find(a => a.id === formData.value.cuentaDestinoId)
  if (!cuentaEfectivo) {
    errorMessage.value = 'Cuenta no encontrada'
    return
  }

  if (!capitalAccount.value) {
    errorMessage.value = 'Cuenta de Capital no encontrada'
    return
  }

  if (operationType.value === 'aporte') {
    // Aporte: Capital aumenta (Haber), Caja/Banco aumenta (Debe)
    const result = store.addTransaction({
      fecha: formData.value.fecha,
      descripcion: `Aporte de Capital: ${formData.value.descripcion}`,
      detalles: [
        {
          accountId: cuentaEfectivo.id,
          accountName: cuentaEfectivo.nombre,
          debe: formData.value.monto,
          haber: 0
        },
        {
          accountId: capitalAccount.value.id,
          accountName: capitalAccount.value.nombre,
          debe: 0,
          haber: formData.value.monto
        }
      ]
    })

    if (result.success) {
      successMessage.value = 'Aporte registrado correctamente'
      setTimeout(closeModal, 1500)
    } else {
      errorMessage.value = result.message
    }
  } else {
    // Retiro: Validar que haya suficiente en la cuenta de efectivo
    if (cuentaEfectivo.saldo < formData.value.monto) {
      errorMessage.value = `Saldo insuficiente en ${cuentaEfectivo.nombre}`
      return
    }

    // Retiro: Capital disminuye (Debe), Caja/Banco disminuye (Haber)
    const result = store.addTransaction({
      fecha: formData.value.fecha,
      descripcion: `Retiro de Capital: ${formData.value.descripcion}`,
      detalles: [
        {
          accountId: capitalAccount.value.id,
          accountName: capitalAccount.value.nombre,
          debe: formData.value.monto,
          haber: 0
        },
        {
          accountId: cuentaEfectivo.id,
          accountName: cuentaEfectivo.nombre,
          debe: 0,
          haber: formData.value.monto
        }
      ]
    })

    if (result.success) {
      successMessage.value = 'Retiro registrado correctamente'
      setTimeout(closeModal, 1500)
    } else {
      errorMessage.value = result.message
    }
  }
}

const getTransactionType = (tx: typeof capitalTransactions.value[0]) => {
  const capitalDetail = tx.detalles.find(d => d.accountName === 'Capital')
  if (!capitalDetail) return 'movimiento'
  // Detectar si es un cierre contable
  if (tx.descripcion.includes('Cierre contable')) return 'cierre'
  return capitalDetail.haber > 0 ? 'aporte' : 'retiro'
}

const getTransactionAmount = (tx: typeof capitalTransactions.value[0]) => {
  const capitalDetail = tx.detalles.find(d => d.accountName === 'Capital')
  if (!capitalDetail) return 0
  return capitalDetail.haber > 0 ? capitalDetail.haber : capitalDetail.debe
}

// Cierre contable
const openClosingModal = () => {
  closingError.value = ''
  closingSuccess.value = ''
  closingForm.value = {
    mes: currentDate.getMonth() + 1,
    anio: currentDate.getFullYear()
  }
  showClosingModal.value = true
}

const closeClosingModal = () => {
  showClosingModal.value = false
  closingError.value = ''
  closingSuccess.value = ''
}

const isSelectedMonthClosed = computed(() => 
  store.isMonthClosed(closingForm.value.mes, closingForm.value.anio)
)

// Ingresos por fuente (para preview)
const interesesGanados = computed(() => 
  store.accounts.find(a => a.nombre === 'Intereses Ganados')?.saldo ?? 0
)

const gananciasInversiones = computed(() => 
  store.accounts.find(a => a.nombre === 'Ganancias por Inversión')?.saldo ?? 0
)

const gastosOperativos = computed(() => 
  store.accounts.find(a => a.nombre === 'Gastos Operativos')?.saldo ?? 0
)

const performClosing = () => {
  closingError.value = ''
  closingSuccess.value = ''

  const result = store.performMonthlyClosing(
    closingForm.value.mes,
    closingForm.value.anio
  )

  if (result.success) {
    closingSuccess.value = result.message
    setTimeout(() => {
      closeClosingModal()
    }, 2000)
  } else {
    closingError.value = result.message
  }
}

const getMonthName = (mes: number) => {
  return new Date(2000, mes - 1).toLocaleDateString('es-MX', { month: 'long' })
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-ink">Capital</h1>
        <p class="text-gray-500 mt-1">Gestiona aportes y retiros de capital</p>
      </div>
      <div class="flex gap-2">
        <button 
          @click="openClosingModal"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <i class="pi pi-calculator"></i>
          Cierre Mensual
        </button>
        <button 
          @click="openAporteModal"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <i class="pi pi-arrow-down"></i>
          Aporte
        </button>
        <button 
          @click="openRetiroModal"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <i class="pi pi-arrow-up"></i>
          Retiro
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- Capital -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <i class="pi pi-wallet text-primary text-xl"></i>
          </div>
          <div>
            <p class="text-gray-500 text-sm">Capital Aportado</p>
            <p class="text-2xl font-bold text-ink">{{ formatCurrency(totalCapital) }}</p>
          </div>
        </div>
      </div>

      <!-- Utilidad -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center gap-4">
          <div :class="[
            'w-12 h-12 rounded-xl flex items-center justify-center',
            utilidadNeta >= 0 ? 'bg-green-100' : 'bg-red-100'
          ]">
            <i :class="[
              'pi text-xl',
              utilidadNeta >= 0 ? 'pi-trending-up text-green-600' : 'pi-trending-down text-red-600'
            ]"></i>
          </div>
          <div>
            <p class="text-gray-500 text-sm">Utilidad del Periodo</p>
            <p :class="[
              'text-2xl font-bold',
              utilidadNeta >= 0 ? 'text-green-600' : 'text-red-600'
            ]">{{ formatCurrency(utilidadNeta) }}</p>
            <p class="text-xs text-gray-400">Ingresos - Gastos</p>
          </div>
        </div>
      </div>

      <!-- Patrimonio Total -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <i class="pi pi-chart-pie text-blue-600 text-xl"></i>
          </div>
          <div>
            <p class="text-gray-500 text-sm">Patrimonio Total</p>
            <p class="text-2xl font-bold text-blue-600">{{ formatCurrency(patrimonioTotal) }}</p>
            <p class="text-xs text-gray-400">Capital + Utilidad</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Resumen Ingresos/Gastos -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <i class="pi pi-arrow-down text-green-600"></i>
            </div>
            <span class="font-medium text-gray-700">Total Ingresos</span>
          </div>
          <span class="text-lg font-semibold text-green-600">{{ formatCurrency(totalIngresos) }}</span>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <i class="pi pi-arrow-up text-red-600"></i>
            </div>
            <span class="font-medium text-gray-700">Total Gastos</span>
          </div>
          <span class="text-lg font-semibold text-red-600">{{ formatCurrency(totalGastos) }}</span>
        </div>
      </div>
    </div>

    <!-- Transactions History -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="p-4 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-ink">Historial de Movimientos de Capital</h2>
      </div>
      
      <div v-if="capitalTransactions.length === 0" class="p-8 text-center">
        <i class="pi pi-inbox text-4xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">No hay movimientos de capital registrados</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div 
          v-for="tx in capitalTransactions" 
          :key="tx.id"
          class="p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div :class="[
                'w-10 h-10 rounded-lg flex items-center justify-center',
                getTransactionType(tx) === 'aporte' ? 'bg-green-100' : 
                getTransactionType(tx) === 'cierre' ? 'bg-blue-100' : 'bg-red-100'
              ]">
                <i :class="[
                  'pi',
                  getTransactionType(tx) === 'aporte' ? 'pi-arrow-down text-green-600' : 
                  getTransactionType(tx) === 'cierre' ? 'pi-calculator text-blue-600' : 'pi-arrow-up text-red-600'
                ]"></i>
              </div>
              <div>
                <p class="font-medium text-ink">{{ tx.descripcion }}</p>
                <p class="text-sm text-gray-500">{{ formatDate(tx.fecha) }}</p>
              </div>
            </div>
            <div class="text-right">
              <p :class="[
                'font-semibold',
                getTransactionType(tx) === 'aporte' || getTransactionType(tx) === 'cierre' ? 'text-green-600' : 'text-red-600'
              ]">
                {{ getTransactionType(tx) === 'retiro' ? '-' : '+' }}{{ formatCurrency(getTransactionAmount(tx)) }}
              </p>
              <span :class="[
                'text-xs px-2 py-0.5 rounded-full',
                getTransactionType(tx) === 'aporte' ? 'bg-green-100 text-green-700' : 
                getTransactionType(tx) === 'cierre' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
              ]">
                {{ getTransactionType(tx) === 'aporte' ? 'Aporte' : getTransactionType(tx) === 'cierre' ? 'Cierre' : 'Retiro' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Dialog 
      v-model:visible="showModal" 
      modal 
      :header="operationType === 'aporte' ? 'Registrar Aporte' : 'Registrar Retiro'" 
      :style="{ width: '450px' }"
      :closable="true"
    >
      <div class="space-y-4">
        <Message v-if="errorMessage" severity="error" :closable="false">
          {{ errorMessage }}
        </Message>
        <Message v-if="successMessage" severity="success" :closable="false">
          {{ successMessage }}
        </Message>

        <div :class="[
          'p-3 rounded-lg text-sm',
          operationType === 'aporte' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        ]">
          <i :class="['pi mr-2', operationType === 'aporte' ? 'pi-info-circle' : 'pi-exclamation-triangle']"></i>
          <span v-if="operationType === 'aporte'">
            El aporte aumentará el Capital y el efectivo disponible.
          </span>
          <span v-else>
            El retiro disminuirá el Capital y el efectivo disponible.
          </span>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <InputText 
            v-model="formData.descripcion" 
            class="w-full" 
            :placeholder="operationType === 'aporte' ? 'Ej: Aporte inicial, Inyección de capital...' : 'Ej: Retiro de utilidades, Distribución...'"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Monto</label>
          <InputNumber 
            v-model="formData.monto" 
            class="w-full" 
            mode="currency" 
            currency="MXN" 
            locale="es-MX"
            :min="0"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <InputText 
            v-model="formData.fecha" 
            type="date" 
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ operationType === 'aporte' ? 'Cuenta destino' : 'Cuenta origen' }}
          </label>
          <Select 
            v-model="formData.cuentaDestinoId" 
            :options="cashAccounts" 
            optionLabel="label" 
            optionValue="value"
            placeholder="Seleccionar cuenta"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            {{ operationType === 'aporte' ? 'El dinero entrará a esta cuenta' : 'El dinero saldrá de esta cuenta' }}
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button 
            @click="closeModal"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            @click="processOperation"
            :class="[
              'px-4 py-2 text-white rounded-lg transition-colors',
              operationType === 'aporte' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            ]"
          >
            {{ operationType === 'aporte' ? 'Registrar Aporte' : 'Registrar Retiro' }}
          </button>
        </div>
      </template>
    </Dialog>

    <!-- Modal Cierre Contable -->
    <Dialog 
      v-model:visible="showClosingModal" 
      modal 
      header="Cierre Contable Mensual" 
      :style="{ width: '500px' }"
      :closable="true"
    >
      <div class="space-y-4">
        <Message v-if="closingError" severity="error" :closable="false">
          {{ closingError }}
        </Message>
        <Message v-if="closingSuccess" severity="success" :closable="false">
          {{ closingSuccess }}
        </Message>

        <div class="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
          <i class="pi pi-info-circle mr-2"></i>
          El cierre contable transfiere las utilidades del periodo (Ingresos - Gastos) a la cuenta de Capital, dejando las cuentas de resultados en cero.
        </div>

        <!-- Selector de periodo -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <Select 
              v-model="closingForm.mes" 
              :options="mesesOptions" 
              optionLabel="label" 
              optionValue="value"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <Select 
              v-model="closingForm.anio" 
              :options="aniosOptions" 
              optionLabel="label" 
              optionValue="value"
              class="w-full"
            />
          </div>
        </div>

        <!-- Estado del periodo -->
        <div v-if="isSelectedMonthClosed" class="bg-amber-50 p-4 rounded-lg">
          <div class="flex items-center gap-2 text-amber-700">
            <i class="pi pi-exclamation-triangle"></i>
            <span class="font-medium">Este periodo ya fue cerrado</span>
          </div>
        </div>

        <!-- Preview de cierre -->
        <div v-else class="bg-gray-50 p-4 rounded-lg space-y-3">
          <h4 class="font-medium text-gray-700">Resumen del cierre:</h4>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Intereses Ganados (Créditos)</span>
              <span class="font-medium text-green-600">+{{ formatCurrency(interesesGanados) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Ganancias por Inversión</span>
              <span class="font-medium text-green-600">+{{ formatCurrency(gananciasInversiones) }}</span>
            </div>
            <div class="flex justify-between items-center border-t pt-2">
              <span class="text-gray-700 font-medium">Total Ingresos</span>
              <span class="font-semibold text-green-600">{{ formatCurrency(totalIngresos) }}</span>
            </div>
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Gastos Operativos</span>
              <span class="font-medium text-red-600">-{{ formatCurrency(gastosOperativos) }}</span>
            </div>
            <div class="flex justify-between items-center border-t pt-2">
              <span class="text-gray-700 font-medium">Total Gastos</span>
              <span class="font-semibold text-red-600">{{ formatCurrency(totalGastos) }}</span>
            </div>
          </div>

          <div class="border-t-2 border-gray-300 pt-3">
            <div class="flex justify-between items-center">
              <span class="text-lg font-bold text-gray-800">Utilidad Neta</span>
              <span :class="[
                'text-xl font-bold',
                (totalIngresos - totalGastos) >= 0 ? 'text-green-600' : 'text-red-600'
              ]">
                {{ formatCurrency(totalIngresos - totalGastos) }}
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Este monto se {{ (totalIngresos - totalGastos) >= 0 ? 'sumará' : 'restará' }} al Capital
            </p>
          </div>
        </div>

        <!-- Historial de cierres recientes -->
        <div v-if="store.sortedClosures.length > 0" class="pt-2">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Cierres realizados:</h4>
          <div class="max-h-32 overflow-y-auto space-y-1">
            <div 
              v-for="closure in store.sortedClosures.slice(0, 5)" 
              :key="closure.id"
              class="flex justify-between text-xs bg-gray-100 rounded px-3 py-2"
            >
              <span class="text-gray-600">{{ getMonthName(closure.mes) }} {{ closure.anio }}</span>
              <span :class="closure.utilidadNeta >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatCurrency(closure.utilidadNeta) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button 
            @click="closeClosingModal"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            @click="performClosing"
            :disabled="isSelectedMonthClosed || (totalIngresos === 0 && totalGastos === 0)"
            :class="[
              'px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2',
              isSelectedMonthClosed || (totalIngresos === 0 && totalGastos === 0)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90'
            ]"
          >
            <i class="pi pi-check"></i>
            Realizar Cierre
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
