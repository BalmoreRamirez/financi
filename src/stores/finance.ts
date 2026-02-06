import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  subscribeToCredits,
  subscribeToInvestments,
  subscribeToAccounts,
  subscribeToTransactions,
  addCreditToFirestore,
  updateCreditInFirestore,
  deleteCreditFromFirestore,
  addInvestmentToFirestore,
  updateInvestmentInFirestore,
  deleteInvestmentFromFirestore,
  addAccountToFirestore,
  updateAccountInFirestore,
  deleteAccountFromFirestore,
  addTransactionToFirestore
} from '../firebase/services'

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
  firestoreId?: string  // Firebase document ID
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
  firestoreId?: string  // Firebase document ID
  nombre: string
  descripcion: string
  costo: number
  gananciaEstimada: number  // RN-03: Ganancia estimada (no realizada)
  gananciaReal: number      // RN-03: Ganancia real (solo cuando se vende)
  total: number
  vendida: boolean          // RN-03: Estado de venta
  fechaVenta?: string       // Fecha de venta
}

// RF-12: Tipos de cuenta contable
export type AccountType = 'activo' | 'pasivo' | 'ingreso' | 'gasto' | 'capital'

// RF-11: Cuentas contables dinámicas
export interface LedgerAccount {
  id: number
  firestoreId?: string  // Firebase document ID
  nombre: string
  tipo: AccountType
  saldo: number
  createdAt: string
}

// RF-15: Detalle de cuenta afectada en una transacción
export interface TransactionDetail {
  accountId: number
  accountName: string
  debe: number
  haber: number
}

// RF-14, RF-15, RF-16: Transacción contable
export interface Transaction {
  id: number
  firestoreId?: string  // Firebase document ID
  fecha: string
  descripcion: string
  detalles: TransactionDetail[]
  totalDebe: number
  totalHaber: number
  createdAt: string // RF-16: Inmutabilidad - timestamp de creación
}

// Cierre contable mensual
export interface AccountingClosure {
  id: number
  mes: number // 1-12
  anio: number
  fecha: string // Fecha en que se realizó el cierre
  interesesGanados: number
  gananciaInversiones: number
  totalIngresos: number
  totalGastos: number
  utilidadNeta: number
  transactionId: number // ID de la transacción de cierre
}

