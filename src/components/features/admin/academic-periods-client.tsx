'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Plus, Edit2, Calendar, FastForward, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { createAcademicPeriod, updateAcademicPeriod, advanceSemesterOrRollover } from '@/app/actions/academic'
import { AcademicPeriodStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'

export function AcademicPeriodsClient({
  initialPeriods
}: {
  initialPeriods: { id: string; academicYear: string; semester: string; term?: string | null; startDate?: Date | null; endDate?: Date | null; status: AcademicPeriodStatus }[]
}) {
  const [periods, setPeriods] = useState(initialPeriods)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<{ id: string; academicYear: string; semester: string; term?: string | null; status: AcademicPeriodStatus } | null>(null)
  const router = useRouter()
  
  // form state
  const [academicYear, setAcademicYear] = useState('')
  const [semester, setSemester] = useState('')
  const [term, setTerm] = useState('Odd')
  const [status, setStatus] = useState<AcademicPeriodStatus>('UPCOMING')

  const currentPeriod = periods.find(p => p.status === 'CURRENT')
  const isOddActive = currentPeriod?.term === 'Odd' || currentPeriod?.semester?.toLowerCase().includes('odd')

  const openNew = () => {
    setEditingPeriod(null)
    setAcademicYear('')
    setSemester('')
    setTerm('Odd')
    setStatus('UPCOMING')
    setIsModalOpen(true)
  }

  const openEdit = (p: { id: string; academicYear: string; semester: string; term?: string | null; status: AcademicPeriodStatus }) => {
    setEditingPeriod(p)
    setAcademicYear(p.academicYear)
    setSemester(p.semester)
    setTerm(p.term || 'Odd')
    setStatus(p.status)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingPeriod) {
        const updated = await updateAcademicPeriod(editingPeriod.id, {
          term, status
        })
        setPeriods(periods.map(p => p.id === updated.id ? updated : p))
      } else {
        const created = await createAcademicPeriod({
          academicYear, semester, term, status
        })
        setPeriods([created, ...periods])
      }
      setIsModalOpen(false)
      router.refresh()
      toast.success(editingPeriod ? 'Period updated successfully' : 'Period created successfully')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to save period')
    }
  }

  const handleAdvanceSemester = async () => {
    setIsAdvancing(true)
    try {
      const res = await advanceSemesterOrRollover()
      toast.success(res.message)
      router.refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to advance semester')
    } finally {
      setIsAdvancing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Academic Periods</h2>
          <p className="text-slate-500">Manage semesters, academic calendar cycles, and automated year rollover.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAdvanceSemester}
            disabled={isAdvancing}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
            title={isOddActive ? 'Advance to Even Semester' : 'Conclude 2nd Semester & Rollover to Next Academic Year'}
          >
            <FastForward className="w-4 h-4 text-amber-400" />
            {isAdvancing ? 'Advancing...' : isOddActive ? 'Advance to Even Semester' : 'Rollover to Next Academic Year'}
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Period
          </button>
        </div>
      </div>

      {/* Mechanism Info Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-blue-50/80 border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <span>Active Cycle: {currentPeriod ? `${currentPeriod.academicYear} · ${currentPeriod.semester}` : 'None active'}</span>
              {currentPeriod && <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 font-bold rounded-full">ACTIVE</span>}
            </div>
            <p className="text-slate-600 text-xs mt-0.5">
              Automated Rollover: After every 2 semesters (upon completion of each Even semester), the next Academic Year is automatically generated and initialized.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-indigo-700 shrink-0 bg-white/80 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-2xs">
          <span>Oldest: <strong>2024-25</strong></span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span>Current: <strong>2026-27</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {periods.map(p => (
          <Card key={p.id} className={`p-6 relative group overflow-hidden border shadow-sm hover:shadow-md transition-all ${
            p.status === 'CURRENT' ? 'border-indigo-300 ring-2 ring-indigo-500/10 bg-white' : 'border-slate-200/60'
          }`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${
                p.status === 'CURRENT' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  p.status === 'CURRENT' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                  p.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {p.status}
                </span>
                {p.term === 'Even' && (
                  <span className="text-[10px] font-medium text-slate-400">
                    2nd Sem of Year
                  </span>
                )}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{p.academicYear}</h3>
            <p className="text-slate-500 text-sm font-medium">{p.semester} • {p.term} Term</p>

            <button
              onClick={() => openEdit(p)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">
                {editingPeriod ? 'Edit Academic Period' : 'New Academic Period'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              {!editingPeriod && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-27"
                      value={academicYear}
                      onChange={e => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Semester Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 1"
                      value={semester}
                      onChange={e => setSemester(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Term</label>
                <select
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Odd">Odd</option>
                  <option value="Even">Even</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as AcademicPeriodStatus)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="CURRENT">CURRENT</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingPeriod ? 'Save Changes' : 'Create Period'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
