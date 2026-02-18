<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false) // Para drawer en móvil/tablet
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

function updateWindowWidth() {
  windowWidth.value = window.innerWidth
}

import { onMounted } from 'vue'
if (typeof window !== 'undefined') {
  onMounted(() => {
    updateWindowWidth()
    window.addEventListener('resize', updateWindowWidth)
  })
}

import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateWindowWidth)
  }
})

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
    <!-- Topbar para móvil/tablet -->
    <div class="flex items-center justify-between bg-ink text-white px-4 py-3 shadow z-20 w-full fixed top-0 left-0 md:hidden">
      <button v-if="windowWidth <= 769" @click="sidebarOpen = true" class="p-2 focus:outline-none">
        <i class="pi pi-bars text-2xl"></i>
      </button>
      <span class="font-bold text-lg">Financi</span>
      <div></div>
    </div>

    <!-- Sidebar Desktop & Drawer Mobile -->
    <aside
      :class="[
        'bg-ink text-white transition-all duration-300 flex flex-col z-30',
        windowWidth <= 768 ? 'fixed top-0 left-0 h-full' : 'md:static md:relative md:h-auto min-h-screen',
        sidebarCollapsed && windowWidth > 768 ? 'w-16' : 'w-64',
        windowWidth <= 768 ? (sidebarOpen ? 'block translate-x-0' : 'hidden -translate-x-full') : 'md:block md:translate-x-0 md:transform-none',
        windowWidth <= 768 ? 'shadow-lg' : 'md:shadow-none',
        'transform',
        'z-30'
      ]"
      :style="windowWidth <= 768 ? { top: sidebarOpen ? '0' : '', left: sidebarOpen ? '0' : '' } : {}"
    >
      <!-- Logo y cerrar en móvil -->
      <div class="p-4 border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center gap-3 cursor-pointer select-none" @click="windowWidth >= 768 ? sidebarCollapsed = !sidebarCollapsed : null">
          <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <i class="pi pi-dollar text-white text-xl"></i>
          </div>
          <span v-if="!sidebarCollapsed" class="text-xl font-bold">Financi</span>
        </div>
        <button v-if="sidebarOpen && windowWidth < 768" @click="sidebarOpen = false" class="md:hidden p-2 ml-2">
          <i class="pi pi-times text-2xl"></i>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4">
        <ul class="space-y-2">
          <li v-for="item in menuItems" :key="item.path">
            <RouterLink 
              :to="item.path"
              @click.native="sidebarOpen = false"
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
          class="w-full flex items-center justify-start gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <i class="pi pi-sign-out"></i>
          <span v-if="!sidebarCollapsed">Cerrar Sesión</span>
        </button>
        <!-- Botón de colapsar eliminado, ahora se usa el logo/nombre -->
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto  pt-14 md:pt-0">
      <RouterView />
    </main>
  </div>
</template>
