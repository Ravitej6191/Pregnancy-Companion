import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { DoctorVisit } from '../types'

export function useDoctorVisits() {
  const visits = useLiveQuery(
    () => db.doctorVisits.orderBy('date').reverse().toArray()
  )

  async function addVisit(visit: Omit<DoctorVisit, 'id' | 'createdAt'>) {
    await db.doctorVisits.add({ ...visit, createdAt: new Date().toISOString() })
  }

  async function updateVisit(id: number, visit: Partial<DoctorVisit>) {
    await db.doctorVisits.update(id, visit)
  }

  async function deleteVisit(id: number) {
    await db.doctorVisits.delete(id)
  }

  return { visits, addVisit, updateVisit, deleteVisit }
}
