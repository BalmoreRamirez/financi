import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DashboardView from '../views/DashboardView.vue'
import CreditsView from '../views/CreditsView.vue'
import InvestmentsView from '../views/InvestmentsView.vue'
import AccountsView from '../views/AccountsView.vue'
import ExpensesView from '../views/ExpensesView.vue'
import CapitalView from '../views/CapitalView.vue'
import LoginView from '../views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/credits',
      name: 'credits',
      component: CreditsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/investments',
      name: 'investments',
      component: InvestmentsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: AccountsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: ExpensesView,
      meta: { requiresAuth: true }
    },
    {
      path: '/capital',
      name: 'capital',
      component: CapitalView,
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guard para proteger rutas
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirigir a login si no está autenticado
    next({ name: 'login' })
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    // Si ya está autenticado, redirigir al dashboard
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
