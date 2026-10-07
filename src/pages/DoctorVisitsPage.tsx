import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, Stethoscope } from 'lucide-react'
import { useDoctorVisits } from '../hooks/useDoctorVisits'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { formatDate } from '../utils/dateUtils'

export function DoctorVisitsPage() {
  const navigate = useNavigate()
  const { visits } = useDoctorVisits()

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader
        title="Doctor Visits"
        right={
          <Button size="sm" onClick={() => navigate('/doctor-visits/new')}>
            <Plus size={16} className="inline mr-1" /> Log
          </Button>
        }
      />
      <div className="px-5 pb-8">
        {!visits || visits.length === 0 ? (
          <EmptyState
            icon={<Stethoscope size={30} className="text-brand-primary/60" />}
            title="No visits logged yet"
            subtitle="Track your doctor appointments and measurements"
            action={
              <Button onClick={() => navigate('/doctor-visits/new')}>Log First Visit</Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {visits.map((visit, i) => (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card
                  className="cursor-pointer"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/doctor-visits/${visit.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-brand-text">{formatDate(visit.date, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-xs text-brand-text/50">Week {visit.weekNumber} · {visit.doctorName || 'Doctor'}</p>
                    </div>
                    <Badge bg="#FFE8F0" color="#C97B98">{visit.visitType}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {visit.weight > 0 && (
                      <div className="bg-green-50 rounded-xl p-2 text-center">
                        <p className="text-sm font-bold text-green-600">{visit.weight} kg</p>
                        <p className="text-[10px] text-brand-text/50">Weight</p>
                      </div>
                    )}
                    {visit.bloodPressure && (
                      <div className="bg-blue-50 rounded-xl p-2 text-center">
                        <p className="text-sm font-bold text-blue-600">{visit.bloodPressure}</p>
                        <p className="text-[10px] text-brand-text/50">BP</p>
                      </div>
                    )}
                    {visit.fetalHeartRate > 0 && (
                      <div className="bg-pink-50 rounded-xl p-2 text-center">
                        <p className="text-sm font-bold text-brand-primary">{visit.fetalHeartRate}</p>
                        <p className="text-[10px] text-brand-text/50">FHR bpm</p>
                      </div>
                    )}
                  </div>

                  {visit.notes && (
                    <p className="text-xs text-brand-text/60 mt-2 line-clamp-2">{visit.notes}</p>
                  )}

                  {visit.nextVisitDate && (
                    <p className="text-xs text-brand-primary font-semibold mt-2">
                      Next: {formatDate(visit.nextVisitDate, { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
