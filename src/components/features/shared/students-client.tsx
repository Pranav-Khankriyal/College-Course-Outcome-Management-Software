'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Plus, Upload, FileText, CheckCircle, AlertCircle, History } from 'lucide-react'
import { toast } from 'sonner'
import { getStudents, previewStudentImport, confirmStudentImport, getStudentHistory, addStudent } from '@/app/actions/students'

export function StudentsClient({
  departments,
  academicContexts,
  sections,
  initialDepartmentId,
  role
}: {
  departments: { id: string; name: string }[],
  academicContexts: { id: string; academicYear: string; semester: string; term?: string | null }[],
  sections: { id: string; name: string; year: string; departmentId: string }[],
  initialDepartmentId?: string,
  role: string
}) {
  const [departmentId, setDepartmentId] = useState(initialDepartmentId || (departments[0]?.id || ''))
  const [academicContextId, setAcademicContextId] = useState(academicContexts[0]?.id || '')
  const [sectionId, setSectionId] = useState('all')

  const [enrollments, setEnrollments] = useState<{
    rollNumber: string;
    student: { id: string; prn: string; name: string; status: string };
    section: { name: string; year: string };
  }[]>([])

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newPrn, setNewPrn] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRoll, setNewRoll] = useState('')
  const [newSectionId, setNewSectionId] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // History State
  const [historyData, setHistoryData] = useState<{
    rollNumber: string;
    section: { name: string; year: string };
    academicContext: { academicYear: string; semester: string; term?: string | null };
  }[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    newStudents: number;
    existingStudents: number;
    invalidRows: number;
    parsedData: { prn: string; name: string; rollNumber: string; email: string; sectionName?: string }[];
  } | null>(null)

  const fetchStudents = async () => {
    if (!departmentId || !academicContextId) return
    try {
      const data = await getStudents(departmentId, academicContextId, sectionId)
      setEnrollments(data)
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to fetch students')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const base64 = (event.target?.result as string).split(',')[1]
        const preview = await previewStudentImport(base64, departmentId, academicContextId, sectionId === 'all' ? undefined : sectionId)
        setPreviewData(preview)
      } catch (err: unknown) {
        toast.error('Import Error: ' + (err as Error).message)
      }
    }
    reader.readAsDataURL(file)
  }

  const confirmImport = async () => {
    if (!previewData) return
    try {
      await confirmStudentImport(previewData.parsedData, departmentId, academicContextId, sectionId === 'all' ? undefined : sectionId)
      setIsImportOpen(false)
      setPreviewData(null)
      fetchStudents()
      toast.success('Students imported successfully')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to import students')
    }
  }

  const openHistory = async (studentId: string) => {
    try {
      const hist = await getStudentHistory(studentId)
      setHistoryData(hist)
      setIsHistoryOpen(true)
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to load history')
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPrn || !newName || !newRoll || !departmentId || !academicContextId) {
      toast.error('Please fill in all required fields.')
      return
    }
    const targetSec = newSectionId || (sections.filter(s => s.departmentId === departmentId)[0]?.id)
    if (!targetSec) {
      toast.error('Please select a valid section.')
      return
    }
    setAddLoading(true)
    try {
      await addStudent({
        prn: newPrn,
        name: newName,
        email: newEmail,
        rollNumber: newRoll,
        departmentId,
        academicContextId,
        sectionId: targetSec
      })
      toast.success('Student added successfully')
      setIsAddOpen(false)
      setNewPrn('')
      setNewName('')
      setNewEmail('')
      setNewRoll('')
      fetchStudents()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to add student')
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Master</h2>
          <p className="text-slate-500">Manage students, enrollments, and academic history.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      <Card className="p-4 border-slate-200/60 shadow-sm flex flex-wrap gap-4 items-end">
        {role === 'ADMIN' && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Department</label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Academic Period</label>
          <select
            value={academicContextId}
            onChange={e => setAcademicContextId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
          >
            {academicContexts.map(c => (
              <option key={c.id} value={c.id}>{c.academicYear} Sem {c.semester} ({c.term})</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Section</label>
          <select
            value={sectionId}
            onChange={e => setSectionId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
          >
            <option value="all">All Sections</option>
            {sections.filter(s => s.departmentId === departmentId).map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.year})</option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchStudents}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Load Students
        </button>
      </Card>

      <Card className="overflow-hidden border-slate-200/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Roll No</th>
                <th className="px-6 py-4 font-medium">PRN</th>
                <th className="px-6 py-4 font-medium">Student Name</th>
                <th className="px-6 py-4 font-medium">Section</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No students found for this selection.
                  </td>
                </tr>
              ) : (
                enrollments.map((enr, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{enr.rollNumber}</td>
                    <td className="px-6 py-4 text-slate-600">{enr.student.prn}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{enr.student.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                        {enr.section.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        enr.student.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 
                        enr.student.status === 'ALUMNI' ? 'bg-purple-50 text-purple-700 border border-purple-200/50' :
                        'bg-red-50 text-red-700 border border-red-200/50'
                      }`}>
                        {enr.student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openHistory(enr.student.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="View History">
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* IMPORT MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Import Students</h3>
              <button onClick={() => { setIsImportOpen(false); setPreviewData(null) }} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <div className="p-6">
              {!previewData ? (
                <div className="space-y-4">
                  <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm border border-indigo-100">
                    <strong>Format Required:</strong> Excel file with columns: <code>PRN</code>, <code>Student Name</code>, <code>Roll Number</code>, <code>Section</code>, <code>Email</code> (optional).
                  </div>
                  
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700">Click to upload Excel file</p>
                    <p className="text-xs text-slate-500 mt-1">.xlsx, .xls</p>
                    <input type="file" className="hidden" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileChange} />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      Import Preview
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                        <div className="text-2xl font-bold text-slate-900">{previewData.totalRows}</div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Total Rows</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                        <div className="text-2xl font-bold text-emerald-600">{previewData.newStudents}</div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">New Students</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                        <div className="text-2xl font-bold text-blue-600">{previewData.existingStudents}</div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Existing</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                        <div className="text-2xl font-bold text-rose-600">{previewData.invalidRows}</div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Invalid</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Please confirm carefully.</strong> This will create historical academic enrollment records for <strong>{previewData.totalRows - previewData.invalidRows}</strong> students in the selected academic period.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button
                onClick={() => { setIsImportOpen(false); setPreviewData(null) }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              {previewData && (
                <button
                  onClick={confirmImport}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm Import
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                Academic History
              </h3>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {historyData.map((h, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <span className="text-xs font-semibold">{h.section.year}</span>
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-900">{h.academicContext.academicYear} Sem {h.academicContext.semester}</div>
                        <time className="font-medium text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{h.academicContext.term}</time>
                      </div>
                      <div className="text-slate-500 text-sm">
                        Section <strong>{h.section.name}</strong> • Roll No: <strong>{h.rollNumber}</strong>
                      </div>
                    </div>
                  </div>
                ))}
                {historyData.length === 0 && (
                  <p className="text-center text-slate-500">No historical records found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 text-slate-900">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                Add Student
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">PRN Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2102001"
                  value={newPrn}
                  onChange={e => setNewPrn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan Sharma"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Roll Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101"
                  value={newRoll}
                  onChange={e => setNewRoll(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. aryan@college.edu"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Section</label>
                <select
                  value={newSectionId}
                  onChange={e => setNewSectionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select Section</option>
                  {sections.filter(s => s.departmentId === departmentId).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.year})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {addLoading ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
