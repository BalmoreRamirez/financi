import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDkI7YTM0PPBq_qj2l-biA7s8U8Be-1h00",
  authDomain: "financi-f2fc5.firebaseapp.com",
  projectId: "financi-f2fc5",
  storageBucket: "financi-f2fc5.firebasestorage.app",
  messagingSenderId: "77111508046",
  appId: "1:77111508046:web:c401cc8c916e64a084971f"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

export default app
