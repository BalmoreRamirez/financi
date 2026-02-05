import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Payment {
  id: number
  creditId: number
  monto: number
  fecha: string
  nota: string
}

export type CreditStatus = 'aprobado' | 'proceso' | 'completado'

export interface Credit {
  id: number
  nombre: string
  monto: number
  interes: number
  montoTotal: number
  abonado: number
  resta: number
  fechaInicio: string
  fechaFin: string
  estado: CreditStatus
  abonos: Payment[]
}

export interface Investment {
  id: number
  nombre: string
  descripcion: string
  costo: number
  ganancia: number
  total: number
}

export interface LedgerAccount {
  id: number
  nombre: string
  tipo: 'activo' | 'pasivo' | 'capital'
  saldo: number
}

export const useFinanceStore = defineStore('finance', () => {
  // Credits
  const credits = ref<Credit[]>([
    {
      id: 1,
      nombre: 'Juan Pérez',
      monto: 10000,
      interes: 10,
      montoTotal: 11000,
      abonado: 5000,
      resta: 6000,
      fechaInicio: '2024-01-15',
      fechaFin: '2024-07-15',
      estado: 'proceso',
      abonos: [
        { id: 1, creditId: 1, monto: 2000, fecha: '2024-02-15', nota: 'Primer abono' },
        { id: 2, creditId: 1, monto: 1500, fecha: '2024-03-15', nota: 'Segundo abono' },
        { id: 3, creditId: 1, monto: 1500, fecha: '2024-04-15', nota: 'Tercer abono' }
      ]
    },
    {
      id: 2,
      nombre: 'María García',
      monto: 5000,
      interes: 8,
      montoTotal: 5400,
      abonado: 2000,
      resta: 3400,
      fechaInicio: '2024-02-01',
      fechaFin: '2024-08-01',
      estado: 'proceso',
      abonos: [
        { id: 4, creditId: 2, monto: 1000, fecha: '2024-03-01', nota: 'Primer pago' },
        { id: 5, creditId: 2, monto: 1000, fecha: '2024-04-01', nota: 'Segundo pago' }
      ]
    },
    {
      id: 3,
      nombre: 'Carlos López',
      monto: 15000,
      interes: 12,
      montoTotal: 16800,
      abonado: 0,
      resta: 16800,
      fechaInicio: '2024-03-10',
      fechaFin: '2024-09-10',
      estado: 'aprobado',
      abonos: []
    }
  ])

  // Investments
  const investments = ref<Investment[]>([
    {
      id: 1,
      nombre: 'Compra de laptops',
      descripcion: 'Lote de 10 laptops para reventa',
      costo: 50000,
      ganancia: 15000,
      total: 65000
    },
    {
      id: 2,
      nombre: 'Venta de celulares',
      descripcion: 'Importación de smartphones',
      costo: 30000,
      ganancia: 12000,
      total: 42000
    }
  ])

  // Ledger Accounts
  const accounts = ref<LedgerAccount[]>([
    { id: 1, nombre: 'Capital', tipo: 'capital', saldo: 100000 },
    { id: 2, nombre: 'Intereses Ganados', tipo: 'activo', saldo: 0 },
    { id: 3, nombre: 'Préstamos por Cobrar', tipo: 'activo', saldo: 0 }
  ])

  // Computed values
  const totalCredits = computed(() => credits.value.reduce((sum, c) => sum + c.montoTotal, 0))
  const totalPending = computed(() => credits.value.reduce((sum, c) => sum + c.resta, 0))
  const totalInvestments = computed(() => investments.value.reduce((sum, i) => sum + i.total, 0))
  const totalGains = computed(() => investments.value.reduce((sum, i) => sum + i.ganancia, 0))

  // Update account balances
  const updateAccountBalances = () => {
    const interesesAccount = accounts.value.find(a => a.nombre === 'Intereses Ganados')
    const prestamosAccount = accounts.value.find(a => a.nombre === 'Préstamos por Cobrar')
    
    if (interesesAccount) {
      interesesAccount.saldo = credits.value.reduce((sum, c) => sum + (c.montoTotal - c.monto), 0)
    }
    if (prestamosAccount) {
      prestamosAccount.saldo = totalPending.value
    }
  }

  // Actions
  const addCredit = (credit: Omit<Credit, 'id' | 'montoTotal' | 'resta' | 'abonos' | 'estado'>) => {
    const montoTotal = credit.monto + (credit.monto * credit.interes / 100)
    const resta = montoTotal - credit.abonado
    const newCredit: Credit = {
      ...credit,
      id: Date.now(),
      montoTotal,
      resta,
      estado: 'aprobado',
      abonos: []
    }
    credits.value.push(newCredit)
    updateAccountBalances()
  }

  const updateCredit = (id: number, data: Partial<Credit>) => {
    const index = credits.value.findIndex(c => c.id === id)
    if (index === -1) return
    const existing = credits.value[index]
    if (!existing) return
    const updated: Credit = {
      id: existing.id,
      nombre: data.nombre ?? existing.nombre,
      monto: data.monto ?? existing.monto,
      interes: data.interes ?? existing.interes,
      montoTotal: 0,
      abonado: data.abonado ?? existing.abonado,
      resta: 0,
      fechaInicio: data.fechaInicio ?? existing.fechaInicio,
      fechaFin: data.fechaFin ?? existing.fechaFin,
      estado: existing.estado,
      abonos: existing.abonos
    }
    updated.montoTotal = updated.monto + (updated.monto * updated.interes / 100)
    updated.resta = updated.montoTotal - updated.abonado
    credits.value[index] = updated
    updateAccountBalances()
  }

  const deleteCredit = (id: number) => {
    const credit = credits.value.find(c => c.id === id)
    if (credit && credit.estado === 'aprobado') {
      credits.value = credits.value.filter(c => c.id !== id)
      updateAccountBalances()
    }
  }

  const addPayment = (creditId: number, payment: { monto: number; fecha: string; nota: string }) => {
    const credit = credits.value.find(c => c.id === creditId)
    if (!credit) return
    if (credit.estado === 'completado') return
    
    const newPayment: Payment = {
      id: Date.now(),
      creditId,
      monto: payment.monto,
      fecha: payment.fecha,
      nota: payment.nota
    }
    
    credit.abonos.push(newPayment)
    credit.abonado += payment.monto
    credit.resta = credit.montoTotal - credit.abonado
    
    // Update estado based on payments
    if (credit.resta <= 0) {
      credit.estado = 'completado'
      credit.resta = 0
    } else if (credit.abonos.length > 0) {
      credit.estado = 'proceso'
    }
    
    updateAccountBalances()
  }

  const addInvestment = (investment: Omit<Investment, 'id' | 'total'>) => {
    const newInvestment: Investment = {
      ...investment,
      id: Date.now(),
      total: investment.costo + investment.ganancia
    }
    investments.value.push(newInvestment)
  }

  const updateInvestment = (id: number, data: Partial<Investment>) => {
    const index = investments.value.findIndex(i => i.id === id)
    if (index === -1) return
    const existing = investments.value[index]
    if (!existing) return
    const updated: Investment = {
      id: existing.id,
      nombre: data.nombre ?? existing.nombre,
      descripcion: data.descripcion ?? existing.descripcion,
      costo: data.costo ?? existing.costo,
      ganancia: data.ganancia ?? existing.ganancia,
      total: 0
    }
    updated.total = updated.costo + updated.ganancia
    investments.value[index] = updated
  }

  const deleteInvestment = (id: number) => {
    investments.value = investments.value.filter(i => i.id !== id)
  }

  // Initialize balances
  updateAccountBalances()

  return {
    credits,
    investments,
    accounts,
    totalCredits,
    totalPending,
    totalInvestments,
    totalGains,
    addCredit,
    updateCredit,
    deleteCredit,
    addPayment,
    addInvestment,
    updateInvestment,
    deleteInvestment
  }
})
