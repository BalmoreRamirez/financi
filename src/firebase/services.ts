import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe
} from 'firebase/firestore'
import { db } from './config'
import type { Credit, Investment, LedgerAccount, Transaction } from '../stores/finance'

// Collection names
const COLLECTIONS = {
  CREDITS: 'credits',
  INVESTMENTS: 'investments',
  ACCOUNTS: 'accounts',
  TRANSACTIONS: 'transactions'
} as const

// ============ CREDITS ============
export const creditsCollection = collection(db, COLLECTIONS.CREDITS)

export const subscribeToCredits = (callback: (credits: Credit[]) => void): Unsubscribe => {
  const q = query(creditsCollection, orderBy('fechaInicio', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const credits = snapshot.docs.map(doc => ({
      id: parseInt(doc.id) || Date.now(),
      firestoreId: doc.id,
      ...doc.data()
    })) as (Credit & { firestoreId: string })[]
    callback(credits)
  })
}

export const addCreditToFirestore = async (credit: Omit<Credit, 'id'>) => {
  const docRef = await addDoc(creditsCollection, credit)
  return docRef.id
}

export const updateCreditInFirestore = async (firestoreId: string, data: Partial<Credit>) => {
  const docRef = doc(db, COLLECTIONS.CREDITS, firestoreId)
  await updateDoc(docRef, data)
}

export const deleteCreditFromFirestore = async (firestoreId: string) => {
  const docRef = doc(db, COLLECTIONS.CREDITS, firestoreId)
  await deleteDoc(docRef)
}

// ============ INVESTMENTS ============
export const investmentsCollection = collection(db, COLLECTIONS.INVESTMENTS)

export const subscribeToInvestments = (callback: (investments: Investment[]) => void): Unsubscribe => {
  return onSnapshot(investmentsCollection, (snapshot) => {
    const investments = snapshot.docs.map(doc => ({
      id: parseInt(doc.id) || Date.now(),
      firestoreId: doc.id,
      ...doc.data()
    })) as (Investment & { firestoreId: string })[]
    callback(investments)
  })
}

export const addInvestmentToFirestore = async (investment: Omit<Investment, 'id'>) => {
  const docRef = await addDoc(investmentsCollection, investment)
  return docRef.id
}

export const updateInvestmentInFirestore = async (firestoreId: string, data: Partial<Investment>) => {
  const docRef = doc(db, COLLECTIONS.INVESTMENTS, firestoreId)
  await updateDoc(docRef, data)
}

export const deleteInvestmentFromFirestore = async (firestoreId: string) => {
  const docRef = doc(db, COLLECTIONS.INVESTMENTS, firestoreId)
  await deleteDoc(docRef)
}

// ============ ACCOUNTS ============
export const accountsCollection = collection(db, COLLECTIONS.ACCOUNTS)

export const subscribeToAccounts = (callback: (accounts: LedgerAccount[]) => void): Unsubscribe => {
  return onSnapshot(accountsCollection, (snapshot) => {
    const accounts = snapshot.docs.map(doc => ({
      id: parseInt(doc.id) || Date.now(),
      firestoreId: doc.id,
      ...doc.data()
    })) as (LedgerAccount & { firestoreId: string })[]
    callback(accounts)
  })
}

export const addAccountToFirestore = async (account: Omit<LedgerAccount, 'id'>) => {
  const docRef = await addDoc(accountsCollection, account)
  return docRef.id
}

export const updateAccountInFirestore = async (firestoreId: string, data: Partial<LedgerAccount>) => {
  const docRef = doc(db, COLLECTIONS.ACCOUNTS, firestoreId)
  await updateDoc(docRef, data)
}

export const deleteAccountFromFirestore = async (firestoreId: string) => {
  const docRef = doc(db, COLLECTIONS.ACCOUNTS, firestoreId)
  await deleteDoc(docRef)
}

// ============ TRANSACTIONS ============
export const transactionsCollection = collection(db, COLLECTIONS.TRANSACTIONS)

export const subscribeToTransactions = (callback: (transactions: Transaction[]) => void): Unsubscribe => {
  const q = query(transactionsCollection, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      id: parseInt(doc.id) || Date.now(),
      firestoreId: doc.id,
      ...doc.data()
    })) as (Transaction & { firestoreId: string })[]
    callback(transactions)
  })
}

export const addTransactionToFirestore = async (transaction: Omit<Transaction, 'id'>) => {
  const docRef = await addDoc(transactionsCollection, transaction)
  return docRef.id
}

// ============ INITIALIZE DEFAULT ACCOUNTS ============
// Cuentas contables base para operar en producción
export const getDefaultAccounts = (): Omit<LedgerAccount, 'id' | 'firestoreId'>[] => {
  const now = new Date().toISOString()
  return [
    // Cuentas de Capital
    { nombre: 'Capital', tipo: 'capital' as const, saldo: 1000, createdAt: now },
    
    // Cuentas de Ingreso
    { nombre: 'Intereses Ganados', tipo: 'ingreso' as const, saldo: 0, createdAt: now },
    { nombre: 'Ganancias por Inversión', tipo: 'ingreso' as const, saldo: 0, createdAt: now },
    
    // Cuentas de Activo
    { nombre: 'Préstamos por Cobrar', tipo: 'activo' as const, saldo: 400, createdAt: now },
    { nombre: 'Caja', tipo: 'activo' as const, saldo: 400, createdAt: now },
    { nombre: 'Banco', tipo: 'activo' as const, saldo: 0, createdAt: now },
    { nombre: 'Inventario Inversiones', tipo: 'activo' as const, saldo: 200, createdAt: now },
    
    // Cuentas de Gasto
    { nombre: 'Gastos Operativos', tipo: 'gasto' as const, saldo: 0, createdAt: now },
    
    // Cuentas de Pasivo
    { nombre: 'Cuentas por Pagar', tipo: 'pasivo' as const, saldo: 0, createdAt: now }
  ]
}

export const initializeDefaultAccounts = async (): Promise<boolean> => {
  try {
    // Verificar si ya existen cuentas
    const accountsSnapshot = await getDocs(accountsCollection)
    
    if (accountsSnapshot.empty) {
      console.log('Inicializando cuentas contables por defecto...')
      
      const defaultAccounts = getDefaultAccounts()
      
      for (const account of defaultAccounts) {
        await addDoc(accountsCollection, account)
      }
      
      console.log('Cuentas contables inicializadas correctamente!')
      return true
    }
    
    console.log('Las cuentas ya existen, no se requiere inicialización.')
    return false
  } catch (error) {
    console.error('Error al inicializar cuentas:', error)
    throw error
  }
}

// ============ INITIALIZE DATA ============
export const initializeFirestoreData = async (
  accounts: LedgerAccount[],
  credits: Credit[],
  investments: Investment[]
) => {
  // Check if data already exists
  const accountsSnapshot = await getDocs(accountsCollection)
  
  if (accountsSnapshot.empty) {
    console.log('Initializing Firestore with default data...')
    
    // Add accounts
    for (const account of accounts) {
      const { id, ...accountData } = account
      await addDoc(accountsCollection, accountData)
    }
    
    // Add credits
    for (const credit of credits) {
      const { id, ...creditData } = credit
      await addDoc(creditsCollection, creditData)
    }
    
    // Add investments
    for (const investment of investments) {
      const { id, ...investmentData } = investment
      await addDoc(investmentsCollection, investmentData)
    }
    
    console.log('Firestore initialized successfully!')
    return true
  }
  
  return false
}
