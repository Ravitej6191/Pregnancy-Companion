import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Only initialize if all required keys are present
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)

let firebaseApp: FirebaseApp | null = null
let _firestore: Firestore | null = null
let _firebaseAuth: Auth | null = null

if (isFirebaseConfigured) {
  firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  _firestore  = getFirestore(firebaseApp)
  _firebaseAuth = getAuth(firebaseApp)
}

export const firestore     = _firestore
export const firebaseAuth  = _firebaseAuth
export { firebaseApp }
