<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore, type Credit } from '../stores/finance'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Message from 'primevue/message'

const store = useFinanceStore()

const showModal = ref(false)
const showPaymentsModal = ref(false)
const editingCredit = ref<Credit | null>(null)
const selectedCredit = ref<Credit | null>(null)
const isEditing = ref(false)
const paymentError = ref('')
const paymentSuccess = ref('')
const creditError = ref('')
const creditSuccess = ref('')

const form = ref({
  nombre: '',
  monto: 0,
  interes: 0,
  abonado: 0,
  fechaInicio: '',
  fechaFin: '',
  origenAccountId: null as number | null  // RN-04: Cuenta de origen
})

const newPayment = ref({
  monto: 0,
  fecha: new Date().toISOString().split('T')[0] ?? '',
  nota: '',
  origenAccountId: null as number | null
})

// RN-04: Solo cuentas Caja o Banco para recibir el dinero
const cashAccounts = computed(() => 
  store.accounts
    .filter(a => a.nombre === 'Caja' || a.nombre === 'Banco')
    .map(a => ({ label: a.nombre, value: a.id }))
)

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

const getStatusLabel = (estado: string) => {
  const labels: Record<string, string> = {
    aprobado: 'Aprobado',
    proceso: 'En Proceso',
    completado: 'Completado'
  }
  return labels[estado] ?? estado
}

const getStatusClass = (estado: string) => {
  const classes: Record<string, string> = {
    aprobado: 'bg-blue-100 text-blue-700',
    proceso: 'bg-amber-100 text-amber-700',
    completado: 'bg-green-100 text-green-700'
  }
  return classes[estado] ?? ''
}

const canDelete = (credit: Credit) => credit.estado === 'aprobado'

const maxPaymentAmount = computed(() => {
  return selectedCredit.value?.resta ?? 0
})

const openNewModal = () => {
  isEditing.value = false
  editingCredit.value = null
  creditError.value = ''
  creditSuccess.value = ''
  form.value = {
    nombre: '',
    monto: 0,
    interes: 0,
    abonado: 0,
    fechaInicio: new Date().toISOString().split('T')[0] ?? '',
    fechaFin: '',
    origenAccountId: null
  }
  showModal.value = true
}

const openEditModal = (credit: Credit) => {
  isEditing.value = true
  editingCredit.value = credit
  creditError.value = ''
  creditSuccess.value = ''
  form.value = {
    nombre: credit.nombre,
    monto: credit.monto,
    interes: credit.interes,
    abonado: credit.abonado,
    fechaInicio: credit.fechaInicio,
    fechaFin: credit.fechaFin,
    origenAccountId: null
  }
  showModal.value = true
}

const openPaymentsModal = (credit: Credit) => {
  selectedCredit.value = credit
  newPayment.value = {
    monto: 0,
    fecha: new Date().toISOString().split('T')[0] ?? '',
    nota: '',
    origenAccountId: null
  }
  paymentError.value = ''
  paymentSuccess.value = ''
  showPaymentsModal.value = true
}

const saveCredit = () => {
  creditError.value = ''
  creditSuccess.value = ''
  
  if (isEditing.value && editingCredit.value) {
    store.updateCredit(editingCredit.value.id, form.value)
    showModal.value = false
  } else {
    // Nuevo crédito requiere cuenta de origen
    if (!form.value.origenAccountId) {
      creditError.value = 'Seleccione la cuenta de origen del préstamo (RN-04)'
      return
    }
    
    const result = store.addCredit(
      {
        nombre: form.value.nombre,
        monto: form.value.monto,
        interes: form.value.interes,
        abonado: form.value.abonado,
        fechaInicio: form.value.fechaInicio,
        fechaFin: form.value.fechaFin
      },
      form.value.origenAccountId
    )
    
    if (result.success) {
      creditSuccess.value = result.message
      setTimeout(() => {
        showModal.value = false
      }, 1000)
    } else {
      creditError.value = result.message
    }
  }
}

const addPayment = () => {
  paymentError.value = ''
  paymentSuccess.value = ''
  
  if (!selectedCredit.value || newPayment.value.monto <= 0) {
    paymentError.value = 'Ingrese un monto válido'
    return
  }
  
  if (!newPayment.value.origenAccountId) {
    paymentError.value = 'Seleccione la cuenta donde se recibe el pago (RN-04)'
    return
  }
  
  const result = store.addPayment(
    selectedCredit.value.id, 
    {
      monto: Math.min(newPayment.value.monto, maxPaymentAmount.value),
      fecha: newPayment.value.fecha,
      nota: newPayment.value.nota
    },
    newPayment.value.origenAccountId
  )
  
  if (result.success) {
    paymentSuccess.value = result.message
    // Refresh selectedCredit reference
    selectedCredit.value = store.credits.find(c => c.id === selectedCredit.value?.id) ?? null
    
    // Reset form
    newPayment.value = {
      monto: 0,
      fecha: new Date().toISOString().split('T')[0] ?? '',
      nota: '',
      origenAccountId: null
    }
  } else {
    paymentError.value = result.message
  }
}

