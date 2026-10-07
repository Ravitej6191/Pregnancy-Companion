import { describe, it, expect } from 'vitest'
import { decideMerge, toCloudData, recordDocId } from './syncCore'

const T1 = '2026-01-01T00:00:00.000Z'
const T2 = '2026-01-02T00:00:00.000Z'
const T3 = '2026-01-03T00:00:00.000Z'

describe('decideMerge', () => {
  it('adds a record that does not exist locally', () => {
    expect(decideMerge({ remote: { deleted: false, updatedAt: T1 } })).toBe('add')
  })
  it('replaces only when the remote is newer', () => {
    expect(decideMerge({ remote: { deleted: false, updatedAt: T2 }, local: { updatedAt: T1 } })).toBe('replace')
    expect(decideMerge({ remote: { deleted: false, updatedAt: T1 }, local: { updatedAt: T2 } })).toBe('skip')
  })
  it('never lets older cloud data overwrite newer local edits', () => {
    expect(decideMerge({ remote: { deleted: false, updatedAt: T1 }, local: { updatedAt: T3 } })).toBe('skip')
  })
  it('applies a remote delete only if the local copy has not been edited since', () => {
    expect(decideMerge({ remote: { deleted: true, updatedAt: T2 }, local: { updatedAt: T1 } })).toBe('delete-local')
    expect(decideMerge({ remote: { deleted: true, updatedAt: T1 }, local: { updatedAt: T2 } })).toBe('skip')
    expect(decideMerge({ remote: { deleted: true, updatedAt: T2 }, local: null })).toBe('skip')
  })
  it('does not resurrect a record deleted locally after the remote edit', () => {
    expect(decideMerge({ remote: { deleted: false, updatedAt: T1 }, tombstone: { deletedAt: T2 } })).toBe('skip')
    expect(decideMerge({ remote: { deleted: false, updatedAt: T3 }, tombstone: { deletedAt: T2 } })).toBe('add')
  })
  it('preferRemote forces replacement (first sync on a new device)', () => {
    expect(decideMerge({ remote: { deleted: false, updatedAt: T1 }, local: { updatedAt: T3 }, preferRemote: true })).toBe('replace')
  })
})

describe('toCloudData', () => {
  it('strips id, undefined and Blob fields', () => {
    const out = toCloudData({ id: 5, a: 1, b: undefined, photo: new Blob(['x']), c: 'z' })
    expect(out).toEqual({ a: 1, c: 'z' })
  })
})

describe('recordDocId', () => {
  it('never contains a slash', () => {
    expect(recordDocId('checklistItems', 'checklist_Hospital Bag_Pads/underwear')).not.toContain('/')
  })
})
