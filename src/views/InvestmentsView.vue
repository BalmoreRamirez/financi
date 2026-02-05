<script setup lang="ts">
import { ref } from 'vue'
import { useFinanceStore, type Investment } from '../stores/finance'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'

const store = useFinanceStore()

const showModal = ref(false)
const editingInvestment = ref<Investment | null>(null)
const isEditing = ref(false)

const form = ref({
  nombre: '',
  descripcion: '',
  costo: 0,
  ganancia: 0
})

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
    ganancia: 0
  }
  showModal.value = true
}

const openEditModal = (investment: Investment) => {
  isEditing.value = true
  editingInvestment.value = investment
  form.value = {
    nombre: investment.nombre,
    descripcion: investment.descripcion,
    costo: investment.costo,
    ganancia: investment.ganancia
  }
  showModal.value = true
}

const saveInvestment = () => {
  if (isEditing.value && editingInvestment.value) {
    store.updateInvestment(editingInvestment.value.id, form.value)
  } else {
    store.addInvestment(form.value)
  }
  showModal.value = false
}

const deleteInvestment = (id: number) => {
  if (confirm('¿Estás seguro de eliminar esta inversión?')) {
    store.deleteInvestment(id)
  }
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-ink">Inversiones</h1>
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
            <th class="px-4 py-3 text-right text-sm font-medium">Ganancia</th>
            <th class="px-4 py-3 text-right text-sm font-medium">Total</th>
            <th class="px-4 py-3 text-center text-sm font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="investment in store.investments" :key="investment.id" class="hover:bg-cloud">
            <td class="px-4 py-3 text-sm text-ink font-medium">{{ investment.nombre }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ investment.descripcion }}</td>
            <td class="px-4 py-3 text-sm text-ink text-right">{{ formatCurrency(investment.costo) }}</td>
            <td class="px-4 py-3 text-sm text-green-600 text-right font-semibold">{{ formatCurrency(investment.ganancia) }}</td>
            <td class="px-4 py-3 text-sm text-primary text-right font-bold">{{ formatCurrency(investment.total) }}</td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-2">
                <button 
                  @click="openEditModal(investment)"
                  class="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                >
                  <i class="pi pi-pencil"></i>
                </button>
                <button 
                  @click="deleteInvestment(investment.id)"
                  class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
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
      :header="isEditing ? 'Editar Inversión' : 'Nueva Inversión'"
      modal
      class="w-full max-w-lg"
    >
      <div class="space-y-4 p-2">
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
            <label class="block text-sm font-medium text-ink mb-1">Ganancia</label>
            <InputNumber v-model="form.ganancia" mode="currency" currency="MXN" locale="es-MX" class="w-full" />
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
            @click="saveInvestment"
            class="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition"
          >
            {{ isEditing ? 'Guardar' : 'Crear' }}
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
