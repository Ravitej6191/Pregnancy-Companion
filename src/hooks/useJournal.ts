import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { JournalEntry } from '../types'
import { getTodayISO } from '../utils/dateUtils'

export function useJournal() {
  const entries = useLiveQuery(
    () => db.journalEntries.orderBy('date').reverse().toArray()
  )

  async function saveEntry(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    await db.journalEntries.add({ ...entry, createdAt: now, updatedAt: now })
  }

  async function updateEntry(id: number, entry: Partial<JournalEntry>) {
    await db.journalEntries.update(id, { ...entry, updatedAt: new Date().toISOString() })
  }

  async function deleteEntry(id: number) {
    await db.journalEntries.delete(id)
  }

  const todayEntry = entries?.find(e => e.date === getTodayISO())

  return { entries, todayEntry, saveEntry, updateEntry, deleteEntry }
}
