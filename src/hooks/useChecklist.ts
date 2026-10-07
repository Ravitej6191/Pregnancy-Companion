import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

export function useChecklist() {
  const items = useLiveQuery(() =>
    db.checklistItems.toArray().then(all => all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
  )

  async function toggleItem(id: number, isChecked: boolean) {
    await db.checklistItems.update(id, { isChecked })
  }

  async function addCustomItem(category: string, label: string) {
    const count = await db.checklistItems.count()
    await db.checklistItems.add({
      category,
      label,
      isChecked: false,
      isCustom: true,
      sortOrder: count,
      createdAt: new Date().toISOString(),
    })
  }

  async function deleteItem(id: number) {
    await db.checklistItems.delete(id)
  }

  const categories = [...new Set(items?.map(i => i.category) ?? [])]
  const checkedCount = items?.filter(i => i.isChecked).length ?? 0
  const totalCount = items?.length ?? 0

  return { items, categories, checkedCount, totalCount, toggleItem, addCustomItem, deleteItem }
}
