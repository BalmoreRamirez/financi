import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  username: string
  isAuthenticated: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loginError = ref<string | null>(null)

  // Credenciales válidas
  const validCredentials = {
    username: 'admin',
    password: 'admin'
  }

  const isAuthenticated = computed(() => user.value?.isAuthenticated ?? false)

  const login = (username: string, password: string): boolean => {
    loginError.value = null

    if (username === validCredentials.username && password === validCredentials.password) {
      user.value = {
        username,
        isAuthenticated: true
      }
      // Guardar en localStorage para persistir sesión
      localStorage.setItem('financi_user', JSON.stringify(user.value))
      return true
    } else {
      loginError.value = 'Usuario o contraseña incorrectos'
      return false
    }
  }

  const logout = () => {
    user.value = null
    localStorage.removeItem('financi_user')
  }

  // Restaurar sesión desde localStorage
  const restoreSession = () => {
    const savedUser = localStorage.getItem('financi_user')
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser)
      } catch {
        localStorage.removeItem('financi_user')
      }
    }
  }

  // Restaurar sesión al inicializar
  restoreSession()

  return {
    user,
    loginError,
    isAuthenticated,
    login,
    logout,
    restoreSession
  }
})
