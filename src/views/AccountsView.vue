<script setup lang="ts">
import { useFinanceStore } from '../stores/finance'

const store = useFinanceStore()

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

const getAccountIcon = (tipo: string) => {
  switch (tipo) {
    case 'activo': return 'pi-chart-line'
    case 'pasivo': return 'pi-credit-card'
    case 'capital': return 'pi-wallet'
    default: return 'pi-folder'
  }
}

const getAccountColor = (tipo: string) => {
  switch (tipo) {
    case 'activo': return 'bg-green-600'
    case 'pasivo': return 'bg-red-600'
    case 'capital': return 'bg-primary'
    default: return 'bg-gray-600'
  }
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-ink">Cuentas Contables</h1>
    </div>

    <!-- Accounts Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="account in store.accounts" 
        :key="account.id"
        class="bg-white rounded-xl shadow-card p-6"
      >
        <div class="flex items-start justify-between mb-4">
          <div :class="[getAccountColor(account.tipo), 'w-12 h-12 rounded-lg flex items-center justify-center']">
            <i :class="['pi', getAccountIcon(account.tipo), 'text-white text-xl']"></i>
          </div>
          <span 
            :class="[
              'px-3 py-1 rounded-full text-xs font-medium uppercase',
              account.tipo === 'activo' ? 'bg-green-100 text-green-700' :
              account.tipo === 'pasivo' ? 'bg-red-100 text-red-700' :
              'bg-primary/10 text-primary'
            ]"
          >
            {{ account.tipo }}
          </span>
        </div>
        <h3 class="text-lg font-semibold text-ink mb-2">{{ account.nombre }}</h3>
        <p class="text-2xl font-bold" :class="account.saldo >= 0 ? 'text-green-600' : 'text-red-600'">
          {{ formatCurrency(account.saldo) }}
        </p>
      </div>
    </div>

    <!-- Summary -->
    <div class="mt-8 bg-white rounded-xl shadow-card p-6">
      <h2 class="text-lg font-semibold text-ink mb-4">Resumen de Cuentas</h2>
      <table class="w-full">
        <thead class="bg-cloud">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium text-ink">Cuenta</th>
            <th class="px-4 py-3 text-center text-sm font-medium text-ink">Tipo</th>
            <th class="px-4 py-3 text-right text-sm font-medium text-ink">Saldo</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="account in store.accounts" :key="account.id" class="hover:bg-cloud">
            <td class="px-4 py-3 text-sm text-ink font-medium">
              <div class="flex items-center gap-2">
                <i :class="['pi', getAccountIcon(account.tipo), 'text-gray-400']"></i>
                {{ account.nombre }}
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <span 
                :class="[
                  'px-2 py-1 rounded text-xs font-medium uppercase',
                  account.tipo === 'activo' ? 'bg-green-100 text-green-700' :
                  account.tipo === 'pasivo' ? 'bg-red-100 text-red-700' :
                  'bg-primary/10 text-primary'
                ]"
              >
                {{ account.tipo }}
              </span>
            </td>
            <td class="px-4 py-3 text-right text-sm font-semibold" :class="account.saldo >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ formatCurrency(account.saldo) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