export const useFinanceStore = defineStore('finance', () => {
  // Firebase sync state
  const isLoading = ref(true)
  const isInitialized = ref(false)
  const syncError = ref<string | null>(null)

  // Reactive data (synced with Firebase - no static data)
  const credits = ref<Credit[]>([])
  const investments = ref<Investment[]>([])
  const accounts = ref<LedgerAccount[]>([])
  const transactions = ref<Transaction[]>([])

  // Firebase subscriptions
  let unsubscribeCredits: (() => void) | null = null
  let unsubscribeInvestments: (() => void) | null = null
  let unsubscribeAccounts: (() => void) | null = null
  let unsubscribeTransactions: (() => void) | null = null

  // Initialize Firebase subscriptions (no static data initialization)
  const initializeFirebase = async () => {
    try {
      isLoading.value = true
      syncError.value = null

      // Subscribe to real-time updates from Firebase
      unsubscribeCredits = subscribeToCredits((data) => {
        credits.value = data.map((c, index) => ({ ...c, id: c.id || index + 1 }))
      })

      unsubscribeInvestments = subscribeToInvestments((data) => {
        investments.value = data.map((i, index) => ({ ...i, id: i.id || index + 1 }))
      })

      unsubscribeAccounts = subscribeToAccounts((data) => {
        accounts.value = data.map((a, index) => ({ ...a, id: a.id || index + 1 }))
        isLoading.value = false
        isInitialized.value = true
      })

      unsubscribeTransactions = subscribeToTransactions((data) => {
        transactions.value = data.map((t, index) => ({ ...t, id: t.id || index + 1 }))
      })

    } catch (error) {
      console.error('Error initializing Firebase:', error)
      syncError.value = 'Error al conectar con Firebase'
      isLoading.value = false
    }
  }

  // Cleanup subscriptions
  const cleanup = () => {
    unsubscribeCredits?.()
    unsubscribeInvestments?.()
    unsubscribeAccounts?.()
    unsubscribeTransactions?.()
  }

  // Initialize on store creation
  initializeFirebase()

  // Registro de cierres contables mensuales
  const accountingClosures = ref<AccountingClosure[]>([])

  // Account type labels for UI
  const accountTypeLabels: Record<AccountType, string> = {
    activo: 'Activo',
    pasivo: 'Pasivo',
    ingreso: 'Ingreso',
    gasto: 'Gasto',
    capital: 'Capital'
  }

  // Computed values
  const totalCredits = computed(() => credits.value.reduce((sum, c) => sum + c.montoTotal, 0))
  const totalPending = computed(() => credits.value.reduce((sum, c) => sum + c.resta, 0))
  const totalInvestments = computed(() => investments.value.reduce((sum, i) => sum + i.total, 0))
  // RN-03: Solo contar ganancias de inversiones vendidas
  const totalGains = computed(() => investments.value.reduce((sum, i) => sum + i.gananciaReal, 0))
  const totalEstimatedGains = computed(() => investments.value.reduce((sum, i) => sum + i.gananciaEstimada, 0))

  // Update account balances
  const updateAccountBalances = () => {
    const prestamosAccount = accounts.value.find(a => a.nombre === 'Préstamos por Cobrar')
    
    // Préstamos por Cobrar = suma de lo que resta por cobrar de todos los créditos
    if (prestamosAccount) {
      prestamosAccount.saldo = totalPending.value
    }
    
    // NOTA: Intereses Ganados NO se actualiza aquí.
    // Se actualiza mediante transacciones contables cuando se reciben pagos.
    // Esto cumple con el principio de que los ingresos se reconocen cuando se realizan.
  }

  // Actions
  // Crear crédito con transacción contable (dinero sale de caja/banco hacia préstamo)
  const addCredit = (
    credit: Omit<Credit, 'id' | 'montoTotal' | 'resta' | 'abonos' | 'estado'>,
    origenAccountId: number  // RN-04: Cuenta de origen (caja o banco)
  ): { success: boolean; message: string } => {
    const origenAccount = accounts.value.find(a => a.id === origenAccountId)
    if (!origenAccount) {
      return { success: false, message: 'Cuenta de origen no encontrada' }
    }

    // RN-04: El dinero debe salir de caja o banco
    if (origenAccount.nombre !== 'Caja' && origenAccount.nombre !== 'Banco') {
      return { success: false, message: 'El préstamo debe salir de Caja o Banco (RN-04)' }
    }

    // Validar que haya saldo suficiente
    if (origenAccount.saldo < credit.monto) {
      return { success: false, message: `Saldo insuficiente en ${origenAccount.nombre}` }
    }

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
    
    const prestamosAccount = accounts.value.find(a => a.nombre === 'Préstamos por Cobrar')
    if (!prestamosAccount) {
      return { success: false, message: 'Cuenta "Préstamos por Cobrar" no encontrada' }
    }

    // Generar transacción contable: Sale dinero de caja/banco, entra a préstamos por cobrar
    const transactionResult = addTransaction({
      fecha: credit.fechaInicio,
      descripcion: `Otorgamiento de crédito: ${credit.nombre}`,
      detalles: [
        {
          accountId: prestamosAccount.id,
          accountName: prestamosAccount.nombre,
          debe: credit.monto,  // Aumenta el activo (préstamo por cobrar)
          haber: 0
        },
        {
          accountId: origenAccountId,
          accountName: origenAccount.nombre,
          debe: 0,
          haber: credit.monto  // Sale dinero de caja/banco
        }
      ]
    })

    if (!transactionResult.success) {
      return { success: false, message: transactionResult.message }
    }

    credits.value.push(newCredit)
    updateAccountBalances()
    
    // Sync to Firebase
    addCreditToFirestore(newCredit).then(firestoreId => {
      const idx = credits.value.findIndex(c => c.id === newCredit.id)
      if (idx !== -1 && credits.value[idx]) {
        credits.value[idx].firestoreId = firestoreId
      }
    }).catch(err => console.error('Error syncing credit to Firebase:', err))
    
    return { success: true, message: 'Crédito creado correctamente' }
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
    
    // Sync to Firebase
    if (existing.firestoreId) {
      updateCreditInFirestore(existing.firestoreId, updated)
        .catch(err => console.error('Error updating credit in Firebase:', err))
    }
  }

  const deleteCredit = (id: number) => {
    const credit = credits.value.find(c => c.id === id)
    // RN-02: Solo se puede eliminar si está en estado 'aprobado' (sin movimientos)
    if (credit && credit.estado === 'aprobado') {
      // Revertir la transacción contable: devolver dinero a caja/banco
      const prestamosAccount = accounts.value.find(a => a.nombre === 'Préstamos por Cobrar')
      const cajaAccount = accounts.value.find(a => a.nombre === 'Caja')
      
      if (prestamosAccount && cajaAccount) {
        // Transacción de reversión: el dinero vuelve a caja
        addTransaction({
          fecha: new Date().toISOString().split('T')[0] ?? '',
          descripcion: `Cancelación de crédito: ${credit.nombre}`,
          detalles: [
            {
              accountId: cajaAccount.id,
              accountName: cajaAccount.nombre,
              debe: credit.monto,  // Vuelve dinero a caja
              haber: 0
            },
            {
              accountId: prestamosAccount.id,
              accountName: prestamosAccount.nombre,
              debe: 0,
              haber: credit.monto  // Se reduce el préstamo por cobrar
            }
          ]
        })
      }
      
      // Sync delete to Firebase
      if (credit.firestoreId) {
        deleteCreditFromFirestore(credit.firestoreId)
          .catch(err => console.error('Error deleting credit from Firebase:', err))
      }
      
      credits.value = credits.value.filter(c => c.id !== id)
      updateAccountBalances()
    }
  }

  // RN-02: Validar si un crédito puede cerrarse
  const canCloseCredit = (id: number): { canClose: boolean; message: string } => {
    const credit = credits.value.find(c => c.id === id)
    if (!credit) {
      return { canClose: false, message: 'Crédito no encontrado' }
    }
    
    if (credit.resta > 0) {
      return { 
        canClose: false, 
        message: `No se puede cerrar el crédito. Saldo pendiente: $${credit.resta.toFixed(2)}` 
      }
    }
    
    return { canClose: true, message: 'El crédito puede cerrarse' }
  }

  // RN-04, RN-05: Registrar pago con transacción contable
  const addPayment = (
    creditId: number, 
    payment: { monto: number; fecha: string; nota: string },
    origenAccountId: number  // RN-04: Cuenta de origen (caja o banco)
  ): { success: boolean; message: string } => {
    const credit = credits.value.find(c => c.id === creditId)
    if (!credit) return { success: false, message: 'Crédito no encontrado' }
    if (credit.estado === 'completado') return { success: false, message: 'El crédito ya está completado' }
    
    const origenAccount = accounts.value.find(a => a.id === origenAccountId)
    if (!origenAccount) return { success: false, message: 'Cuenta de origen no encontrada' }
    
    // RN-04: El pago debe venir de caja o banco
    if (origenAccount.nombre !== 'Caja' && origenAccount.nombre !== 'Banco') {
      return { success: false, message: 'El pago debe recibirse en Caja o Banco (RN-04)' }
    }

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

    // Calcular porción de capital e intereses en este pago
    const proporcionInteres = (credit.montoTotal - credit.monto) / credit.montoTotal
    const interesesEnPago = payment.monto * proporcionInteres
    const capitalEnPago = payment.monto - interesesEnPago

    // RN-05: Registrar transacción contable del pago
    const prestamosAccount = accounts.value.find(a => a.nombre === 'Préstamos por Cobrar')
    const interesesAccount = accounts.value.find(a => a.nombre === 'Intereses Ganados')

    if (prestamosAccount && interesesAccount) {
      addTransaction({
        fecha: payment.fecha,
        descripcion: `Pago de crédito: ${credit.nombre} - ${payment.nota}`,
        detalles: [
          {
            accountId: origenAccountId,
            accountName: origenAccount.nombre,
            debe: payment.monto,  // Entra dinero
            haber: 0
          },
          {
            accountId: prestamosAccount.id,
            accountName: prestamosAccount.nombre,
            debe: 0,
            haber: capitalEnPago  // Reduce préstamo por cobrar
          },
          {
            accountId: interesesAccount.id,
            accountName: interesesAccount.nombre,
            debe: 0,
            haber: interesesEnPago  // Ingreso por intereses
          }
        ]
      })
    }
    
    updateAccountBalances()
    
    // Sync credit update to Firebase (payment added)
    if (credit.firestoreId) {
      updateCreditInFirestore(credit.firestoreId, {
        abonos: credit.abonos,
        abonado: credit.abonado,
        resta: credit.resta,
        estado: credit.estado
      }).catch(err => console.error('Error syncing payment to Firebase:', err))
    }
    
    return { success: true, message: 'Pago registrado correctamente' }
  }

  // Crear inversión con transacción contable (dinero sale de caja/banco)
  const addInvestment = (
    investment: Omit<Investment, 'id' | 'total' | 'gananciaReal' | 'vendida'>,
    origenAccountId: number  // RN-04: Cuenta de origen (caja o banco)
  ): { success: boolean; message: string } => {
    const origenAccount = accounts.value.find(a => a.id === origenAccountId)
    if (!origenAccount) {
      return { success: false, message: 'Cuenta de origen no encontrada' }
    }

    // RN-04: El dinero debe salir de caja o banco
    if (origenAccount.nombre !== 'Caja' && origenAccount.nombre !== 'Banco') {
      return { success: false, message: 'La inversión debe salir de Caja o Banco (RN-04)' }
    }

    // Validar que haya saldo suficiente
    if (origenAccount.saldo < investment.costo) {
      return { success: false, message: `Saldo insuficiente en ${origenAccount.nombre}` }
    }

    // Buscar o crear cuenta de inversiones
    let inversionesAccount = accounts.value.find(a => a.nombre === 'Inventario Inversiones')
    if (!inversionesAccount) {
      inversionesAccount = addAccount({
        nombre: 'Inventario Inversiones',
        tipo: 'activo',
        saldo: 0
      })
    }

    const newInvestment: Investment = {
      ...investment,
      id: Date.now(),
      gananciaReal: 0,  // RN-03: Sin ganancia hasta que se venda
      vendida: false,
      total: investment.costo + investment.gananciaEstimada
    }

    // Generar transacción contable: Sale dinero de caja/banco, entra a inversiones
    const transactionResult = addTransaction({
      fecha: new Date().toISOString().split('T')[0] ?? '',
      descripcion: `Inversión: ${investment.nombre}`,
      detalles: [
        {
          accountId: inversionesAccount.id,
          accountName: inversionesAccount.nombre,
          debe: investment.costo,  // Aumenta el activo (inversión)
          haber: 0
        },
        {
          accountId: origenAccountId,
          accountName: origenAccount.nombre,
          debe: 0,
          haber: investment.costo  // Sale dinero de caja/banco
        }
      ]
    })

    if (!transactionResult.success) {
      return { success: false, message: transactionResult.message }
    }

    investments.value.push(newInvestment)
    
    // Sync to Firebase
    addInvestmentToFirestore(newInvestment).then(firestoreId => {
      const idx = investments.value.findIndex(i => i.id === newInvestment.id)
      if (idx !== -1 && investments.value[idx]) {
        investments.value[idx].firestoreId = firestoreId
      }
    }).catch(err => console.error('Error syncing investment to Firebase:', err))
    
    return { success: true, message: 'Inversión creada correctamente' }
  }

  const updateInvestment = (id: number, data: Partial<Investment>) => {
    const index = investments.value.findIndex(i => i.id === id)
    if (index === -1) return
    const existing = investments.value[index]
    if (!existing) return
    
    // RN-03: No permitir editar inversiones vendidas
    if (existing.vendida) return
    
    const updated: Investment = {
      id: existing.id,
      nombre: data.nombre ?? existing.nombre,
      descripcion: data.descripcion ?? existing.descripcion,
      costo: data.costo ?? existing.costo,
      gananciaEstimada: data.gananciaEstimada ?? existing.gananciaEstimada,
      gananciaReal: existing.gananciaReal,
      vendida: existing.vendida,
      total: 0
    }
    updated.total = updated.costo + updated.gananciaEstimada
    investments.value[index] = updated
    
    // Sync to Firebase
    if (existing.firestoreId) {
      updateInvestmentInFirestore(existing.firestoreId, updated)
        .catch(err => console.error('Error updating investment in Firebase:', err))
    }
  }

  const deleteInvestment = (id: number) => {
    const investment = investments.value.find(i => i.id === id)
    // RN-03: No permitir eliminar inversiones vendidas (tienen transacciones)
    if (investment && !investment.vendida) {
      // Revertir la transacción contable: devolver dinero a caja
      const inversionesAccount = accounts.value.find(a => a.nombre === 'Inventario Inversiones')
      const cajaAccount = accounts.value.find(a => a.nombre === 'Caja')
      
      if (inversionesAccount && cajaAccount) {
        addTransaction({
          fecha: new Date().toISOString().split('T')[0] ?? '',
          descripcion: `Cancelación de inversión: ${investment.nombre}`,
          detalles: [
            {
              accountId: cajaAccount.id,
              accountName: cajaAccount.nombre,
              debe: investment.costo,  // Vuelve dinero a caja
              haber: 0
            },
            {
              accountId: inversionesAccount.id,
              accountName: inversionesAccount.nombre,
              debe: 0,
              haber: investment.costo  // Se reduce el inventario
            }
          ]
        })
      }
      
      // Sync delete to Firebase
      if (investment.firestoreId) {
        deleteInvestmentFromFirestore(investment.firestoreId)
          .catch(err => console.error('Error deleting investment from Firebase:', err))
      }
      
      investments.value = investments.value.filter(i => i.id !== id)
    }
  }

  // RN-03, RN-04, RN-05: Vender inversión - genera ganancia real y transacción contable
  const sellInvestment = (id: number, destinoAccountId: number): { success: boolean; message: string } => {
    const investment = investments.value.find(i => i.id === id)
    if (!investment) {
      return { success: false, message: 'Inversión no encontrada' }
    }
    
    if (investment.vendida) {
      return { success: false, message: 'Esta inversión ya fue vendida' }
    }

    const destinoAccount = accounts.value.find(a => a.id === destinoAccountId)
    if (!destinoAccount) {
      return { success: false, message: 'Cuenta de destino no encontrada' }
    }

    // RN-04: Todo ingreso debe impactar caja o banco
    if (destinoAccount.nombre !== 'Caja' && destinoAccount.nombre !== 'Banco') {
      return { success: false, message: 'El ingreso debe ir a Caja o Banco (RN-04)' }
    }

    // RN-03: Realizar la ganancia
    investment.gananciaReal = investment.gananciaEstimada
    investment.vendida = true
    investment.fechaVenta = new Date().toISOString().split('T')[0]

    // RN-05: Toda ganancia debe estar respaldada por una transacción
    let gananciaAccount = accounts.value.find(a => a.nombre === 'Ganancias por Inversión')
    
    // Crear cuenta de ganancias si no existe
    let gananciaAccountId = gananciaAccount?.id
    if (!gananciaAccount) {
      const newGananciaAccount = addAccount({
        nombre: 'Ganancias por Inversión',
        tipo: 'ingreso',
        saldo: 0
      })
      gananciaAccountId = newGananciaAccount.id
    }

    // Buscar cuenta de Inventario Inversiones
    const inversionesAccount = accounts.value.find(a => a.nombre === 'Inventario Inversiones')
    if (!inversionesAccount) {
      return { success: false, message: 'Cuenta "Inventario Inversiones" no encontrada' }
    }

    // Crear transacción contable balanceada:
    // DEBE: Caja/Banco (entra el total de la venta: costo + ganancia)
    // HABER: Inventario Inversiones (sale el costo del inventario)
    // HABER: Ganancias por Inversión (se registra la ganancia como ingreso)
    const fechaVenta = investment.fechaVenta ?? new Date().toISOString().split('T')[0] ?? ''
    const transactionResult = addTransaction({
      fecha: fechaVenta,
      descripcion: `Venta de inversión: ${investment.nombre}`,
      detalles: [
        {
          accountId: destinoAccountId,
          accountName: destinoAccount.nombre,
          debe: investment.total,  // Entra dinero a caja/banco (costo + ganancia)
          haber: 0
        },
        {
          accountId: inversionesAccount.id,
          accountName: inversionesAccount.nombre,
          debe: 0,
          haber: investment.costo  // Sale el costo del inventario
        },
        {
          accountId: gananciaAccountId!,
          accountName: 'Ganancias por Inversión',
          debe: 0,
          haber: investment.gananciaReal  // Ingreso por ganancia
        }
      ]
    })

    if (!transactionResult.success) {
      // Revertir cambios si la transacción falla
      investment.gananciaReal = 0
      investment.vendida = false
      investment.fechaVenta = undefined
      return { success: false, message: transactionResult.message }
    }

    // Sync to Firebase
    if (investment.firestoreId) {
      updateInvestmentInFirestore(investment.firestoreId, {
        gananciaReal: investment.gananciaReal,
        vendida: investment.vendida,
        fechaVenta: investment.fechaVenta
      }).catch(err => console.error('Error syncing sold investment to Firebase:', err))
    }

    return { success: true, message: `Inversión vendida. Ganancia realizada: $${investment.gananciaReal}` }
  }

  // RF-11: Crear cuenta contable dinámica
  const addAccount = (account: Omit<LedgerAccount, 'id' | 'createdAt'>) => {
    const newAccount: LedgerAccount = {
      ...account,
      id: Date.now(),
      createdAt: new Date().toISOString()
    }
    accounts.value.push(newAccount)
    
    // Sync to Firebase
    addAccountToFirestore(newAccount).then(firestoreId => {
      const idx = accounts.value.findIndex(a => a.id === newAccount.id)
      if (idx !== -1 && accounts.value[idx]) {
        accounts.value[idx].firestoreId = firestoreId
      }
    }).catch(err => console.error('Error syncing account to Firebase:', err))
    
    return newAccount
  }

  // Actualizar cuenta contable
  const updateAccount = (id: number, data: Partial<Omit<LedgerAccount, 'id' | 'createdAt'>>) => {
    const index = accounts.value.findIndex(a => a.id === id)
    if (index === -1) return false
    const existing = accounts.value[index]
    if (!existing) return false
    
    accounts.value[index] = {
      ...existing,
      nombre: data.nombre ?? existing.nombre,
      tipo: data.tipo ?? existing.tipo,
      saldo: data.saldo ?? existing.saldo
    }
    
    // Sync to Firebase
    if (existing.firestoreId) {
      updateAccountInFirestore(existing.firestoreId, accounts.value[index])
        .catch(err => console.error('Error updating account in Firebase:', err))
    }
    
    return true
  }

  // Eliminar cuenta contable (solo si no tiene transacciones asociadas)
  const deleteAccount = (id: number): { success: boolean; message: string } => {
    const account = accounts.value.find(a => a.id === id)
    const hasTransactions = transactions.value.some(t => 
      t.detalles.some(d => d.accountId === id)
    )
    
    if (hasTransactions) {
      return { 
        success: false, 
        message: 'No se puede eliminar una cuenta con transacciones asociadas' 
      }
    }
    
    // Sync delete to Firebase
    if (account?.firestoreId) {
      deleteAccountFromFirestore(account.firestoreId)
        .catch(err => console.error('Error deleting account from Firebase:', err))
    }
    
    accounts.value = accounts.value.filter(a => a.id !== id)
    return { success: true, message: 'Cuenta eliminada correctamente' }
  }

  // RF-13: Validar que la transacción esté balanceada (débitos = créditos)
  const validateTransaction = (detalles: TransactionDetail[]): { valid: boolean; message: string } => {
    const totalDebe = detalles.reduce((sum, d) => sum + d.debe, 0)
    const totalHaber = detalles.reduce((sum, d) => sum + d.haber, 0)
    
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
      return {
        valid: false,
        message: `Transacción desbalanceada: Débitos (${totalDebe.toFixed(2)}) ≠ Créditos (${totalHaber.toFixed(2)})`
      }
    }
    
    if (totalDebe === 0 && totalHaber === 0) {
      return {
        valid: false,
        message: 'La transacción debe tener al menos un movimiento'
      }
    }
    
    return { valid: true, message: '' }
  }

  // RF-14, RF-15, RF-16: Crear transacción contable
  const addTransaction = (data: { fecha: string; descripcion: string; detalles: TransactionDetail[] }): { success: boolean; message: string; transaction?: Transaction } => {
    // RF-13: Validar balance
    const validation = validateTransaction(data.detalles)
    if (!validation.valid) {
      return { success: false, message: validation.message }
    }

    const totalDebe = data.detalles.reduce((sum, d) => sum + d.debe, 0)
    const totalHaber = data.detalles.reduce((sum, d) => sum + d.haber, 0)

    // RF-16: Crear transacción inalterable
    const newTransaction: Transaction = {
      id: Date.now(),
      fecha: data.fecha,
      descripcion: data.descripcion,
      detalles: data.detalles.map(d => ({ ...d })), // Copia profunda
      totalDebe,
      totalHaber,
      createdAt: new Date().toISOString()
    }

    // Actualizar saldos de las cuentas afectadas
    for (const detalle of data.detalles) {
      const account = accounts.value.find(a => a.id === detalle.accountId)
      if (account) {
        // Regla contable: Activos y Gastos aumentan con Debe, disminuyen con Haber
        // Pasivos, Capital e Ingresos aumentan con Haber, disminuyen con Debe
        if (account.tipo === 'activo' || account.tipo === 'gasto') {
          account.saldo += detalle.debe - detalle.haber
        } else {
          account.saldo += detalle.haber - detalle.debe
        }
        
        // Sync account balance to Firebase
        if (account.firestoreId) {
          updateAccountInFirestore(account.firestoreId, { saldo: account.saldo })
            .catch(err => console.error('Error syncing account balance to Firebase:', err))
        }
      }
    }

    transactions.value.push(newTransaction)
    
    // Sync transaction to Firebase
    addTransactionToFirestore(newTransaction)
      .catch(err => console.error('Error syncing transaction to Firebase:', err))
    
    return { success: true, message: 'Transacción registrada correctamente', transaction: newTransaction }
  }

  // Obtener transacciones ordenadas por fecha (más recientes primero)
  const sortedTransactions = computed(() => 
    [...transactions.value].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )

  // Cuentas por tipo
  const accountsByType = computed(() => {
    const result: Record<AccountType, LedgerAccount[]> = {
      activo: [],
      pasivo: [],
      ingreso: [],
      gasto: [],
      capital: []
    }
    
    for (const account of accounts.value) {
      result[account.tipo].push(account)
    }
    
    return result
  })

  // Verificar si un mes ya fue cerrado
  const isMonthClosed = (mes: number, anio: number): boolean => {
    return accountingClosures.value.some(c => c.mes === mes && c.anio === anio)
  }

  // Obtener cierres ordenados por fecha (más recientes primero)
  const sortedClosures = computed(() => 
    [...accountingClosures.value].sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio
      return b.mes - a.mes
    })
  )

  // Realizar cierre contable mensual
  // Flujo contable:
  // 1. Debitar cuentas de Ingreso (para cerrarlas a 0)
  // 2. Acreditar cuentas de Gasto (para cerrarlas a 0)
  // 3. La diferencia (Utilidad) se acredita a Capital
  const performMonthlyClosing = (
    mes: number,
    anio: number
  ): { success: boolean; message: string; closure?: AccountingClosure } => {
    
    // Validar que el mes no haya sido cerrado
    if (isMonthClosed(mes, anio)) {
      return { success: false, message: `El mes ${mes}/${anio} ya fue cerrado contablemente` }
    }

    // Obtener cuentas
    const capitalAccount = accounts.value.find(a => a.nombre === 'Capital')
    const interesesAccount = accounts.value.find(a => a.nombre === 'Intereses Ganados')
    const gananciasInvAccount = accounts.value.find(a => a.nombre === 'Ganancias por Inversión')
    const gastosAccount = accounts.value.find(a => a.nombre === 'Gastos Operativos')

    if (!capitalAccount) {
      return { success: false, message: 'Cuenta de Capital no encontrada' }
    }

    // Calcular totales
    const interesesGanados = interesesAccount?.saldo ?? 0
    const gananciaInversiones = gananciasInvAccount?.saldo ?? 0
    const totalIngresos = interesesGanados + gananciaInversiones
    const totalGastos = gastosAccount?.saldo ?? 0
    const utilidadNeta = totalIngresos - totalGastos

    // Si no hay movimientos, no hay nada que cerrar
    if (totalIngresos === 0 && totalGastos === 0) {
      return { success: false, message: 'No hay ingresos ni gastos para cerrar en este periodo' }
    }

    // Construir detalles de la transacción de cierre
    const detalles: TransactionDetail[] = []

    // 1. Cerrar cuentas de Ingreso (Debitar para llevar a 0)
    if (interesesAccount && interesesGanados > 0) {
      detalles.push({
        accountId: interesesAccount.id,
        accountName: interesesAccount.nombre,
        debe: interesesGanados,
        haber: 0
      })
    }

    if (gananciasInvAccount && gananciaInversiones > 0) {
      detalles.push({
        accountId: gananciasInvAccount.id,
        accountName: gananciasInvAccount.nombre,
        debe: gananciaInversiones,
        haber: 0
      })
    }

    // 2. Cerrar cuentas de Gasto (Acreditar para llevar a 0)
    if (gastosAccount && totalGastos > 0) {
      detalles.push({
        accountId: gastosAccount.id,
        accountName: gastosAccount.nombre,
        debe: 0,
        haber: totalGastos
      })
    }

    // 3. Transferir utilidad neta a Capital
    if (utilidadNeta > 0) {
      // Utilidad: Acreditar Capital (aumenta)
      detalles.push({
        accountId: capitalAccount.id,
        accountName: capitalAccount.nombre,
        debe: 0,
        haber: utilidadNeta
      })
    } else if (utilidadNeta < 0) {
      // Pérdida: Debitar Capital (disminuye)
      detalles.push({
        accountId: capitalAccount.id,
        accountName: capitalAccount.nombre,
        debe: Math.abs(utilidadNeta),
        haber: 0
      })
    }

    // Fecha del último día del mes
    const fechaCierre = new Date(anio, mes, 0).toISOString().split('T')[0] ?? ''
    const nombreMes = new Date(anio, mes - 1).toLocaleDateString('es-MX', { month: 'long' })

    // Crear transacción de cierre
    const transactionResult = addTransaction({
      fecha: fechaCierre,
      descripcion: `Cierre contable ${nombreMes} ${anio} - Utilidad: ${utilidadNeta >= 0 ? '+' : ''}${utilidadNeta.toFixed(2)}`,
      detalles
    })

    if (!transactionResult.success) {
      return { success: false, message: transactionResult.message }
    }

    // Registrar el cierre
    const closure: AccountingClosure = {
      id: Date.now(),
      mes,
      anio,
      fecha: new Date().toISOString(),
      interesesGanados,
      gananciaInversiones,
      totalIngresos,
      totalGastos,
      utilidadNeta,
      transactionId: transactionResult.transaction?.id ?? 0
    }

    accountingClosures.value.push(closure)

    return { 
      success: true, 
      message: `Cierre de ${nombreMes} ${anio} completado. Utilidad transferida a Capital: $${utilidadNeta.toFixed(2)}`,
      closure
    }
  }

  // Initialize balances
  updateAccountBalances()

  return {
    // Firebase state
    isLoading,
    isInitialized,
    syncError,
    cleanup,
    // Data
    credits,
    investments,
    accounts,
    transactions,
    accountingClosures,
    accountTypeLabels,
    sortedTransactions,
    sortedClosures,
    accountsByType,
    totalCredits,
    totalPending,
    totalInvestments,
    totalGains,
    totalEstimatedGains,
    // Actions
    addCredit,
    updateCredit,
    deleteCredit,
    canCloseCredit,
    addPayment,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    sellInvestment,
    addAccount,
    updateAccount,
    deleteAccount,
    validateTransaction,
    addTransaction,
    isMonthClosed,
    performMonthlyClosing
  }
})
