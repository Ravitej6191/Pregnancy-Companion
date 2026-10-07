/** Pure merge rules for cloud sync (last-writer-wins with tombstones). */

export type MergeAction = 'add' | 'replace' | 'delete-local' | 'skip'

export interface MergeInput {
  remote: { deleted: boolean; updatedAt: string }
  local?: { updatedAt?: string } | null
  /** A local deletion record for the same record, if any. */
  tombstone?: { deletedAt: string } | null
  /** Remote wins regardless of timestamps (e.g. first sync on a fresh device for the singleton profile). */
  preferRemote?: boolean
}

export function decideMerge({ remote, local, tombstone, preferRemote }: MergeInput): MergeAction {
  const localAt = local?.updatedAt ?? ''
  if (remote.deleted) {
    return local && localAt <= remote.updatedAt ? 'delete-local' : 'skip'
  }
  if (tombstone && tombstone.deletedAt > remote.updatedAt) return 'skip'
  if (!local) return 'add'
  if (preferRemote) return 'replace'
  return remote.updatedAt > localAt ? 'replace' : 'skip'
}

/** Firestore rejects `undefined` and cannot store Blobs: strip both, plus the local autoincrement id. */
export function toCloudData(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k === 'id' || v === undefined || v instanceof Blob) continue
    out[k] = v
  }
  return out
}

/** Firestore document ids may not contain '/'. */
export function recordDocId(table: string, uid: string): string {
  return encodeURIComponent(`${table}__${uid}`)
}
