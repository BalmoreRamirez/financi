<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore, type AccountType } from '../stores/finance'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Message from 'primevue/message'
import Paginator from 'primevue/paginator'

const store = useFinanceStore()

// Paginación
const first = ref(0)
const rows = ref(10)

// Modal state
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

// Form data
const formData = ref({
  nombre: '',
  tipo: 'activo' as AccountType,
  saldo: 0
})

// Account type options
const accountTypes = computed(() => [
  { label: 'Activo', value: 'activo' },
  { label: 'Pasivo', value: 'pasivo' },
  { label: 'Ingreso', value: 'ingreso' },
  { label: 'Gasto', value: 'gasto' },
  { label: 'Capital', value: 'capital' }
])

// Orden contable: Activo → Pasivo → Capital → Ingreso → Gasto
const accountTypeOrder: Record<AccountType, number> = {
  activo: 1,
  pasivo: 2,
  capital: 3,
  ingreso: 4,
  gasto: 5
}

const sortedAccounts = computed(() => 
  [...store.accounts].sort((a, b) => accountTypeOrder[a.tipo] - accountTypeOrder[b.tipo])
)

// Cuentas paginadas
const paginatedAccounts = computed(() => {
  const start = first.value
  const end = start + rows.value
  return sortedAccounts.value.slice(start, end)
})

const onPageChange = (event: { first: number; rows: number }) => {
  first.value = event.first
  rows.value = event.rows
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

const getAccountIcon = (tipo: string) => {
  switch (tipo) {
    case 'activo': return 'pi-chart-line'
    case 'pasivo': return 'pi-credit-card'
    case 'capital': return 'pi-wallet'
    case 'ingreso': return 'pi-arrow-down'
    case 'gasto': return 'pi-arrow-up'
    default: return 'pi-folder'
  }
}

const getAccountColor = (tipo: string) => {
  switch (tipo) {
    case 'activo': return 'bg-green-600'
    case 'pasivo': return 'bg-red-600'
    case 'capital': return 'bg-primary'
    case 'ingreso': return 'bg-blue-600'
    case 'gasto': return 'bg-orange-600'
    default: return 'bg-gray-600'
  }
}

const getAccountBadgeClass = (tipo: string) => {
  switch (tipo) {
    case 'activo': return 'bg-green-100 text-green-700'
    case 'pasivo': return 'bg-red-100 text-red-700'
    case 'capital': return 'bg-primary/10 text-primary'
    case 'ingreso': return 'bg-blue-100 text-blue-700'
    case 'gasto': return 'bg-orange-100 text-orange-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const openCreateModal = () => {
  isEditing.value = false
  editingId.value = null
  formData.value = { nombre: '', tipo: 'activo', saldo: 0 }
  errorMessage.value = ''
  successMessage.value = ''
  showModal.value = true
}

const openEditModal = (account: { id: number; nombre: string; tipo: AccountType; saldo: number }) => {
  isEditing.value = true
  editingId.value = account.id
  formData.value = {
    nombre: account.nombre,
    tipo: account.tipo,
    saldo: account.saldo
  }
  errorMessage.value = ''
  successMessage.value = ''
  showModal.value = true
}

const saveAccount = () => {
  if (!formData.value.nombre.trim()) {
    errorMessage.value = 'El nombre de la cuenta es requerido'
    return
  }

  if (isEditing.value && editingId.value) {
    const success = store.updateAccount(editingId.value, formData.value)
    if (success) {
      successMessage.value = 'Cuenta actualizada correctamente'
      setTimeout(() => {
        showModal.value = false
      }, 1000)
    } else {
      errorMessage.value = 'Error al actualizar la cuenta'
    }
  } else {
    store.addAccount(formData.value)
    successMessage.value = 'Cuenta creada correctamente'
    setTimeout(() => {
      showModal.value = false
    }, 1000)
  }
}

const deleteAccount = (id: number) => {
  const result = store.deleteAccount(id)
  if (!result.success) {
    errorMessage.value = result.message
    showModal.value = true
  }
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-ink">Cuentas Contables</h1>
      <button 
        @click="openCreateModal"
        class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition"
      >
        <i class="pi pi-plus"></i>
        Nueva Cuenta
      </button>
    </div>

    <!-- Summary Table -->
    <div class="bg-white rounded-xl shadow-card p-6">
      <table class="w-full">
        <thead class="bg-cloud">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium text-ink">Cuenta</th>
            <th class="px-4 py-3 text-center text-sm font-medium text-ink">Tipo</th>
            <th class="px-4 py-3 text-right text-sm font-medium text-ink">Saldo</th>
            <th class="px-4 py-3 text-center text-sm font-medium text-ink">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="account in paginatedAccounts" :key="account.id" class="hover:bg-cloud">
            <td class="px-4 py-3 text-sm text-ink font-medium">
              <div class="flex items-center gap-2">
                <div :class="[getAccountColor(account.tipo), 'w-8 h-8 rounded-lg flex items-center justify-center']">
                  <i :class="['pi', getAccountIcon(account.tipo), 'text-white text-sm']"></i>
                </div>
                {{ account.nombre }}
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <span 
                :class="[
                  'px-2 py-1 rounded text-xs font-medium uppercase',
                  getAccountBadgeClass(account.tipo)
                ]"
              >
                {{ account.tipo }}
              </span>
            </td>
            <td class="px-4 py-3 text-right text-sm font-semibold" :class="account.saldo >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ formatCurrency(account.saldo) }}
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex justify-center gap-2">
                <button 
                  @click="openEditModal(account)"
                  class="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                >
                  <i class="pi pi-pencil text-sm"></i>
                </button>
                <button 
                  @click="deleteAccount(account.id)"
                  class="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                >
                  <i class="pi pi-trash text-sm"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Paginación -->
      <Paginator
        v-if="sortedAccounts.length > rows"
        :first="first"
        :rows="rows"
        :totalRecords="sortedAccounts.length"
        :rowsPerPageOptions="[10, 20, 50]"
        @page="onPageChange"
        class="border-t border-gray-100"
      />
    </div>

    <!-- Create/Edit Account Modal -->
    <Dialog 
      v-model:visible="showModal" 
      :header="isEditing ? 'Editar Cuenta' : 'Nueva Cuenta Contable'"
      :modal="true"
      :style="{ width: '450px' }"
    >
      <div class="space-y-4">
        <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>
        <Message v-if="successMessage" severity="success" :closable="false">{{ successMessage }}</Message>

        <div class="flex flex-col gap-2">
          <label for="nombre" class="font-medium text-ink">Nombre de la Cuenta</label>
          <InputText 
            id="nombre" 
            v-model="formData.nombre" 
            placeholder="Ej: Caja Chica, Banco, etc."
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="tipo" class="font-medium text-ink">Tipo de Cuenta</label>
          <Select
            id="tipo"
            v-model="formData.tipo"
            :options="accountTypes"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecciona el tipo"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="saldo" class="font-medium text-ink">Saldo Inicial</label>
          <InputNumber 
            id="saldo" 
            v-model="formData.saldo" 
            mode="currency" 
            currency="MXN" 
            locale="es-MX"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button 
            label="Cancelar" 
            severity="secondary" 
            @click="showModal = false"
          />
          <Button 
            :label="isEditing ? 'Actualizar' : 'Crear Cuenta'" 
            icon="pi pi-check"
            @click="saveAccount"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
