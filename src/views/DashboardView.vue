<script setup lang="ts">
import { useFinanceStore } from '../stores/finance'
import { computed } from 'vue'
import ViewTitle from '../components/ViewTitle.vue'

const store = useFinanceStore()

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

const summaryCards = computed(() => [
  {
    title: 'Capital',
    value: store.accounts.find(a => a.nombre === 'Capital')?.saldo ?? 0,
    icon: 'pi-wallet',
    color: 'bg-primary'
  },
  {
    title: 'Intereses Ganados',
    value: store.accounts.find(a => a.nombre === 'Intereses Ganados')?.saldo ?? 0,
    icon: 'pi-percentage',
    color: 'bg-green-600'
  },
  {
    title: 'Préstamos por Cobrar',
    value: store.accounts.find(a => a.nombre === 'Préstamos por Cobrar')?.saldo ?? 0,
    icon: 'pi-money-bill',
    color: 'bg-amber-600'
  },
  {
    title: 'Inventario Inversiones',
    value: store.accounts.find(a => a.nombre === 'Inventario Inversiones')?.saldo ?? 0,
    icon: 'pi-chart-line',
    color: 'bg-blue-600'
  }
])

// Gastos operativos recientes
const recentExpenses = computed(() => {
  return store.transactions
    .filter(t => t.detalles.some(d => d.accountName === 'Gastos Operativos'))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 3)
})
</script>

<template>
  <div class="p-4 sm:p-6">
    <ViewTitle title="Dashboard" class="mb-6" />
    
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div 
        v-for="card in summaryCards" 
        :key="card.title"
        class="bg-white rounded-xl shadow-card p-6"
      >
        <div class="flex items-center gap-4">
          <div :class="[card.color, 'w-12 h-12 rounded-lg flex items-center justify-center']">
            <i :class="['pi', card.icon, 'text-white text-xl']"></i>
          </div>
          <div>
            <p class="text-sm text-gray-500">{{ card.title }}</p>
            <p class="text-xl font-bold text-ink">{{ formatCurrency(card.value) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent Credits -->
      <div class="bg-white rounded-xl shadow-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-ink">Créditos Recientes</h2>
          <RouterLink to="/credits" class="text-primary hover:underline text-sm">
            Ver todos <i class="pi pi-arrow-right text-xs"></i>
          </RouterLink>
        </div>
        <div class="space-y-3">
          <div 
            v-for="credit in store.credits.slice(0, 3)" 
            :key="credit.id"
            class="flex items-center justify-between p-3 bg-cloud rounded-lg"
          >
            <div class="flex items-center gap-3">
              <i class="pi pi-user text-primary"></i>
              <div>
                <p class="font-medium text-ink">{{ credit.nombre }}</p>
                <p class="text-xs text-gray-500">Vence: {{ credit.fechaFin }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-semibold text-ink">{{ formatCurrency(credit.resta) }}</p>
              <p class="text-xs text-gray-500">pendiente</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Investments -->
      <div class="bg-white rounded-xl shadow-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-ink">Inversiones Recientes</h2>
          <RouterLink to="/investments" class="text-primary hover:underline text-sm">
            Ver todos <i class="pi pi-arrow-right text-xs"></i>
          </RouterLink>
        </div>
        <div class="space-y-3">
          <div 
            v-for="investment in store.investments.slice(0, 3)" 
            :key="investment.id"
            class="flex items-center justify-between p-3 bg-cloud rounded-lg"
          >
            <div class="flex items-center gap-3">
              <i class="pi pi-briefcase text-primary"></i>
              <div>
                <p class="font-medium text-ink">{{ investment.nombre }}</p>
                <p class="text-xs text-gray-500">{{ investment.descripcion.substring(0, 30) }}...</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-semibold" :class="investment.vendida ? 'text-green-600' : 'text-orange-500'">
                {{ investment.vendida ? '+' : '~' }}{{ formatCurrency(investment.vendida ? investment.gananciaReal : investment.gananciaEstimada) }}
              </p>
              <p class="text-xs text-gray-500">{{ investment.vendida ? 'realizada' : 'estimada' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Expenses -->
      <div class="bg-white rounded-xl shadow-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-ink">Gastos Recientes</h2>
          <RouterLink to="/expenses" class="text-primary hover:underline text-sm">
            Ver todos <i class="pi pi-arrow-right text-xs"></i>
          </RouterLink>
        </div>
        <div v-if="recentExpenses.length === 0" class="text-center py-8">
          <i class="pi pi-inbox text-4xl text-gray-300 mb-3"></i>
          <p class="text-gray-500 text-sm">No hay gastos registrados</p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="expense in recentExpenses"
            :key="expense.id"
            class="flex items-center justify-between p-3 bg-cloud rounded-lg"
          >
            <div class="flex items-center gap-3">
              <i class="pi pi-arrow-up-right text-orange-600"></i>
              <div>
                <p class="font-medium text-ink text-sm">{{ expense.descripcion }}</p>
                <p class="text-xs text-gray-500">{{ new Date(expense.fecha).toLocaleDateString('es-MX') }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-semibold text-orange-600">-{{ formatCurrency(expense.totalDebe) }}</p>
              <p class="text-xs text-gray-500">gasto</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
