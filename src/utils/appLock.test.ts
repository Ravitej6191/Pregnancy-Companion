import { describe, it, expect, beforeEach } from 'vitest'
import {
  savePin, verifyPin, hashPin, verifyPinAgainst, hasPin, storedPinLength,
  recordFailure, getFailedAttempts, getLockedUntil, clearFailures, MAX_ATTEMPTS,
} from './appLock'

async function legacyHash(pin: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + 'katyamma_salt'))
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('')
}

beforeEach(() => localStorage.clear())

describe('PIN hashing', () => {
  it('uses a random salt per hash', async () => {
    const a = await hashPin('123456')
    const b = await hashPin('123456')
    expect(a).not.toBe(b)
    expect(a.startsWith('v2$')).toBe(true)
    expect(await verifyPinAgainst('123456', a)).toBe(true)
    expect(await verifyPinAgainst('123457', a)).toBe(false)
  })

  it('saves and verifies a PIN, recording its length', async () => {
    await savePin('654321')
    expect(hasPin()).toBe(true)
    expect(storedPinLength()).toBe(6)
    expect(await verifyPin('654321')).toBe(true)
    expect(await verifyPin('000000')).toBe(false)
  })

  it('accepts a legacy SHA-256 PIN and upgrades it to PBKDF2', async () => {
    localStorage.setItem('appLockPin', await legacyHash('1234'))
    expect(storedPinLength()).toBe(4)
    expect(await verifyPin('1234')).toBe(true)
    expect(localStorage.getItem('appLockPin')!.startsWith('v2$')).toBe(true)
    expect(await verifyPin('1234')).toBe(true)
    expect(await verifyPin('9999')).toBe(false)
  })
})

describe('lockout persistence', () => {
  it('locks after MAX_ATTEMPTS failures, state lives in storage', () => {
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) expect(recordFailure()).toBeNull()
    expect(getFailedAttempts()).toBe(MAX_ATTEMPTS - 1)
    const until = recordFailure()
    expect(until).toBeGreaterThan(Date.now())
    expect(getLockedUntil()).toBe(until)
    clearFailures()
    expect(getLockedUntil()).toBeNull()
  })
})
