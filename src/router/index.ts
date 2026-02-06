import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import CreditsView from '../views/CreditsView.vue'
import InvestmentsView from '../views/InvestmentsView.vue'
import AccountsView from '../views/AccountsView.vue'
import ExpensesView from '../views/ExpensesView.vue'
import CapitalView from '../views/CapitalView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/credits',
      name: 'credits',
      component: CreditsView
    },
    {
      path: '/investments',
      name: 'investments',
      component: InvestmentsView
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: AccountsView
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: ExpensesView
    },
    {
      path: '/capital',
      name: 'capital',
      component: CapitalView
    }
  ]
})

export default router
