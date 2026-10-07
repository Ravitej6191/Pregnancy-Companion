import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth'
import { firebaseAuth, isFirebaseConfigured } from '../config/firebase'
import { useAuthStore } from '../store/useAuthStore'

export async function signInWithGoogle(): Promise<void> {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  const store = useAuthStore.getState()
  store.setIsSigningIn(true)
  try {
    // Triggers native Google Sign-In popup on Android
    const result = await FirebaseAuthentication.signInWithGoogle()

    // Sign the web SDK in too — Firestore rules need a web-SDK auth session.
    // A failure here must not block login (native sign-in already succeeded), but it is
    // NOT swallowed: sync calls ensureWebAuth() which retries and surfaces a clear error.
    if (result.credential?.idToken && firebaseAuth) {
      try {
        const credential = GoogleAuthProvider.credential(result.credential.idToken)
        await signInWithCredential(firebaseAuth, credential)
      } catch (err) {
        console.warn('[auth] Web SDK sign-in failed; sync will retry', err)
      }
    }

    const u = result.user
    if (u) {
      store.setUser({
        uid: u.uid,
        displayName: u.displayName ?? null,
        email: u.email ?? null,
        photoURL: u.photoUrl ?? null,
      })
    } else {
      throw new Error('Google sign-in returned no user')
    }
  } finally {
    store.setIsSigningIn(false)
  }
}

/**
 * Makes sure the Firebase web SDK (used by Firestore) is signed in as the same user
 * as the native session. Throws a descriptive error if it cannot be, so sync failures
 * are never reported as an opaque 'permission-denied'.
 */
export async function ensureWebAuth(expectedUid: string): Promise<void> {
  if (!isFirebaseConfigured || !firebaseAuth) throw new Error('Firebase not configured')
  if (firebaseAuth.currentUser?.uid === expectedUid) return
  try {
    const { token } = await FirebaseAuthentication.getIdToken()
    if (!token) throw new Error('no token')
    await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(token))
  } catch (err) {
    console.warn('[auth] ensureWebAuth failed', err)
    throw new Error('Cloud sync is not authorised. Please sign out and sign in with Google again.')
  }
  if (firebaseAuth.currentUser?.uid !== expectedUid) {
    throw new Error('Signed-in Google account changed. Please sign out and sign in again.')
  }
}

export async function signOutGoogle(): Promise<void> {
  await FirebaseAuthentication.signOut()
  if (firebaseAuth) await signOut(firebaseAuth)
  useAuthStore.getState().setUser(null)
  useAuthStore.getState().setLastSyncedAt(null)
}

/**
 * Restores a persisted Google session on app start.
 * Safe to call even if user never signed in — returns silently.
 */
export async function restoreGoogleSession(): Promise<void> {
  if (!isFirebaseConfigured) return
  try {
    const result = await FirebaseAuthentication.getCurrentUser()
    if (result.user) {
      useAuthStore.getState().setUser({
        uid: result.user.uid,
        displayName: result.user.displayName ?? null,
        email: result.user.email ?? null,
        photoURL: result.user.photoUrl ?? null,
      })
      // Web SDK auth is handled by Firebase SDK's own persistence —
      // no need to re-sign-in here; the token is refreshed automatically
    }
  } catch (err) {
    // No persisted session is the normal case on first launch
    console.debug('[auth] no persisted session', err)
  }
}
