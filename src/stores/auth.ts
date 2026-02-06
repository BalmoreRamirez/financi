import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  type User as FirebaseUser 
} from 'firebase/auth'
import { auth } from '../firebase/config'

export interface User {
  email: string
  uid: string
  isAuthenticated: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loginError = ref<string | null>(null)
  const isLoading = ref(true) // Para esperar a que Firebase verifique el estado

  const isAuthenticated = computed(() => user.value?.isAuthenticated ?? false)

  // Escuchar cambios de autenticación de Firebase
  const initAuthListener = () => {
    onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        user.value = {
          email: firebaseUser.email || '',
          uid: firebaseUser.uid,
          isAuthenticated: true
        }
      } else {
        user.value = null
      }
      isLoading.value = false
    })
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    loginError.value = null
    
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (error: any) {
      console.error('Error de login:', error)
      
      // Mensajes de error amigables
      switch (error.code) {
        case 'auth/user-not-found':
          loginError.value = 'Usuario no encontrado'
          break
        case 'auth/wrong-password':
          loginError.value = 'Contraseña incorrecta'
          break
        case 'auth/invalid-email':
          loginError.value = 'Email inválido'
          break
        case 'auth/invalid-credential':
          loginError.value = 'Credenciales inválidas'
          break
        case 'auth/too-many-requests':
          loginError.value = 'Demasiados intentos. Intente más tarde'
          break
        default:
          loginError.value = 'Error al iniciar sesión'
      }
      return false
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      user.value = null
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Inicializar el listener al crear el store
  initAuthListener()

  return {
    user,
    loginError,
    isLoading,
    isAuthenticated,
    login,
    logout
  }
})
