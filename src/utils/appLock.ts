/**
 * App-lock PIN handling.
 *
 * - PINs are hashed with PBKDF2-SHA256 (210k iterations) and a random per-install salt.
 * - Stored format: `v2$<iterations>$<saltB64>$<hashB64>`; the PIN length is stored separately
 *   so the lock screen knows how many digits to expect.
 * - Legacy unsalted SHA-256 hashes (v1) are still verified, then upgraded on the next successful unlock.
 * - Failed-attempt counters persist across restarts, so killing the app does not reset the lockout.
 *
 * Note: this protects against casual access. It cannot defend against someone with root
 * access to the device's app storage — that is a limit of any WebView-based app.
 */

export const PIN_LENGTH = 6
export const MAX_ATTEMPTS = 5
export const LOCKOUT_SECONDS = 5 * 60

const PIN_KEY = 'appLockPin'
const LEN_KEY = 'appLockPinLength'
const ATTEMPTS_KEY = 'appLockFailedAttempts'
const LOCKED_UNTIL_KEY = 'appLockLockedUntil'
const ITERATIONS = 210_000
const LEGACY_SALT = 'katyamma_salt'

const enc = new TextEncoder()

function b64(bytes: Uint8Array): string {
  let s = ''
  bytes.forEach(b => { s += String.fromCharCode(b) })
  return btoa(s)
}
function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}

async function pbkdf2(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256,
  )
  return new Uint8Array(bits)
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function legacyHash(pin: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(pin + LEGACY_SALT))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(pin, salt, ITERATIONS)
  return `v2$${ITERATIONS}$${b64(salt)}$${b64(hash)}`
}

export async function verifyPinAgainst(pin: string, stored: string): Promise<boolean> {
  if (stored.startsWith('v2$')) {
    const [, iter, salt, hash] = stored.split('$')
    const derived = await pbkdf2(pin, unb64(salt), Number(iter))
    return constantTimeEqual(b64(derived), hash)
  }
  return constantTimeEqual(await legacyHash(pin), stored)
}

/** Stores a new PIN (hashed) and its length. */
export async function savePin(pin: string): Promise<void> {
  localStorage.setItem(PIN_KEY, await hashPin(pin))
  localStorage.setItem(LEN_KEY, String(pin.length))
  clearFailures()
}

export function hasPin(): boolean {
  return !!localStorage.getItem(PIN_KEY)
}

/** Digits expected by the lock screen; legacy installs used 4. */
export function storedPinLength(): number {
  const n = Number(localStorage.getItem(LEN_KEY))
  return n >= 4 && n <= 8 ? n : 4
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY)
  if (!stored) return false
  const ok = await verifyPinAgainst(pin, stored)
  if (ok && !stored.startsWith('v2$')) {
    // Transparently upgrade a legacy hash now that we know the PIN.
    localStorage.setItem(PIN_KEY, await hashPin(pin))
  }
  return ok
}

// ── Persisted lockout state ──────────────────────────────────────────────────

export function getLockedUntil(): number | null {
  const until = Number(localStorage.getItem(LOCKED_UNTIL_KEY))
  return until > Date.now() ? until : null
}

export function getFailedAttempts(): number {
  return Number(localStorage.getItem(ATTEMPTS_KEY)) || 0
}

/** Records a failed attempt; returns the lockout deadline if the limit was reached. */
export function recordFailure(): number | null {
  const attempts = getFailedAttempts() + 1
  if (attempts >= MAX_ATTEMPTS) {
    const until = Date.now() + LOCKOUT_SECONDS * 1000
    localStorage.setItem(LOCKED_UNTIL_KEY, String(until))
    localStorage.setItem(ATTEMPTS_KEY, '0')
    return until
  }
  localStorage.setItem(ATTEMPTS_KEY, String(attempts))
  return null
}

export function clearFailures(): void {
  localStorage.removeItem(ATTEMPTS_KEY)
  localStorage.removeItem(LOCKED_UNTIL_KEY)
}
