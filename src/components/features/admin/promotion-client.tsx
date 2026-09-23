'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ArrowRight, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { previewPromotion, executePromotion } from '@/app/actions/academic'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function PromotionClient({
  departments,
  academicContexts,
  sections,
  initialDepartmentId,
  role
}: {
  departments: { id: string; name: string }[],
  academicContexts: { id: string; academicYear: string; semester: string; term: string }[],
  sections: { id: string; name: string; year: string; departmentId: string }[],
  initialDepartmentId?: string,
  role: string
}) {
  const [departmentId, setDepartmentId] = useState(initialDepartmentId || (departments[0]?.id || ''))
  const [sourceContextId, setSourceContextId] = useState(academicContexts[0]?.id || '')
  const [targetContextId, setTargetContextId] = useState(academicContexts[1]?.id || '')
  const [sectionId, setSectionId] = useState('all')
  const [autoUpgradeSections, setAutoUpgradeSections] = useState(true)

  const [previewData, setPreviewData] = useState<{
    totalFound: number;
    eligible: number;
    held: number;
    left: number;
    enrollments: unknown[];
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePreview = async () => {
    if (sourceContextId === targetContextId) {
      toast.error("Source and Target academic periods must be different.")
      return
    }
    setLoading(true)
    try {
      const data = await previewPromotion(sourceContextId, targetContextId, departmentId, sectionId)
      setPreviewData(data)
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to preview promotion')
    } finally {
      setLoading(false)
    }
  }

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const result = await executePromotion(sourceContextId, targetContextId, departmentId, sectionId, autoUpgradeSections)
      toast.success(`Successfully promoted ${result.promotedCount} students!`)
      setPreviewData(null)
      setIsConfirmOpen(false)
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to promote students')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Semester Promotion</h2>
          <p className="text-slate-500">Promote students to the next academic period while retaining historical records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-slate-200/60 shadow-sm space-y-5 relative">
          <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-10 hidden lg:flex items-center justify-center w-6 h-6 bg-slate-100 rounded-full text-slate-400">
            <ArrowRight className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">1. Select Source</h3>
          
          {role === 'ADMIN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Department</label>
              <select
                value={departmentId}
                onChange={e => { setDepartmentId(e.target.value); setPreviewData(null); }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Source Academic Period</label>
            <select
              value={sourceContextId}
              onChange={e => { setSourceContextId(e.target.value); setPreviewData(null); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
            >
              {academicContexts.map(c => (
                <option key={c.id} value={c.id}>{c.academicYear} Sem {c.semester} ({c.term})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Section</label>
            <select
              value={sectionId}
              onChange={e => { setSectionId(e.target.value); setPreviewData(null); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
            >
              <option value="all">All Sections (Entire Department)</option>
              {sections.filter(s => s.departmentId === departmentId).map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.year})</option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="p-6 border-slate-200/60 shadow-sm space-y-5">
          <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">2. Select Target</h3>
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Target Academic Period</label>
            <select
              value={targetContextId}
              onChange={e => { setTargetContextId(e.target.value); setPreviewData(null); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
            >
              {academicContexts.map(c => (
                <option key={c.id} value={c.id}>{c.academicYear} Sem {c.semester} ({c.term})</option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-3 text-sm font-medium text-slate-700 cursor-pointer">
              <input 
                type="checkbox"
                checked={autoUpgradeSections}
                onChange={e => setAutoUpgradeSections(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span>Auto-upgrade semester names & years (e.g. Sem 3 → Sem 4, FY → SY)</span>
            </label>
          </div>

          <div className="pt-4">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Preview Promotion'}
            </button>
          </div>
        </Card>
      </div>

      {previewData && (
        <Card className="p-6 border-slate-200/60 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Promotion Preview
              </h3>
              <p className="text-sm text-slate-500 mt-1">Review the eligibility of students before confirming the promotion.</p>
            </div>
            
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={loading || previewData.eligible === 0}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm & Promote {previewData.eligible} Students
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              <div className="text-3xl font-bold text-slate-900">{previewData.totalFound}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase mt-1">Total Found</div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
              <div className="text-3xl font-bold text-emerald-600">{previewData.eligible}</div>
              <div className="text-xs font-semibold text-emerald-700 uppercase mt-1">Eligible (Active)</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
              <div className="text-3xl font-bold text-amber-600">{previewData.held}</div>
              <div className="text-xs font-semibold text-amber-700 uppercase mt-1">Held (Inactive)</div>
            </div>
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-center">
              <div className="text-3xl font-bold text-rose-600">{previewData.left}</div>
              <div className="text-xs font-semibold text-rose-700 uppercase mt-1">Left/Alumni</div>
            </div>
          </div>

          {previewData.held > 0 && (
            <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <strong>{previewData.held} students</strong> are marked as INACTIVE and will be excluded from this promotion.
              </div>
            </div>
          )}

          <div className="bg-indigo-50 border border-indigo-200/60 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div className="text-sm text-indigo-900">
              Only <strong>ACTIVE</strong> students will be copied to the target academic period. Their historical enrollment in the source period will remain intact. No data will be overwritten.
            </div>
          </div>
        </Card>
      )}

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Confirm Promotion"
        description={`Are you sure you want to promote ${previewData?.eligible || 0} students? This action will copy them to the target academic period.`}
        confirmText="Yes, Promote Students"
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  )
}
