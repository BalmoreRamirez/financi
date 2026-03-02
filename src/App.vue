<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false) // Para drawer en móvil/tablet
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const profileMenuOpen = ref(false)

function updateWindowWidth() {
  windowWidth.value = window.innerWidth
}

const toggleProfileMenu = () => {
  profileMenuOpen.value = !profileMenuOpen.value
}

const closeProfileMenu = () => {
  profileMenuOpen.value = false
}

const handleProfileClickOutside = (event: MouseEvent) => {
  const target = event.target as Element | null
  if (target?.closest('[data-profile-menu]')) return
  if (profileMenuOpen.value) {
    closeProfileMenu()
  }
}

import { onMounted } from 'vue'
if (typeof window !== 'undefined') {
  onMounted(() => {
    updateWindowWidth()
    window.addEventListener('resize', updateWindowWidth)
    document.addEventListener('click', handleProfileClickOutside)
  })
}

import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateWindowWidth)
    document.removeEventListener('click', handleProfileClickOutside)
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

const userDisplayName = computed(() => {
  const displayName = authStore.user?.displayName?.trim()
  if (displayName) return displayName

  const email = authStore.user?.email ?? ''
  const emailName = email.split('@')[0] ?? ''
  return emailName || 'Usuario'
})

const userInitial = computed(() => {
  const name = userDisplayName.value.trim()
  return name ? name.charAt(0).toUpperCase() : 'U'
})
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
      <div data-profile-menu class="relative">
        <button
          @click.stop="toggleProfileMenu"
          class="flex items-center gap-2 max-w-[140px] rounded-lg px-2 py-1 hover:bg-white/10 transition"
        >
          <div class="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-xs font-semibold">
            <span>{{ userInitial }}</span>
          </div>
          <span class="text-xs font-medium truncate">{{ userDisplayName }}</span>
        </button>

        <div
          v-if="profileMenuOpen"
          class="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
        >
          <button
            @click="closeProfileMenu(); handleLogout()"
            class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <i class="pi pi-sign-out"></i>
            Cerrar sesión
          </button>
        </div>
      </div>
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

      <div class="p-4 border-t border-white/10"></div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto  pt-14 md:pt-0">
      <div class="hidden md:flex items-center justify-end bg-white border-b border-gray-200 px-6 py-3">
        <div data-profile-menu class="relative">
          <button
            @click.stop="toggleProfileMenu"
            class="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition"
          >
            <img
              v-if="authStore.user?.photoURL"
              :src="authStore.user.photoURL"
              alt="Foto de perfil"
              class="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
            <div
              v-else
              class="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-semibold"
            >
              {{ userInitial }}
            </div>

            <div class="text-right leading-tight">
              <p class="text-sm font-semibold text-ink">{{ userDisplayName }}</p>
              <p class="text-xs text-gray-500 truncate max-w-[220px]">{{ authStore.user?.email }}</p>
            </div>
            <i class="pi pi-chevron-down text-xs text-gray-500"></i>
          </button>

          <div
            v-if="profileMenuOpen"
            class="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          >
            <button
              @click="closeProfileMenu(); handleLogout()"
              class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <i class="pi pi-sign-out"></i>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
      <RouterView />
    </main>
  </div>
</template>
