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
const errorMessage = ref('')
const successMessage = ref('')

// Form data
const formData = ref({
  descripcion: '',
  monto: 0,
  fecha: new Date().toISOString().split('T')[0] ?? '',
  origenAccountId: null as number | null
})

// Cuentas de origen disponibles (Caja o Banco)
const cashAccounts = computed(() => 
  store.accounts
    .filter(a => a.nombre === 'Caja' || a.nombre === 'Banco')
    .map(a => ({ label: `${a.nombre} (${formatCurrency(a.saldo)})`, value: a.id }))
)

// Cuenta de gastos operativos
const gastosAccount = computed(() => 
  store.accounts.find(a => a.nombre === 'Gastos Operativos')
)

// Total de gastos operativos
const totalGastos = computed(() => gastosAccount.value?.saldo ?? 0)

// Transacciones de gastos operativos (filtrar del historial)
const expenseTransactions = computed(() => {
  return store.transactions
    .filter(t => t.detalles.some(d => d.accountName === 'Gastos Operativos'))
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

const openModal = () => {
  formData.value = {
    descripcion: '',
    monto: 0,
    fecha: new Date().toISOString().split('T')[0] ?? '',
    origenAccountId: null
  }
  errorMessage.value = ''
  successMessage.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  errorMessage.value = ''
  successMessage.value = ''
}

const registerExpense = () => {
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

  if (!formData.value.origenAccountId) {
    errorMessage.value = 'Debe seleccionar una cuenta de origen'
    return
  }

  const origenAccount = store.accounts.find(a => a.id === formData.value.origenAccountId)
  if (!origenAccount) {
    errorMessage.value = 'Cuenta de origen no encontrada'
    return
  }

  // Validar saldo suficiente
  if (origenAccount.saldo < formData.value.monto) {
    errorMessage.value = `Saldo insuficiente en ${origenAccount.nombre}`
    return
  }

  if (!gastosAccount.value) {
    errorMessage.value = 'Cuenta de Gastos Operativos no encontrada'
    return
  }

  // Crear transacción contable: Gasto aumenta (debe), Caja/Banco disminuye (haber)
  const result = store.addTransaction({
    fecha: formData.value.fecha,
    descripcion: `Gasto: ${formData.value.descripcion}`,
    detalles: [
      {
        accountId: gastosAccount.value.id,
        accountName: gastosAccount.value.nombre,
        debe: formData.value.monto,
        haber: 0
      },
      {
        accountId: origenAccount.id,
        accountName: origenAccount.nombre,
        debe: 0,
        haber: formData.value.monto
      }
    ]
  })

  if (result.success) {
    successMessage.value = 'Gasto registrado correctamente'
    setTimeout(() => {
      closeModal()
    }, 1500)
  } else {
    errorMessage.value = result.message
  }
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-ink">Gastos Operativos</h1>
        <p class="text-gray-500 mt-1">Gestiona los gastos de operación del negocio</p>
      </div>
      <button 
        @click="openModal"
        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
      >
        <i class="pi pi-plus"></i>
        Registrar Gasto
      </button>
    </div>

    <!-- Summary Card -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
          <i class="pi pi-arrow-up text-orange-600 text-2xl"></i>
        </div>
        <div>
          <p class="text-gray-500 text-sm">Total Gastos Operativos</p>
          <p class="text-3xl font-bold text-ink">{{ formatCurrency(totalGastos) }}</p>
        </div>
      </div>
    </div>

    <!-- Expenses List -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="p-4 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-ink">Historial de Gastos</h2>
      </div>
      
      <div v-if="expenseTransactions.length === 0" class="p-8 text-center">
        <i class="pi pi-inbox text-4xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">No hay gastos registrados</p>
        <button 
          @click="openModal"
          class="mt-4 text-primary hover:underline"
        >
          Registrar primer gasto
        </button>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div 
          v-for="tx in expenseTransactions" 
          :key="tx.id"
          class="p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <i class="pi pi-arrow-up text-orange-600"></i>
              </div>
              <div>
                <p class="font-medium text-ink">{{ tx.descripcion }}</p>
                <p class="text-sm text-gray-500">{{ formatDate(tx.fecha) }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-semibold text-orange-600">-{{ formatCurrency(tx.totalDebe) }}</p>
              <p class="text-xs text-gray-400">
                {{ tx.detalles.find(d => d.haber > 0)?.accountName }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Dialog 
      v-model:visible="showModal" 
      modal 
      header="Registrar Gasto" 
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

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <InputText 
            v-model="formData.descripcion" 
            class="w-full" 
            placeholder="Ej: Pago de luz, Compra de materiales..."
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
          <label class="block text-sm font-medium text-gray-700 mb-1">Cuenta de Origen</label>
          <Select 
            v-model="formData.origenAccountId" 
            :options="cashAccounts" 
            optionLabel="label" 
            optionValue="value"
            placeholder="Seleccionar cuenta"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-1">El dinero saldrá de esta cuenta</p>
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
            @click="registerExpense"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Registrar
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
