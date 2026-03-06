<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore, type AccountType } from '../stores/finance'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
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

// Modal state
const showModal = ref(false)
const showMovementsModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
const selectedAccount = ref<{ id: number; nombre: string; descripcion?: string; tipo: AccountType; saldo: number } | null>(null)

// Form data
const formData = ref({
  nombre: '',
  descripcion: '',
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
  formData.value = { nombre: '', descripcion: '', tipo: 'activo', saldo: 0 }
  errorMessage.value = ''
  successMessage.value = ''
  showModal.value = true
}

const openEditModal = (account: { id: number; nombre: string; descripcion?: string; tipo: AccountType; saldo: number }) => {
  isEditing.value = true
  editingId.value = account.id
  formData.value = {
    nombre: account.nombre,
    descripcion: account.descripcion || '',
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

const accountTableData = computed(() => {
  return paginatedAccounts.value.map((account) => ({
    Cuenta: {
      type: 'click',
      text: account.nombre,
      icon: 'pi-history',
      action: 'view-movements',
      class: 'font-medium text-primary hover:underline'
    },
    Descripción: account.descripcion || '-',
    Tipo: { type: 'badge', label: account.tipo.toUpperCase(), class: getAccountBadgeClass(account.tipo), align: 'center' },
    Saldo: {
      text: formatCurrency(account.saldo),
      align: 'right',
      class: account.saldo >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
    },
    Acciones: {
      type: 'actions',
      actions: [
        {
          key: 'edit',
          icon: 'pi-pencil',
          title: account.protegida ? 'Cuenta protegida' : 'Editar',
          disabled: !!account.protegida,
          class: 'text-primary hover:bg-primary/10'
        },
        {
          key: 'delete',
          icon: 'pi-trash',
          title: account.protegida ? 'Cuenta protegida' : 'Eliminar',
          disabled: !!account.protegida,
          class: 'text-red-500 hover:bg-red-50'
        }
      ]
    },
    __raw: account
  }))
})

const onAccountTableAction = (payload: { action: string; row: Record<string, unknown> }) => {
  const account = payload.row.__raw as { id: number; nombre: string; descripcion?: string; tipo: AccountType; saldo: number } | undefined
  if (!account) return

  if (payload.action === 'view-movements') {
    selectedAccount.value = account
    showMovementsModal.value = true
    return
  }

  if (payload.action === 'edit') openEditModal(account)
  if (payload.action === 'delete') deleteAccount(account.id)
}

const formatDate = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const accountMovements = computed(() => {
  if (!selectedAccount.value) return []

  const movementsAsc = [...store.transactions]
    .filter(tx => tx.detalles.some(d => d.accountId === selectedAccount.value?.id))
    .sort((a, b) => {
      const byDate = new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      if (byDate !== 0) return byDate
      const aCreatedAt = new Date(a.createdAt).getTime()
      const bCreatedAt = new Date(b.createdAt).getTime()
      return aCreatedAt - bCreatedAt
    })
    .map(tx => {
      const detail = tx.detalles.find(d => d.accountId === selectedAccount.value?.id)
      const debe = detail?.debe ?? 0
      const haber = detail?.haber ?? 0

      const accountType = selectedAccount.value?.tipo
      const netEffect = accountType === 'activo' || accountType === 'gasto'
        ? debe - haber
        : haber - debe

      return {
        id: tx.id,
        fecha: tx.fecha,
        descripcion: tx.descripcion,
        debe,
        haber,
        netEffect
      }
    })

  const totalEffect = movementsAsc.reduce((sum, movement) => sum + movement.netEffect, 0)
  let runningBalance = selectedAccount.value.saldo - totalEffect

  const movementsWithBalances = movementsAsc.map((movement) => {
    const saldoAntes = runningBalance
    const saldoDespues = saldoAntes + movement.netEffect
    runningBalance = saldoDespues

    return {
      ...movement,
      saldoAntes,
      saldoDespues,
      alimenta: movement.netEffect >= 0
    }
  })

  return movementsWithBalances.reverse()
})

const closeMovementsModal = () => {
  showMovementsModal.value = false
  selectedAccount.value = null
}
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
      <ViewTitle title="Cuentas Contables" />
      <button 
        @click="openCreateModal"
        class="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition"
      >
        <i class="pi pi-plus"></i>
        Nueva Cuenta
      </button>
    </div>

    <!-- Summary Table -->
    <div class="bg-white rounded-xl shadow-card overflow-x-auto">
      <TableComponents
        :data="accountTableData"
        @action="onAccountTableAction"
      />
      
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
          <label for="descripcion" class="font-medium text-ink">Descripción de los fondos</label>
          <InputText 
            id="descripcion" 
            v-model="formData.descripcion" 
            placeholder="Describe brevemente el origen o uso de los fondos"
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
            :pt="unifiedSelectPt"
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
        <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 w-full">
          <button
            @click="showModal = false"
            class="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            @click="saveAccount"
            class="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition inline-flex items-center justify-center gap-2"
          >
            <i class="pi pi-check"></i>
            {{ isEditing ? 'Actualizar' : 'Crear Cuenta' }}
          </button>
        </div>
      </template>
    </Dialog>

    <!-- Movimientos por cuenta -->
    <Dialog
      v-model:visible="showMovementsModal"
      :header="selectedAccount ? `Movimientos - ${selectedAccount.nombre}` : 'Movimientos de Cuenta'"
      :modal="true"
      :style="{ width: '800px' }"
      @hide="closeMovementsModal"
    >
      <div class="space-y-4" v-if="selectedAccount">
        <div class="bg-gray-50 rounded-lg p-4 text-sm">
          <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p class="text-gray-700">
              <span class="font-medium">Tipo:</span> {{ selectedAccount.tipo.toUpperCase() }}
            </p>
            <p class="text-gray-700">
              <span class="font-medium">Saldo actual:</span> {{ formatCurrency(selectedAccount.saldo) }}
            </p>
          </div>
        </div>

        <div v-if="accountMovements.length === 0" class="text-center py-8 text-gray-500">
          No hay movimientos para esta cuenta.
        </div>

        <div v-else class="border border-gray-200 rounded-lg overflow-hidden">
          <div class="grid grid-cols-12 gap-2 bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700">
            <span class="col-span-2">Fecha</span>
            <span class="col-span-4">Descripción</span>
            <span class="col-span-2 text-right">Debe</span>
            <span class="col-span-2 text-right">Haber</span>
            <span class="col-span-2 text-right">Antes / Después</span>
          </div>

          <div
            v-for="movement in accountMovements"
            :key="movement.id"
            class="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-t border-gray-100"
          >
            <span class="col-span-2 text-gray-600">{{ formatDate(movement.fecha) }}</span>
            <span class="col-span-4 text-gray-800 truncate" :title="movement.descripcion">{{ movement.descripcion }}</span>
            <span class="col-span-2 text-right text-gray-800">{{ movement.debe > 0 ? formatCurrency(movement.debe) : '-' }}</span>
            <span class="col-span-2 text-right text-gray-800">{{ movement.haber > 0 ? formatCurrency(movement.haber) : '-' }}</span>
            <span
              class="col-span-2 text-right"
            >
              <span class="block text-xs text-gray-500">{{ formatCurrency(movement.saldoAntes) }}</span>
              <span
                class="block font-medium"
                :class="movement.alimenta ? 'text-green-600' : 'text-red-600'"
              >
                {{ formatCurrency(movement.saldoDespues) }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="closeMovementsModal"
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
        >
          Cerrar
        </button>
      </template>
    </Dialog>
  </div>
</template>
