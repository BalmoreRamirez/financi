<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const sidebarCollapsed = ref(false)

const menuItems = [
  { name: 'Dashboard', path: '/', icon: 'pi-home' },
  { name: 'Créditos', path: '/credits', icon: 'pi-money-bill' },
  { name: 'Inversiones', path: '/investments', icon: 'pi-chart-line' },
  { name: 'Gastos', path: '/expenses', icon: 'pi-arrow-up' },
  { name: 'Capital', path: '/capital', icon: 'pi-building-columns' },
  { name: 'Cuentas', path: '/accounts', icon: 'pi-wallet' }
]

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <!-- Loading State mientras Firebase verifica autenticación -->
  <div v-if="authStore.isLoading" class="min-h-screen bg-cloud flex items-center justify-center">
    <div class="text-center">
      <i class="pi pi-spinner pi-spin text-4xl text-primary mb-4"></i>
      <p class="text-gray-500">Cargando...</p>
    </div>
  </div>

  <!-- Login View (sin sidebar) -->
  <div v-else-if="!authStore.isAuthenticated">
    <RouterView />
  </div>

  <!-- App Layout (con sidebar) -->
  <div v-else class="flex min-h-screen bg-cloud">
    <!-- Sidebar -->
    <aside 
      :class="[
        'bg-ink text-white transition-all duration-300 flex flex-col',
        sidebarCollapsed ? 'w-16' : 'w-64'
      ]"
    >
      <!-- Logo -->
      <div class="p-4 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <i class="pi pi-dollar text-white text-xl"></i>
          </div>
          <span v-if="!sidebarCollapsed" class="text-xl font-bold">Financi</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4">
        <ul class="space-y-2">
          <li v-for="item in menuItems" :key="item.path">
            <RouterLink 
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                route.path === item.path 
                  ? 'bg-primary text-white' 
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              ]"
            >
              <i :class="['pi', item.icon, 'text-lg']"></i>
              <span v-if="!sidebarCollapsed">{{ item.name }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>

      <!-- User & Logout -->
      <div class="p-4 border-t border-white/10 space-y-2">
        <!-- User info -->
        <div v-if="!sidebarCollapsed" class="flex items-center gap-2 px-3 py-2 text-gray-300">
          <i class="pi pi-user"></i>
          <span class="text-sm truncate">{{ authStore.user?.email }}</span>
        </div>
        
        <!-- Logout button -->
        <button 
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <i class="pi pi-sign-out"></i>
          <span v-if="!sidebarCollapsed">Cerrar Sesión</span>
        </button>

        <!-- Collapse Button -->
        <button 
          @click="sidebarCollapsed = !sidebarCollapsed"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <i :class="['pi', sidebarCollapsed ? 'pi-angle-right' : 'pi-angle-left']"></i>
          <span v-if="!sidebarCollapsed">Colapsar</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <RouterView />
    </main>
  </div>
</template>
