import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, User, Baby, FileText, Smile, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useChecklist } from '../hooks/useChecklist'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { ProgressRing } from '../components/ui/ProgressRing'
import { Toggle } from '../components/ui/Toggle'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'For Mom': User,
  'For Baby': Baby,
  'Documents': FileText,
  'Comfort': Smile,
}

const CATEGORY_ICON_COLORS: Record<string, string> = {
  'For Mom': 'text-brand-primary',
  'For Baby': 'text-pink-400',
  'Documents': 'text-blue-500',
  'Comfort': 'text-purple-400',
}

export function ChecklistPage() {
  const { items, categories, checkedCount, totalCount, toggleItem, addCustomItem, deleteItem } = useChecklist()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newCategory, setNewCategory] = useState('For Mom')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  // Once categories load from IndexedDB, expand them all by default
  useEffect(() => {
    if (categories.length > 0) {
      setExpandedCats(prev => {
        if (prev.size === 0) return new Set(categories)
        return prev
      })
    }
  }, [categories])

  function toggleCategory(cat: string) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  async function handleAdd() {
    if (!newLabel.trim()) return
    try {
      await addCustomItem(newCategory, newLabel.trim())
      setNewLabel('')
      setShowAddModal(false)
    } catch {
      // Item failed to add — modal stays open, label preserved
    }
  }

  if (items === undefined) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <PageHeader title="Hospital Bag" />
        <div className="flex justify-center items-center mt-20">
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-brand-primary"
                animate={{ scale: [1,1.5,1], opacity: [0.4,1,0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader
        title="Hospital Bag"
        right={
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} className="inline mr-1" /> Add
          </Button>
        }
      />
      <div className="px-5 space-y-4 pb-8">

        {/* Celebration banner */}
        {totalCount > 0 && checkedCount === totalCount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 p-5 text-center shadow-soft"
          >
            <p className="font-bold text-white text-base">You're all packed and ready! 🎉</p>
            <p className="text-white/80 text-sm mt-1">Great job preparing for your big day.</p>
          </motion.div>
        )}

        {/* Progress */}
        <Card gradient className="flex items-center gap-5">
          <ProgressRing progress={progress} size={80} strokeWidth={8}>
            <span className="text-sm font-bold text-brand-primary">{Math.round(progress)}%</span>
          </ProgressRing>
          <div>
            <p className="font-bold text-brand-text">{checkedCount} / {totalCount} packed</p>
            <p className="text-xs text-brand-text/50 mt-0.5">
              {progress >= 100 ? "All packed! You're ready!" : progress >= 50 ? 'Over halfway there!' : 'Keep packing, mama!'}
            </p>
          </div>
        </Card>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎒</p>
            <p className="font-bold text-brand-text">Your bag is empty</p>
            <p className="text-sm text-brand-text/50 mt-1">Tap "Add" to start adding items</p>
          </div>
        )}

        {/* Categories */}
        {items.length > 0 && categories.map(cat => {
          const catItems = items?.filter(i => i.category === cat) ?? []
          const catChecked = catItems.filter(i => i.isChecked).length
          const isExpanded = expandedCats.has(cat)

          return (
            <Card key={cat} noPad>
              <motion.button
                className="w-full flex items-center justify-between p-4"
                onClick={() => toggleCategory(cat)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-secondary/40 flex items-center justify-center flex-shrink-0">
                    {(() => { const Icon = CATEGORY_ICONS[cat] ?? Package; return <Icon size={16} className={CATEGORY_ICON_COLORS[cat] ?? 'text-brand-primary'} /> })()}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-brand-text text-sm">{cat}</p>
                    <p className="text-xs text-brand-text/50">{catChecked}/{catItems.length} items</p>
                  </div>
                </div>
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  className="text-brand-text/40 text-lg"
                >
                  ›
                </motion.span>
              </motion.button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  className="border-t border-brand-secondary/30"
                >
                  {catItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 border-b border-brand-secondary/20 last:border-0"
                    >
                      <span className={`text-sm flex-1 ${item.isChecked ? 'line-through text-brand-text/40' : 'text-brand-text/80'}`}>
                        {item.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => item.id && deleteItem(item.id)} className="text-red-300 text-xs px-1">✕</button>
                        <Toggle
                          checked={item.isChecked}
                          onChange={(v) => item.id && toggleItem(item.id, v)}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </Card>
          )
        })}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Item">
        <div className="space-y-4">
          <Input
            label="Item Name"
            placeholder="e.g. Extra phone charger"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
          />
          <div>
            <label className="block text-sm font-semibold text-brand-text/80 mb-2">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {['For Mom', 'For Baby', 'Documents', 'Comfort'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNewCategory(cat)}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all ${newCategory === cat ? 'bg-brand-primary text-white' : 'bg-brand-secondary/40 text-brand-text'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <Button fullWidth onClick={handleAdd} disabled={!newLabel.trim()}>Add Item</Button>
        </div>
      </Modal>
    </div>
  )
}
