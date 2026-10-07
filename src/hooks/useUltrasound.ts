import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { UltrasoundPhoto } from '../types'

export function useUltrasound() {
  const photos = useLiveQuery(
    () => db.ultrasoundPhotos.orderBy('date').reverse().toArray()
  )

  async function addPhoto(photo: Omit<UltrasoundPhoto, 'id' | 'createdAt'>) {
    await db.ultrasoundPhotos.add({ ...photo, createdAt: new Date().toISOString() })
  }

  async function deletePhoto(id: number) {
    await db.ultrasoundPhotos.delete(id)
  }

  return { photos, addPhoto, deletePhoto }
}
