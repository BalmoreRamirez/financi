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
  fecha: string
  descripcion: string
  detalles: TransactionDetail[]
  totalDebe: number
  totalHaber: number
  createdAt: string // RF-16: Inmutabilidad - timestamp de creación
}

export const useFinanceStore = defineStore('finance', () => {
  // Credits - Datos iniciales: 2 créditos de 200 cada uno
  const credits = ref<Credit[]>([
    {
      id: 1,
      nombre: 'Cliente A',
      monto: 200,
      interes: 10,
      montoTotal: 220,
      abonado: 0,
      resta: 220,
      fechaInicio: '2026-02-01',
      fechaFin: '2026-08-01',
      estado: 'aprobado',
      abonos: []
    },
    {
      id: 2,
      nombre: 'Cliente B',
      monto: 200,
      interes: 10,
      montoTotal: 220,
      abonado: 0,
      resta: 220,
      fechaInicio: '2026-02-01',
      fechaFin: '2026-08-01',
      estado: 'aprobado',
      abonos: []
    }
  ])

  // Investments - RN-03: La ganancia no se realiza hasta que se venda
  // Datos iniciales: 2 teléfonos de 100 con ganancia estimada de 10 cada uno
  const investments = ref<Investment[]>([
    {
      id: 1,
      nombre: 'Teléfono 1',
      descripcion: 'Teléfono para reventa',
      costo: 100,
      gananciaEstimada: 10,
      gananciaReal: 0,
      total: 110,
      vendida: false
    },
    {
      id: 2,
      nombre: 'Teléfono 2',
      descripcion: 'Teléfono para reventa',
      costo: 100,
      gananciaEstimada: 10,
      gananciaReal: 0,
      total: 110,
      vendida: false
    }
  ])

  // RF-11: Ledger Accounts - Cuentas contables dinámicas
  // Datos iniciales: Capital 1000, Caja 400 (1000 - 400 créditos - 200 inversiones), Préstamos por Cobrar 400, Inventario Inversiones 200
  const accounts = ref<LedgerAccount[]>([
    { id: 1, nombre: 'Capital', tipo: 'capital', saldo: 1000, createdAt: '2026-02-01T00:00:00.000Z' },
    { id: 2, nombre: 'Intereses Ganados', tipo: 'ingreso', saldo: 0, createdAt: '2026-02-01T00:00:00.000Z' },
    { id: 3, nombre: 'Préstamos por Cobrar', tipo: 'activo', saldo: 400, createdAt: '2026-02-01T00:00:00.000Z' },
    { id: 4, nombre: 'Caja', tipo: 'activo', saldo: 400, createdAt: '2026-02-01T00:00:00.000Z' },
    { id: 5, nombre: 'Banco', tipo: 'activo', saldo: 0, createdAt: '2026-02-01T00:00:00.000Z' },
    { id: 6, nombre: 'Gastos Operativos', tipo: 'gasto', saldo: 0, createdAt: '2026-02-01T00:00:00.000Z' },
    { id: 7, nombre: 'Cuentas por Pagar', tipo: 'pasivo', saldo: 0, createdAt: '2026-02-01T00:00:00.000Z' },
    { id: 8, nombre: 'Inventario Inversiones', tipo: 'activo', saldo: 200, createdAt: '2026-02-01T00:00:00.000Z' },
    { id: 9, nombre: 'Ganancias por Inversión', tipo: 'ingreso', saldo: 0, createdAt: '2026-02-01T00:00:00.000Z' }
  ])

  // RF-16: Historial inalterable de transacciones
  const transactions = ref<Transaction[]>([])

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
    return true
  }

  // Eliminar cuenta contable (solo si no tiene transacciones asociadas)
  const deleteAccount = (id: number): { success: boolean; message: string } => {
    const hasTransactions = transactions.value.some(t => 
      t.detalles.some(d => d.accountId === id)
    )
    
    if (hasTransactions) {
      return { 
        success: false, 
        message: 'No se puede eliminar una cuenta con transacciones asociadas' 
      }
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
      }
    }

    transactions.value.push(newTransaction)
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

  // Initialize balances
  updateAccountBalances()

  return {
    credits,
    investments,
    accounts,
    transactions,
    accountTypeLabels,
    sortedTransactions,
    accountsByType,
    totalCredits,
    totalPending,
    totalInvestments,
    totalGains,
    totalEstimatedGains,
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
    addTransaction
  }
})