const deleteCredit = (id: number) => {
  const credit = store.credits.find(c => c.id === id)
  if (!credit || !canDelete(credit)) return
  
  if (confirm('¿Estás seguro de eliminar este crédito?')) {
    store.deleteCredit(id)
  }
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-ink">Créditos</h1>
      <button 
        @click="openNewModal"
        class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition"
      >
        <i class="pi pi-plus"></i>
        Nuevo Crédito
      </button>
    </div>

    <!-- Credits Table -->
    <div class="bg-white rounded-xl shadow-card overflow-hidden">
      <table class="w-full">
        <thead class="bg-ink text-white">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium">Nombre</th>
            <th class="px-4 py-3 text-center text-sm font-medium">Estado</th>
            <th class="px-4 py-3 text-right text-sm font-medium">Monto</th>
            <th class="px-4 py-3 text-right text-sm font-medium">Interés</th>
            <th class="px-4 py-3 text-right text-sm font-medium">Total</th>
            <th class="px-4 py-3 text-right text-sm font-medium">Abonado</th>
            <th class="px-4 py-3 text-right text-sm font-medium">Resta</th>
            <th class="px-4 py-3 text-center text-sm font-medium">Fecha Inicio</th>
            <th class="px-4 py-3 text-center text-sm font-medium">Fecha Fin</th>
            <th class="px-4 py-3 text-center text-sm font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="credit in store.credits" :key="credit.id" class="hover:bg-cloud">
            <td class="px-4 py-3 text-sm text-ink font-medium">{{ credit.nombre }}</td>
            <td class="px-4 py-3 text-center">
              <span :class="['px-2 py-1 rounded-full text-xs font-medium', getStatusClass(credit.estado)]">
                {{ getStatusLabel(credit.estado) }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-ink text-right">{{ formatCurrency(credit.monto) }}</td>
            <td class="px-4 py-3 text-sm text-ink text-right">{{ credit.interes }}%</td>
            <td class="px-4 py-3 text-sm text-ink text-right font-semibold">{{ formatCurrency(credit.montoTotal) }}</td>
            <td class="px-4 py-3 text-sm text-green-600 text-right">{{ formatCurrency(credit.abonado) }}</td>
            <td class="px-4 py-3 text-sm text-amber-600 text-right font-semibold">{{ formatCurrency(credit.resta) }}</td>
            <td class="px-4 py-3 text-sm text-ink text-center">{{ credit.fechaInicio }}</td>
            <td class="px-4 py-3 text-sm text-ink text-center">{{ credit.fechaFin }}</td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-2">
                <button 
                  @click="openPaymentsModal(credit)"
                  class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                  title="Ver abonos"
                >
                  <i class="pi pi-list"></i>
                </button>
                <button 
                  @click="openEditModal(credit)"
                  :disabled="credit.estado !== 'aprobado'"
                  :class="[
                    'p-2 rounded-lg transition',
                    credit.estado === 'aprobado'
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-gray-300 cursor-not-allowed'
                  ]"
                  :title="credit.estado === 'aprobado' ? 'Editar' : 'Solo se puede editar un crédito en estado aprobado'"
                >
                  <i class="pi pi-pencil"></i>
                </button>
                <button 
                  @click="deleteCredit(credit.id)"
                  :disabled="!canDelete(credit)"
                  :class="[
                    'p-2 rounded-lg transition',
                    canDelete(credit) 
                      ? 'text-red-500 hover:bg-red-50' 
                      : 'text-gray-300 cursor-not-allowed'
                  ]"
                  :title="canDelete(credit) ? 'Eliminar' : 'No se puede eliminar un crédito en proceso o completado'"
                >
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Dialog 
      v-model:visible="showModal" 
      :header="isEditing ? 'Editar Crédito' : 'Nuevo Crédito'"
      modal
      class="w-full max-w-lg"
    >
      <div class="space-y-4 p-2">
        <Message v-if="creditError" severity="error" :closable="false">{{ creditError }}</Message>
        <Message v-if="creditSuccess" severity="success" :closable="false">{{ creditSuccess }}</Message>
        
        <div>
          <label class="block text-sm font-medium text-ink mb-1">Nombre</label>
          <InputText v-model="form.nombre" class="w-full" placeholder="Nombre del cliente" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Monto</label>
            <InputNumber v-model="form.monto" mode="currency" currency="MXN" locale="es-MX" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Interés (%)</label>
            <InputNumber v-model="form.interes" suffix="%" class="w-full" />
          </div>
        </div>
        
        <!-- RN-04: Cuenta de origen (solo para nuevo crédito) -->
        <div v-if="!isEditing">
          <label class="block text-sm font-medium text-ink mb-1">Cuenta de origen (RN-04)</label>
          <Select
            v-model="form.origenAccountId"
            :options="cashAccounts"
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccionar Caja o Banco"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-1">El dinero del préstamo saldrá de esta cuenta</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Fecha Inicio</label>
            <InputText v-model="form.fechaInicio" type="date" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Fecha Fin</label>
            <InputText v-model="form.fechaFin" type="date" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button 
            @click="showModal = false"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button 
            @click="saveCredit"
            class="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition"
          >
            {{ isEditing ? 'Guardar' : 'Crear' }}
          </button>
        </div>
      </template>
    </Dialog>

    <!-- Payments Modal -->
    <Dialog 
      v-model:visible="showPaymentsModal" 
      :header="'Abonos de ' + (selectedCredit?.nombre ?? '')"
      modal
      class="w-full max-w-2xl"
    >
      <div class="p-2" v-if="selectedCredit">
        <!-- Status Badge -->
        <div class="flex justify-center mb-4">
          <span :class="['px-3 py-1 rounded-full text-sm font-medium', getStatusClass(selectedCredit.estado)]">
            {{ getStatusLabel(selectedCredit.estado) }}
          </span>
        </div>

        <!-- Summary -->
        <div class="grid grid-cols-3 gap-4 mb-4 p-4 bg-cloud rounded-lg">
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
            <p class="text-lg font-bold text-amber-600">{{ formatCurrency(selectedCredit.resta) }}</p>
          </div>
        </div>

        <!-- Add Payment Form -->
        <div v-if="selectedCredit.estado !== 'completado'" class="mb-4 p-4 border border-dashed border-gray-300 rounded-lg">
          <h3 class="text-sm font-semibold text-ink mb-3">Agregar Nuevo Abono</h3>
          
          <Message v-if="paymentError" severity="error" :closable="false" class="mb-3">{{ paymentError }}</Message>
          <Message v-if="paymentSuccess" severity="success" :closable="false" class="mb-3">{{ paymentSuccess }}</Message>
          
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Monto</label>
              <InputNumber 
                v-model="newPayment.monto" 
                mode="currency" 
                currency="MXN" 
                locale="es-MX" 
                class="w-full"
                :max="maxPaymentAmount"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Cuenta destino (RN-04)</label>
              <Select
                v-model="newPayment.origenAccountId"
                :options="cashAccounts"
                optionLabel="label"
                optionValue="value"
                placeholder="Caja o Banco"
                class="w-full"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Fecha</label>
              <InputText v-model="newPayment.fecha" type="date" class="w-full" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Nota</label>
              <InputText v-model="newPayment.nota" placeholder="Opcional" class="w-full" />
            </div>
          </div>
          <div class="flex justify-end mt-3">
            <button 
              @click="addPayment" 
              :disabled="newPayment.monto <= 0 || !newPayment.origenAccountId"
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition',
                newPayment.monto > 0 && newPayment.origenAccountId
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              ]"
            >
              <i class="pi pi-plus"></i>
              Agregar Abono
            </button>
          </div>
        </div>

        <!-- Completed Message -->
        <div v-else class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <i class="pi pi-check-circle text-3xl text-green-600 mb-2"></i>
          <p class="text-green-700 font-medium">¡Crédito completado!</p>
          <p class="text-sm text-green-600">El cliente ha saldado el total del crédito.</p>
        </div>

        <!-- Payments List -->
        <div v-if="selectedCredit.abonos.length > 0" class="overflow-hidden rounded-lg border border-gray-200">
          <table class="w-full">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-2 text-left text-sm font-medium text-gray-600">#</th>
                <th class="px-4 py-2 text-left text-sm font-medium text-gray-600">Fecha</th>
                <th class="px-4 py-2 text-right text-sm font-medium text-gray-600">Monto</th>
                <th class="px-4 py-2 text-left text-sm font-medium text-gray-600">Nota</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(abono, index) in selectedCredit.abonos" :key="abono.id" class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm text-gray-500">{{ index + 1 }}</td>
                <td class="px-4 py-2 text-sm text-ink">{{ abono.fecha }}</td>
                <td class="px-4 py-2 text-sm text-green-600 text-right font-medium">{{ formatCurrency(abono.monto) }}</td>
                <td class="px-4 py-2 text-sm text-gray-500">{{ abono.nota }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center py-8 text-gray-400">
          <i class="pi pi-inbox text-4xl mb-2"></i>
          <p>No hay abonos registrados</p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <button 
            @click="showPaymentsModal = false"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Cerrar
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
