'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Layers, Plus, Trash2, Loader2, Edit3, Check } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { getSectionsByYear, addSection, deleteSection, getCustomStructures, saveCustomStructure, deleteCustomStructure, getActiveStructure, setActiveStructure } from '@/app/actions/settings'
import { PREDEFINED_STRUCTURES, CoStructure } from '@/lib/co-structures'

interface SettingsClientProps {
  role: 'ADMIN' | 'HOD'
  departmentId?: string
  departments?: { id: string; name: string; code: string }[]
}

const YEARS = ['FY', 'SY', 'TY', 'Final Year']

export function SettingsClient({ role, departmentId: initialDeptId, departments }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'sections' | 'co'>('co')
  const [selectedDeptId, setSelectedDeptId] = useState<string>(initialDeptId || (departments?.[0]?.id || ''))

  // The effective department ID: for HOD it's fixed, for ADMIN it's from the dropdown
  const effectiveDeptId = role === 'HOD' ? initialDeptId : selectedDeptId

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-2">Manage application configurations and preferences.</p>
      </div>

      {/* Admin Department Selector */}
      {role === 'ADMIN' && departments && departments.length > 0 && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-4">
          <label className="text-[13px] font-semibold text-indigo-900 whitespace-nowrap">Managing Department:</label>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="flex-1 max-w-xs px-3 py-2 border border-indigo-200 rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 space-y-1">
          <button
            onClick={() => setActiveTab('sections')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-[14px] font-medium rounded-xl transition-colors ${
              activeTab === 'sections'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'
            }`}
          >
            <Layers className="w-4 h-4" />
            Manage Sections
          </button>
          <button
            onClick={() => setActiveTab('co')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-[14px] font-medium rounded-xl transition-colors ${
              activeTab === 'co'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            CO Structure
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 bg-white border rounded-2xl shadow-sm p-6 md:p-8">
          {activeTab === 'sections' && (
            <SectionManager departmentId={effectiveDeptId} />
          )}

          {activeTab === 'co' && (
            <CoStructureManager departmentId={effectiveDeptId} />
          )}
        </div>
      </div>
    </div>
  )
}

function SectionManager({ departmentId }: { departmentId?: string }) {
  const [selectedYear, setSelectedYear] = useState<string>('FY')
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [newSectionName, setNewSectionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null)

  useEffect(() => {
    const fetchSections = async () => {
      if (!departmentId) return
      setLoading(true)
      const data = await getSectionsByYear(departmentId, selectedYear)
      setSections(data)
      setLoading(false)
    }
    fetchSections()
  }, [departmentId, selectedYear])

  const handleAddSection = async () => {
    if (!newSectionName.trim() || !departmentId) return
    const result = await addSection(departmentId, selectedYear, newSectionName)
    if (result.success) {
      setNewSectionName('')
      const data = await getSectionsByYear(departmentId, selectedYear)
      setSections(data)
      toast.success('Section added successfully')
    } else {
      toast.error(result.error || 'Failed to add section')
    }
  }

  const confirmDeleteSection = async () => {
    if (!sectionToDelete || !departmentId) return
    const result = await deleteSection(sectionToDelete)
    if (result.success) {
      const data = await getSectionsByYear(departmentId, selectedYear)
      setSections(data)
      toast.success('Section removed successfully')
    } else {
      toast.error(result.error || 'Failed to remove section')
    }
    setSectionToDelete(null)
  }

  if (!departmentId) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
        Department ID is required to manage sections.
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Manage Sections</h2>
          <InfoTooltip content="Add or remove class sections (like A, B, C) for each academic year (FY, SY, TY, Final Year). Sections are used to group students and assign faculty to specific subject offerings." />
        </div>
        <p className="text-[13px] text-muted-foreground mt-1">
          Add or remove class sections specific to an academic year.
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-black/5 rounded-xl w-max">
        {YEARS.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${
              selectedYear === year
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      <div className="border rounded-2xl p-5 bg-black/[0.02]">
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="e.g., A, B, C"
            className="flex-1 px-4 py-2.5 border rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          />
          <button
            onClick={handleAddSection}
            disabled={!newSectionName.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-[14px] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : sections.length === 0 ? (
          <div className="py-8 text-center text-[14px] text-muted-foreground border-2 border-dashed rounded-xl border-black/5 bg-white">
            No sections found for {selectedYear}.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {sections.map(section => (
              <div key={section.id} className="group flex items-center justify-between px-4 py-3 bg-white border rounded-xl shadow-sm">
                <span className="text-[14px] font-semibold">Section {section.name}</span>
                <button
                  onClick={() => setSectionToDelete(section.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!sectionToDelete}
        title="Remove Section"
        description="Are you sure you want to remove this section? This action cannot be undone."
        isDanger={true}
        confirmText="Remove"
        onConfirm={confirmDeleteSection}
        onCancel={() => setSectionToDelete(null)}
      />
    </div>
  )
}

function CoStructureManager({ departmentId }: { departmentId?: string }) {
  const [selectedYear, setSelectedYear] = useState<string>('FY')
  const [customStructures, setCustomStructures] = useState<CoStructure[]>([])
  const [activeStructureId, setActiveStructureId] = useState<string>('STRUCTURE_1')
  const [loading, setLoading] = useState(false)

  // Builder Modal State
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingStructure, setEditingStructure] = useState<Partial<CoStructure> | null>(null)
  const [structureToDelete, setStructureToDelete] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!departmentId) return
      setLoading(true)
      const [custom, active] = await Promise.all([
        getCustomStructures(departmentId),
        getActiveStructure(departmentId, selectedYear)
      ])
      setCustomStructures(custom)
      setActiveStructureId(active)
      setLoading(false)
    }
    fetchData()
  }, [departmentId, selectedYear])

  const handleSetActive = async (id: string) => {
    if (!departmentId) return
    const res = await setActiveStructure(departmentId, selectedYear, id)
    if (res.success) {
      setActiveStructureId(id)
      toast.success('Active structure updated')
    }
  }

  const confirmDeleteCustom = async () => {
    if (!structureToDelete || !departmentId) return
    await deleteCustomStructure(departmentId, structureToDelete)
    setCustomStructures(s => s.filter(x => x.id !== structureToDelete))
    if (activeStructureId === structureToDelete) {
      handleSetActive('STRUCTURE_1') // fallback
    }
    toast.success('Custom structure deleted')
    setStructureToDelete(null)
  }

  const handleSaveCustom = async () => {
    if (!editingStructure || !editingStructure.name || !editingStructure.uts || !departmentId) {
      toast.error('Please provide a name and at least one UT configuration.')
      return
    }
    const struct: CoStructure = {
      id: editingStructure.id || `CUSTOM_${Date.now()}`,
      name: editingStructure.name,
      description: editingStructure.description || 'Custom Structure',
      type: 'CUSTOM',
      numberOfUts: editingStructure.uts.length,
      uts: editingStructure.uts,
    }
    await saveCustomStructure(departmentId, struct as unknown as { id: string; [key: string]: unknown })
    const updated = await getCustomStructures(departmentId)
    setCustomStructures(updated)
    setShowBuilder(false)
    setEditingStructure(null)
    toast.success('Structure saved successfully')
  }

  if (!departmentId) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
        Department ID is required to manage CO structures.
      </div>
    )
  }

  const allStructures = [...PREDEFINED_STRUCTURES, ...customStructures]

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Course Outcome (CO) Structure</h2>
          <InfoTooltip content="Select the structure that defines how many Unit Tests (UTs) and Re-UTs will be conducted, along with the question pattern for each. The selected structure controls the UT options in the question paper form and how COs are mapped across the project. To use a different number of UTs (e.g., 4), create a custom structure with as many UTs as needed." />
        </div>
        <p className="text-[13px] text-muted-foreground mt-1">
          Select or configure the question paper and CO mapping structure for a specific academic year.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="flex gap-2 p-1 bg-black/5 rounded-xl w-max">
          {YEARS.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                selectedYear === year
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setEditingStructure({
              name: '',
              description: '',
              uts: [{ name: 'UT1', unitsCovered: 2, isReUt: false, questions: [{ name: 'Q1', hasAlternative: true }] }]
            })
            setShowBuilder(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[13px] font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Create Custom Structure
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {allStructures.map(struct => {
            const isActive = activeStructureId === struct.id
            return (
              <div
                key={struct.id}
                className={`flex flex-col border rounded-2xl overflow-hidden transition-all duration-200 ${
                  isActive ? 'border-primary ring-1 ring-primary shadow-sm bg-primary/[0.02]' : 'bg-white hover:border-black/20 hover:shadow-sm'
                }`}
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-bold text-foreground leading-tight">{struct.name}</h3>
                        {struct.type === 'CUSTOM' && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase rounded-md tracking-wider">Custom</span>
                        )}
                      </div>
                      <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{struct.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {struct.uts.map((ut, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-black/[0.03] p-2.5 rounded-lg border border-black/5">
                        <div className={`text-[12px] font-bold px-2 py-1 rounded ${ut.isReUt ? 'bg-red-100 text-red-700' : 'bg-white text-foreground shadow-sm'}`}>
                          {ut.name}
                        </div>
                        <div className="flex-1 text-[12px] text-muted-foreground flex items-center gap-2">
                          <span>{ut.unitsCovered} Units</span>
                          <span className="w-1 h-1 bg-black/20 rounded-full" />
                          <span>{ut.questions.length} Qs ({ut.questions.some(q => q.hasAlternative) ? 'OR allowed' : 'Mandatory'})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-black/[0.02] border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {struct.type === 'CUSTOM' && (
                      <>
                        <button
                          onClick={() => { setEditingStructure(struct); setShowBuilder(true) }}
                          className="p-1.5 text-muted-foreground hover:bg-black/5 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setStructureToDelete(struct.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleSetActive(struct.id)}
                    className={`px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground flex items-center gap-1.5'
                        : 'bg-white border text-foreground hover:bg-black/5'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-4 h-4" /> Selected
                      </>
                    ) : (
                      'Select Structure'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Builder Modal */}
      {showBuilder && editingStructure && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-3xl rounded-2xl shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-card">
              <h3 className="font-bold text-lg">{editingStructure.id ? 'Edit Custom Structure' : 'Create Custom Structure'}</h3>
              <button onClick={() => setShowBuilder(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold">Structure Name</label>
                  <input
                    type="text"
                    value={editingStructure.name || ''}
                    onChange={e => setEditingStructure({ ...editingStructure, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-[14px] outline-none focus:border-primary"
                    placeholder="e.g., Department Special Format"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold">Description</label>
                  <input
                    type="text"
                    value={editingStructure.description || ''}
                    onChange={e => setEditingStructure({ ...editingStructure, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-[14px] outline-none focus:border-primary"
                    placeholder="Brief description"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-[15px]">Unit Tests Configurations</h4>
                  <button
                    onClick={() => {
                      const uts = [...(editingStructure.uts || [])]
                      uts.push({ name: `UT${uts.length + 1}`, unitsCovered: 2, isReUt: false, questions: [{ name: 'Q1', hasAlternative: true }] })
                      setEditingStructure({ ...editingStructure, uts })
                    }}
                    className="text-[13px] font-semibold text-primary flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add UT
                  </button>
                </div>
                
                <div className="space-y-4">
                  {(editingStructure.uts || []).map((ut, utIdx) => (
                    <div key={utIdx} className="border rounded-xl p-4 bg-black/[0.02]">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={ut.name}
                            onChange={e => {
                              const uts = [...editingStructure.uts!]
                              uts[utIdx].name = e.target.value
                              setEditingStructure({ ...editingStructure, uts })
                            }}
                            className="px-3 py-1.5 border rounded-lg text-[13px] font-bold w-32 outline-none focus:border-primary"
                            placeholder="UT Name"
                          />
                          <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ut.isReUt}
                              onChange={e => {
                                const uts = [...editingStructure.uts!]
                                uts[utIdx].isReUt = e.target.checked
                                setEditingStructure({ ...editingStructure, uts })
                              }}
                            />
                            Is Re-UT
                          </label>
                        </div>
                        <button
                          onClick={() => {
                            const uts = [...editingStructure.uts!]
                            uts.splice(utIdx, 1)
                            setEditingStructure({ ...editingStructure, uts })
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 mb-3">
                        <div className="space-y-1">
                          <label className="text-[12px] font-semibold text-muted-foreground">Units Covered</label>
                          <input
                            type="number"
                            value={ut.unitsCovered === 0 ? '' : ut.unitsCovered}
                            onChange={e => {
                              const val = e.target.value
                              const uts = [...editingStructure.uts!]
                              uts[utIdx].unitsCovered = val === '' ? 0 : (parseInt(val) || 1)
                              setEditingStructure({ ...editingStructure, uts })
                            }}
                            className="w-full px-3 py-1.5 border rounded-lg text-[13px] outline-none"
                            min="1" max="6"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[12px] font-semibold text-muted-foreground">Questions Count</label>
                          <input
                            type="number"
                            value={ut.questions.length === 0 ? '' : ut.questions.length}
                            onChange={e => {
                              const val = e.target.value
                              const uts = [...editingStructure.uts!]
                              if (val === '') {
                                uts[utIdx].questions = []
                                setEditingStructure({ ...editingStructure, uts })
                                return
                              }
                              const count = parseInt(val)
                              if (isNaN(count)) return
                              const qList = [...uts[utIdx].questions]
                              if (count > qList.length) {
                                for(let i=qList.length; i<count; i++) qList.push({ name: `Q${i+1}`, hasAlternative: true })
                              } else {
                                qList.length = count
                              }
                              uts[utIdx].questions = qList
                              setEditingStructure({ ...editingStructure, uts })
                            }}
                            className="w-full px-3 py-1.5 border rounded-lg text-[13px] outline-none"
                            min="1" max="10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[12px] font-semibold text-muted-foreground">Questions Configuration</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {ut.questions.map((q, qIdx) => (
                            <label key={qIdx} className="flex items-center gap-2 p-2 bg-white border rounded-lg text-[12px] cursor-pointer hover:bg-black/5">
                              <input
                                type="checkbox"
                                checked={q.hasAlternative}
                                onChange={e => {
                                  const uts = [...editingStructure.uts!]
                                  uts[utIdx].questions[qIdx].hasAlternative = e.target.checked
                                  setEditingStructure({ ...editingStructure, uts })
                                }}
                              />
                              {q.name} (Has OR)
                            </label>
                          ))}
                        </div>
                      </div>

                    </div>
                  ))}
                  {(!editingStructure.uts || editingStructure.uts.length === 0) && (
                    <div className="text-center p-6 border border-dashed rounded-xl text-[13px] text-muted-foreground">
                      No UTs configured. Click &quot;Add UT&quot; to start.
                    </div>
                  )}
                  {/* Add UT Button at the bottom for easier access */}
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => {
                        const uts = [...(editingStructure.uts || [])]
                        uts.push({ name: `UT${uts.length + 1}`, unitsCovered: 2, isReUt: false, questions: [{ name: 'Q1', hasAlternative: true }] })
                        setEditingStructure({ ...editingStructure, uts })
                      }}
                      className="px-4 py-2 border border-dashed rounded-xl text-[13px] font-semibold text-muted-foreground flex items-center gap-2 hover:bg-black/5 hover:text-foreground transition-colors w-full justify-center"
                    >
                      <Plus className="w-4 h-4" /> Add UT
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-card flex justify-end gap-3">
              <button
                onClick={() => setShowBuilder(false)}
                className="px-5 py-2.5 text-[14px] font-semibold rounded-xl hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-5 py-2.5 bg-primary text-primary-foreground text-[14px] font-semibold rounded-xl hover:opacity-90"
              >
                Save Structure
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!structureToDelete}
        title="Delete Custom Structure"
        description="Are you sure you want to delete this custom structure? This action cannot be undone."
        isDanger={true}
        confirmText="Delete"
        onConfirm={confirmDeleteCustom}
        onCancel={() => setStructureToDelete(null)}
      />
    </div>
  )
}
