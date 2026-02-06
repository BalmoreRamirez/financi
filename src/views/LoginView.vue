<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  
  const success = authStore.login(username.value, password.value)
  
  if (success) {
    router.push('/')
  }
  
  isLoading.value = false
}

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleLogin()
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
      <!-- Logo/Header -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
          <i class="pi pi-wallet text-white text-3xl"></i>
        </div>
        <h1 class="text-2xl font-bold text-ink">Financi</h1>
        <p class="text-gray-500 mt-1">Sistema de Gestión Financiera</p>
      </div>

      <!-- Error Message -->
      <Message v-if="authStore.loginError" severity="error" :closable="false" class="mb-4">
        {{ authStore.loginError }}
      </Message>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
          <div class="relative">
            <i class="pi pi-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <InputText 
              v-model="username"
              placeholder="Ingrese su usuario"
              class="w-full pl-10"
              @keypress="handleKeyPress"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
          <div class="relative">
            <i class="pi pi-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"></i>
            <Password 
              v-model="password"
              placeholder="Ingrese su contraseña"
              :feedback="false"
              toggleMask
              class="w-full"
              inputClass="w-full pl-10"
              @keypress="handleKeyPress"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading || !username || !password"
          class="w-full py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          <i v-if="isLoading" class="pi pi-spinner pi-spin"></i>
          <span>{{ isLoading ? 'Ingresando...' : 'Iniciar Sesión' }}</span>
        </button>
      </form>

      <!-- Footer -->
      <p class="text-center text-gray-400 text-sm mt-8">
        © 2026 Financi. Todos los derechos reservados.
      </p>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-password) {
  width: 100%;
}

:deep(.p-password-input) {
  width: 100%;
}
</style>
