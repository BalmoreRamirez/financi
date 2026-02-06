<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore, type Investment } from '../stores/finance'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Message from 'primevue/message'

const store = useFinanceStore()

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
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-ink">Inversiones</h1>
        <p class="text-sm text-gray-500 mt-1">
          Ganancia estimada: {{ formatCurrency(store.totalEstimatedGains) }} | 
          Ganancia realizada: {{ formatCurrency(store.totalGains) }}
        </p>
      </div>
      <button 
        @click="openNewModal"
        class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition"
      >
        <i class="pi pi-plus"></i>
        Nueva Inversión
      </button>
    </div>

    <!-- Investments Table -->
    <div class="bg-white rounded-xl shadow-card overflow-hidden">
      <table class="w-full">
        <thead class="bg-ink text-white">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium">Nombre</th>
            <th class="px-4 py-3 text-left text-sm font-medium">Descripción</th>
            <th class="px-4 py-3 text-right text-sm font-medium">Costo</th>
            <th class="px-4 py-3 text-right text-sm font-medium">Gan. Estimada</th>
            <th class="px-4 py-3 text-right text-sm font-medium">Gan. Real</th>
            <th class="px-4 py-3 text-center text-sm font-medium">Estado</th>
            <th class="px-4 py-3 text-center text-sm font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="investment in store.investments" :key="investment.id" class="hover:bg-cloud">
            <td class="px-4 py-3 text-sm text-ink font-medium">{{ investment.nombre }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ investment.descripcion }}</td>
            <td class="px-4 py-3 text-sm text-ink text-right">{{ formatCurrency(investment.costo) }}</td>
            <td class="px-4 py-3 text-sm text-orange-500 text-right">{{ formatCurrency(investment.gananciaEstimada) }}</td>
            <td class="px-4 py-3 text-sm text-green-600 text-right font-semibold">
              {{ investment.vendida ? formatCurrency(investment.gananciaReal) : '-' }}
            </td>
            <td class="px-4 py-3 text-center">
              <span 
                :class="[
                  'px-2 py-1 rounded-full text-xs font-medium',
                  investment.vendida ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                ]"
              >
                {{ investment.vendida ? 'Vendida' : 'Activa' }}
              </span>
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-2">
                <button 
                  v-if="!investment.vendida"
                  @click="openSellModal(investment)"
                  class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                  title="Vender inversión"
                >
                  <i class="pi pi-dollar"></i>
                </button>
                <button 
                  v-if="!investment.vendida"
                  @click="openEditModal(investment)"
                  class="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                >
                  <i class="pi pi-pencil"></i>
                </button>
                <button 
                  v-if="!investment.vendida"
                  @click="deleteInvestment(investment.id)"
                  class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <i class="pi pi-trash"></i>
                </button>
                <span v-if="investment.vendida" class="text-xs text-gray-400">
                  {{ investment.fechaVenta }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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
        <div class="grid grid-cols-2 gap-4">
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
          />
          <p class="text-xs text-gray-500 mt-1">El dinero de la inversión saldrá de esta cuenta</p>
        </div>
        
        <Message severity="info" :closable="false">
          RN-03: La ganancia solo se realizará cuando vendas la inversión.
        </Message>
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
            @click="saveInvestment"
            class="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition"
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
          />
          <p class="text-xs text-gray-500 mt-1">El ingreso debe ir a Caja o Banco</p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button 
            @click="showSellModal = false"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button 
            @click="confirmSell"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
          >
            <i class="pi pi-check mr-2"></i>Confirmar Venta
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
