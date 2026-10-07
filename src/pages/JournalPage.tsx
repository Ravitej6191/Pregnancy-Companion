import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, NotebookText } from 'lucide-react'
import { useJournal } from '../hooks/useJournal'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { MOODS } from '../utils/constants'
import { getRelativeDay, formatDateTime } from '../utils/dateUtils'
import { useObjectUrl } from '../hooks/useObjectUrl'

export function JournalPage() {
  const navigate = useNavigate()
  const { entries } = useJournal()

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader
        title="My Journal"
        right={
          <Button size="sm" onClick={() => navigate('/journal/new')}>
            <Plus size={16} className="inline mr-1" /> New
          </Button>
        }
      />
      <div className="px-5 pb-8">
        {!entries || entries.length === 0 ? (
          <EmptyState
            icon={<NotebookText size={28} className="text-brand-primary" />}
            title="Your story starts here"
            subtitle="Write about your feelings, milestones, or anything on your mind."
            action={
              <Button onClick={() => navigate('/journal/new')}>
                Write First Entry
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => {
              const mood = MOODS.find(m => m.value === entry.mood)
              const dateTimeStr = entry.createdAt ? formatDateTime(entry.createdAt) : ''
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card
                    className="cursor-pointer"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/journal/${entry.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-brand-text text-sm">{getRelativeDay(entry.date)}</p>
                        <p className="text-xs text-brand-text/50">Week {entry.weekNumber}</p>
                        {dateTimeStr && <p className="text-xs text-brand-text/40 mt-0.5">{dateTimeStr}</p>}
                      </div>
                      {mood && (
                        <Badge bg={`${mood.color}18`} color={mood.color}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ backgroundColor: mood.color }} />
                          {mood.label}
                        </Badge>
                      )}
                    </div>

                    {entry.photo && <JournalPhoto blob={entry.photo} />}

                    <p className="text-sm text-brand-text/70 line-clamp-3 leading-relaxed">
                      {entry.notes || 'No notes'}
                    </p>

                    {entry.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.symptoms.slice(0, 3).map(s => (
                          <Badge key={s} bg="#FFE8F0" color="#C97B98" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                        {entry.symptoms.length > 3 && (
                          <Badge bg="#FFE8F0" color="#C97B98" className="text-[10px]">
                            +{entry.symptoms.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function JournalPhoto({ blob }: { blob: Blob }) {
  const url = useObjectUrl(blob)
  if (!url) return null
  return (
    <div className="mb-2 rounded-xl overflow-hidden h-32 bg-gray-100">
      <img src={url} alt="Journal photo" className="w-full h-full object-cover" />
    </div>
  )
}
