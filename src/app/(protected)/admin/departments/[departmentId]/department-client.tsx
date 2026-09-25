'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, BookOpen, LayoutDashboard, Building2, GraduationCap, Search,
  Plus, Trash2, X, Check, Mail, User, BookMarked, UserPlus,
  Upload, CheckCircle, Download, ArrowLeft
} from 'lucide-react'
import * as xlsx from 'xlsx'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { DepartmentDashboard } from '@/components/features/analytics/department-dashboard'
import { CustomSelect } from '@/components/ui/custom-select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AnalyticsData } from '@/app/actions/analytics'
import {
  createSubject, deleteSubject, createAndAssignFaculty,
  assignFacultyToOffering, removeFacultyFromOffering,
  previewFacultyImport, confirmDepartmentFacultyImport
} from '@/app/actions/admin'
import { toast } from 'sonner'

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-80" />
}

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(14, 21, 38, 0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {children}
    </motion.div>
  )
}

export type FacultyUser = {
  id: string
  name: string
  email: string
}

export type DepartmentOffering = {
  id: string
  subject: { id: string; name: string; code: string }
  section: { id: string; name: string; year: string }
  assignments: { id: string; user: { id: string; name: string; email: string } }[]
}

export function AdminDepartmentClient({
  overview, sections, faculty, subjects, academicContexts, activeContextId, analytics,
  allFacultyUsers, departmentOfferings
}: {
  overview: { department: { id: string; name: string; code: string }; hodName: string; stats: { subjectCount: number; sectionCount: number; studentCount: number; facultyCount: number } }
  sections: Record<string, { id: string; name: string; year: string; sectionEnrollments: { id: string; rollNumber: string; student: { name: string; prn: string } }[] }[]>
  faculty: { user: { id: string; name: string; email: string }; assignments: { id: string; courseOffering: { subject: { code: string; name: string }; section: { year: string; name: string } } }[] }[]
  subjects: { id: string; name: string; code: string; semester: number; courseOfferings: { id: string; academicContext: { academicYear: string }; section: { year: string; name: string }; assignments: { user: { id: string; name: string } }[] }[] }[]
  academicContexts: { id: string; academicYear: string; semester: string; status?: string }[]
  activeContextId: string | null
  analytics: AnalyticsData
  allFacultyUsers: FacultyUser[]
  departmentOfferings: DepartmentOffering[]
}) {
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleContextChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val) params.set('context', val)
    else params.delete('context')
    router.push(`?${params.toString()}`)
  }

  const getSectionItems = (yearKey: string) => {
    const items = sections[yearKey]?.map(sec => ({
      key: `section-${sec.id}`,
      label: `Sec ${sec.name}`,
      onClick: () => setActiveTab(`section-${sec.id}`)
    })) || []
    return items.length > 0 ? items : [{ key: `empty-${yearKey}`, label: 'No sections', onClick: () => {} }]
  }

  const customNavItems = [
    {
      key: 'back-to-admin',
      label: 'All Departments',
      icon: <ArrowLeft className="w-[15px] h-[15px]" />,
      href: '/admin',
    },
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-[15px] h-[15px]" />,
      onClick: () => setActiveTab('dashboard'),
    },
    {
      key: 'department',
      label: 'Department',
      icon: <Building2 className="w-[15px] h-[15px]" />,
      children: [
        { key: 'final-year', label: 'Final Year', children: getSectionItems('Final Year') },
        { key: 'ty', label: 'TY', children: getSectionItems('TY') },
        { key: 'sy', label: 'SY', children: getSectionItems('SY') },
        { key: 'fy', label: 'FY', children: getSectionItems('FY') },
      ]
    },
    { key: 'faculty', label: 'Faculty', icon: <Users className="w-[15px] h-[15px]" />, onClick: () => setActiveTab('faculty') },
    { key: 'subjects', label: 'Subjects', icon: <BookOpen className="w-[15px] h-[15px]" />, onClick: () => setActiveTab('subjects') },
  ]

  let breadcrumbLabel = 'Dashboard'
  let activeSection = null
  if (activeTab.startsWith('section-')) {
    const secId = activeTab.replace('section-', '')
    for (const year of Object.values(sections)) {
      const found = year.find((s) => s.id === secId)
      if (found) {
        activeSection = found
        breadcrumbLabel = `Sec ${found.name} (${found.year})`
        break
      }
    }
  } else if (activeTab === 'faculty') breadcrumbLabel = 'Faculty'
  else if (activeTab === 'subjects') breadcrumbLabel = 'Subjects'

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role="ADMIN"
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        userName="Admin"
        userRole="ADMIN"
        customItems={customNavItems}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          backHref="/admin"
          breadcrumbs={[
            { label: 'Departments', href: '/admin' },
            { label: overview.department.code },
            { label: breadcrumbLabel },
          ]} 
        />

        {/* Context selector bar */}
        <div className="bg-card border-b border-black/5 px-5 py-2 flex items-center justify-between sticky top-11 z-40">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-foreground bg-secondary/80 hover:bg-secondary border border-border shadow-2xs transition-all"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Departments</span>
            </Link>
            <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5 tracking-tight">
              <div className="p-1 bg-primary/10 rounded text-primary">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              {overview.department.name}
            </span>
          </div>
          <CustomSelect
            value={activeContextId || ''}
            onChange={handleContextChange}
            options={academicContexts.map((c) => ({
              value: c.id,
              label: `${c.academicYear} / ${c.semester.replace(' Semester', '')}${c.status === 'CURRENT' ? ' (Current)' : ''}`
            }))}
          />
        </div>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DepartmentDashboard 
                key="dashboard" 
                data={analytics} 
                title={overview.department.name} 
                subtitle={`Head of Department: ${overview.hodName} | Academic Context: ${
                  academicContexts.find(c => c.id === activeContextId)?.academicYear || 'All'
                }`} 
              />
            )}
            {activeTab.startsWith('section-') && activeSection && (
              <SectionTab key={activeTab} section={activeSection} department={overview.department} />
            )}
            {activeTab === 'faculty' && (
              <FacultyTab 
                key="faculty" 
                faculty={faculty}
                allFacultyUsers={allFacultyUsers}
                departmentOfferings={departmentOfferings}
                departmentId={overview.department.id}
              />
            )}
            {activeTab === 'subjects' && (
              <SubjectsTab 
                key="subjects" 
                subjects={subjects} 
                departmentId={overview.department.id}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function SectionTab({ section, department }: { section: { name: string; year: string; sectionEnrollments: { id: string; rollNumber: string; student: { name: string; prn: string } }[] }; department: { code: string } }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-4">
      <div className="bg-card rounded-2xl border border-black/5 shadow-sm px-5 py-3.5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Sec {section.name} <span className="text-muted-foreground font-normal">({section.year})</span>
          </h2>
          <p className="text-[12px] text-muted-foreground">{department.code}</p>
        </div>
        <span className="text-[12px] text-muted-foreground">{section.sectionEnrollments?.length || 0} students</span>
      </div>

      <div className="bg-card rounded-2xl border border-black/5 shadow-sm">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-[13px] font-semibold text-foreground">Enrolled Students</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(220, 14%, 87%)' }}>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Roll No</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">PRN</th>
              </tr>
            </thead>
            <tbody>
              {section.sectionEnrollments?.map((e, idx: number) => (
                <tr key={e.id} className="hover:bg-secondary/30 transition-colors duration-100"
                  style={{ borderBottom: '1px solid hsl(220, 14%, 93%)' }}>
                  <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-[13px] font-medium">{e.student?.name}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{e.rollNumber}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{e.student?.prn}</td>
                </tr>
              ))}
              {(!section.sectionEnrollments || section.sectionEnrollments.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No students enrolled for the selected context.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}

// ---- Faculty Tab & Modals ----

function FacultyTab({ 
  faculty, allFacultyUsers, departmentOfferings, departmentId
}: { 
  faculty: { user: { id: string; name: string; email: string }; assignments: { id: string; courseOffering: { subject: { code: string; name: string }; section: { year: string; name: string } } }[] }[]
  allFacultyUsers: FacultyUser[]
  departmentOfferings: DepartmentOffering[]
  departmentId: string
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [assignUser, setAssignUser] = useState<FacultyUser | null>(null)
  const [assignmentToDelete, setAssignmentToDelete] = useState<{ id: string; name: string } | null>(null)
  const router = useRouter()

  const filtered = faculty.filter(f =>
    f.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const confirmRemoveAssignment = async () => {
    if (!assignmentToDelete) return
    const res = await removeFacultyFromOffering(assignmentToDelete.id)
    if (res.success) {
      toast.success('Assignment removed')
      router.refresh()
    } else {
      toast.error('Failed to remove assignment')
    }
    setAssignmentToDelete(null)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Department Faculty</h2>
          <p className="text-[12px] text-muted-foreground">Manage faculty teaching assignments and enroll new professors.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-card text-foreground hover:bg-black/5 px-3 py-2 rounded text-[13px] font-medium transition-colors duration-200 flex items-center gap-1.5 shadow-xs border border-border"
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            Import Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="gradient-primary px-3.5 py-2 rounded text-[13px] font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Faculty
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search faculty…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full pl-9 pr-3.5 py-2 rounded text-sm"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((f, i) => (
          <motion.div key={f.user.id} custom={i} variants={cardVariants} initial="hidden" animate="visible"
            className="bg-card rounded-2xl border border-black/5 shadow-sm">
            <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                  style={{ backgroundColor: 'hsl(210, 80%, 50%)' }}>
                  {f.user.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate">{f.user.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{f.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setAssignUser(f.user)}
                className="px-2.5 py-1 text-[11px] font-medium border border-border rounded hover:bg-secondary transition-colors flex items-center gap-1"
                title="Assign another course offering"
              >
                <Plus className="w-3 h-3" />
                Assign Course
              </button>
            </div>
            <div className="px-5 py-3">
              {f.assignments.length > 0 ? (
                <div className="space-y-1.5">
                  {f.assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 px-3 rounded text-[12px] group"
                      style={{ backgroundColor: 'hsl(220, 17%, 96%)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{a.courseOffering.subject.code}</span>
                        <span className="text-muted-foreground truncate">— {a.courseOffering.subject.name}</span>
                        <span className="text-muted-foreground/60 hidden sm:inline">
                          · {a.courseOffering.section.year} Sec {a.courseOffering.section.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setAssignmentToDelete({ id: a.id, name: `${a.courseOffering.subject.code} (${a.courseOffering.section.year} Sec ${a.courseOffering.section.name})` })}
                        className="p-1 text-muted-foreground/40 hover:text-rose-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Unassign from offering"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground/60 italic">No teaching assignments in this department.</p>
              )}
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-card rounded-2xl border border-black/5 shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {searchQuery ? 'No faculty found' : 'No faculty assigned to this department'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              {searchQuery
                ? 'Try a different search query.'
                : 'Add a new faculty member, import via Excel, or assign existing professors to this department.'}
            </p>
            {!searchQuery && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-card text-foreground hover:bg-black/5 px-3.5 py-2 rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs border border-border"
                >
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                  Import Excel
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="gradient-primary px-4 py-2 rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Faculty Member
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddFacultyModal 
            allFacultyUsers={allFacultyUsers}
            departmentOfferings={departmentOfferings}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImportModal && (
          <ImportFacultyModal
            departmentId={departmentId}
            departmentOfferings={departmentOfferings}
            onClose={() => setShowImportModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {assignUser && (
          <AssignOfferingModal
            user={assignUser}
            departmentOfferings={departmentOfferings}
            onClose={() => setAssignUser(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!assignmentToDelete}
        title="Remove Faculty Assignment"
        description={`Are you sure you want to unassign faculty from "${assignmentToDelete?.name}"?`}
        confirmText="Remove"
        isDanger={true}
        onConfirm={confirmRemoveAssignment}
        onCancel={() => setAssignmentToDelete(null)}
      />
    </motion.div>
  )
}

function AddFacultyModal({ 
  allFacultyUsers, departmentOfferings, onClose 
}: { 
  allFacultyUsers: FacultyUser[]
  departmentOfferings: DepartmentOffering[]
  onClose: () => void 
}) {
  const [tab, setTab] = useState<'create' | 'assign'>('create')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(allFacultyUsers[0]?.id || '')
  const [selectedOfferingId, setSelectedOfferingId] = useState(departmentOfferings[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) return
    setLoading(true)
    const result = await createAndAssignFaculty({ 
      name, 
      email, 
      courseOfferingId: selectedOfferingId || undefined 
    })
    setLoading(false)
    if ('error' in result && result.error) toast.error(result.error)
    else {
      toast.success(`Faculty ${name} registered successfully`)
      router.refresh()
      onClose()
    }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !selectedOfferingId) return
    setLoading(true)
    const result = await assignFacultyToOffering(selectedUserId, selectedOfferingId)
    setLoading(false)
    if ('error' in result && result.error) toast.error(result.error)
    else {
      toast.success('Faculty assigned to course offering')
      router.refresh()
      onClose()
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl border border-black/5 shadow-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-foreground">Add Department Faculty</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 bg-secondary/50 rounded-lg mb-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`flex-1 py-1.5 rounded text-center transition-all flex items-center justify-center gap-1.5 ${
              tab === 'create' ? 'bg-card text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create New Faculty
          </button>
          <button
            type="button"
            onClick={() => setTab('assign')}
            className={`flex-1 py-1.5 rounded text-center transition-all flex items-center justify-center gap-1.5 ${
              tab === 'assign' ? 'bg-card text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            Assign Existing
          </button>
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Prof. Alan Turing"
                  className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full pl-9 pr-3.5 py-2.5 rounded text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="turing@bvdu.edu.in"
                  className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full pl-9 pr-3.5 py-2.5 rounded text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">Assign Initial Subject & Section (Optional)</label>
              <select
                value={selectedOfferingId}
                onChange={e => setSelectedOfferingId(e.target.value)}
                className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm"
              >
                <option value="">None (Assign later)</option>
                {departmentOfferings.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.subject.code} — {o.subject.name} ({o.section.year} Sec {o.section.name})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-muted-foreground">Default password for new faculty will be <strong className="text-foreground">faculty123</strong>.</p>

            <button
              type="submit"
              disabled={loading}
              className="gradient-primary w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Create & Add Faculty</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">Select Faculty Member</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm"
                required
              >
                {allFacultyUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              {allFacultyUsers.length === 0 && (
                <p className="text-[11px] text-rose-500 mt-1">No faculty registered in college yet. Switch to &quot;Create New Faculty&quot;.</p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">Department Course Offering</label>
              <select
                value={selectedOfferingId}
                onChange={e => setSelectedOfferingId(e.target.value)}
                className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm"
                required
              >
                {departmentOfferings.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.subject.code} — {o.subject.name} ({o.section.year} Sec {o.section.name})
                  </option>
                ))}
              </select>
              {departmentOfferings.length === 0 && (
                <p className="text-[11px] text-rose-500 mt-1">No course offerings found in this department. Add subjects first.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || allFacultyUsers.length === 0 || departmentOfferings.length === 0}
              className="gradient-primary w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Assign Faculty to Offering</>}
            </button>
          </form>
        )}
      </motion.div>
    </ModalBackdrop>
  )
}

function ImportFacultyModal({
  departmentId, departmentOfferings, onClose
}: {
  departmentId: string
  departmentOfferings: DepartmentOffering[]
  onClose: () => void
}) {
  const [previewData, setPreviewData] = useState<{
    totalRows: number
    newFaculty: number
    existingFaculty: number
    invalidRows: number
    parsedData: { name: string; email: string; role: string; password: string; subjectCode?: string }[]
  } | null>(null)
  const [selectedOfferingId, setSelectedOfferingId] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const base64 = (event.target?.result as string).split(',')[1]
        const preview = await previewFacultyImport(base64)
        setPreviewData(preview)
      } catch (err: unknown) {
        toast.error('Import Error: ' + (err as Error).message)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleConfirm = async () => {
    if (!previewData) return
    setLoading(true)
    try {
      await confirmDepartmentFacultyImport(previewData.parsedData, {
        departmentId,
        defaultOfferingId: selectedOfferingId || undefined
      })
      toast.success(`Successfully imported ${previewData.totalRows - previewData.invalidRows} faculty members`)
      router.refresh()
      onClose()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to import faculty')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      { 'Name': 'Prof. Alan Turing', 'Email': 'turing@bvdu.edu.in', 'Subject Code': 'AIML101' },
      { 'Name': 'Prof. Ada Lovelace', 'Email': 'ada@bvdu.edu.in', 'Subject Code': 'AIML102' },
      { 'Name': 'Prof. Claude Shannon', 'Email': 'shannon@bvdu.edu.in', 'Subject Code': 'AIML201' },
    ])
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, 'Faculty')
    xlsx.writeFile(wb, 'faculty_import_template.xlsx')
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl border border-black/5 shadow-2xl p-6 w-full max-w-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-primary/10 text-primary">
              <Upload className="w-4 h-4" />
            </div>
            <h2 className="text-[15px] font-semibold text-foreground">Import Faculty from Excel</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!previewData ? (
          <div className="space-y-4">
            <div className="bg-secondary/40 border border-border p-3.5 rounded-xl text-xs space-y-1.5 text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Required Sheet Columns:</span>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px]"
                >
                  <Download className="w-3 h-3" />
                  Download Template (.xlsx)
                </button>
              </div>
              <p>• <code className="bg-background px-1 py-0.5 rounded text-foreground font-mono">Name</code>: Full name of professor</p>
              <p>• <code className="bg-background px-1 py-0.5 rounded text-foreground font-mono">Email</code>: Institutional email</p>
              <p>• <code className="bg-background px-1 py-0.5 rounded text-foreground font-mono">Subject Code</code> (Optional): E.g. AIML101 to auto-assign</p>
            </div>

            <div
              className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-xl p-8 text-center transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Click to upload spreadsheet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Supports .xlsx, .xls</p>
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                accept=".xlsx, .xls"
                onChange={handleFileChange}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-secondary/40 p-2.5 rounded-xl border border-border">
                <div className="text-lg font-bold text-foreground">{previewData.totalRows}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total</div>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                <div className="text-lg font-bold text-emerald-600">{previewData.newFaculty}</div>
                <div className="text-[10px] text-emerald-600 uppercase font-semibold">New</div>
              </div>
              <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                <div className="text-lg font-bold text-blue-600">{previewData.existingFaculty}</div>
                <div className="text-[10px] text-blue-600 uppercase font-semibold">Existing</div>
              </div>
              <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                <div className="text-lg font-bold text-rose-600">{previewData.invalidRows}</div>
                <div className="text-[10px] text-rose-600 uppercase font-semibold">Invalid</div>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">
                Default Offering Assignment (Optional)
              </label>
              <select
                value={selectedOfferingId}
                onChange={e => setSelectedOfferingId(e.target.value)}
                className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2 rounded text-xs"
              >
                <option value="">Leave Unassigned or Use Sheet&apos;s Subject Code</option>
                {departmentOfferings.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.subject.code} — {o.subject.name} ({o.section.year} Sec {o.section.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-40 overflow-y-auto rounded-xl border border-border text-xs divide-y divide-border">
              {previewData.parsedData.slice(0, 10).map((row, i) => (
                <div key={i} className="p-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">{row.name}</span>
                    <span className="text-muted-foreground ml-2">({row.email})</span>
                  </div>
                  {row.subjectCode && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                      {row.subjectCode}
                    </span>
                  )}
                </div>
              ))}
              {previewData.parsedData.length > 10 && (
                <div className="p-2 text-center text-muted-foreground text-[11px] italic">
                  +{previewData.parsedData.length - 10} more rows
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded hover:bg-secondary transition-colors"
              >
                Choose Another File
              </button>
              <button
                type="button"
                disabled={loading || previewData.totalRows - previewData.invalidRows === 0}
                onClick={handleConfirm}
                className="gradient-primary px-4 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {loading ? <Spinner /> : <><CheckCircle className="w-3.5 h-3.5" /> Confirm Import</>}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </ModalBackdrop>
  )
}

function AssignOfferingModal({
  user, departmentOfferings, onClose
}: {
  user: FacultyUser
  departmentOfferings: DepartmentOffering[]
  onClose: () => void
}) {
  const [selectedOfferingId, setSelectedOfferingId] = useState(departmentOfferings[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOfferingId) return
    setLoading(true)
    const result = await assignFacultyToOffering(user.id, selectedOfferingId)
    setLoading(false)
    if ('error' in result && result.error) toast.error(result.error)
    else {
      toast.success(`Assigned ${user.name} to course`)
      router.refresh()
      onClose()
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl border border-black/5 shadow-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-foreground">Assign Course Offering</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">
          Assigning <strong className="text-foreground">{user.name}</strong> to teach:
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Course Offering</label>
            <select
              value={selectedOfferingId}
              onChange={e => setSelectedOfferingId(e.target.value)}
              className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm"
              required
            >
              {departmentOfferings.map(o => (
                <option key={o.id} value={o.id}>
                  {o.subject.code} — {o.subject.name} ({o.section.year} Sec {o.section.name})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !selectedOfferingId}
            className="gradient-primary w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Confirm Assignment</>}
          </button>
        </form>
      </motion.div>
    </ModalBackdrop>
  )
}

// ---- Subjects Tab & Modal ----

function SubjectsTab({ 
  subjects, departmentId 
}: { 
  subjects: { id: string; name: string; code: string; semester: number; courseOfferings: { id: string; academicContext: { academicYear: string }; section: { year: string; name: string }; assignments: { user: { id: string; name: string } }[] }[] }[]
  departmentId: string
}) {
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8]
  const [addSubjectSem, setAddSubjectSem] = useState<number | null>(null)
  const [subjectToDelete, setSubjectToDelete] = useState<{ id: string; name: string; code: string } | null>(null)
  const router = useRouter()

  const allYears = subjects.flatMap(s => s.courseOfferings.map((o) => o.academicContext.academicYear))
  const latestYear = allYears.length > 0 ? allYears.sort().reverse()[0] : ''

  const semesterGroups: Record<number, typeof subjects> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
  }
  for (const sub of subjects) {
    if (semesterGroups[sub.semester]) semesterGroups[sub.semester].push(sub)
  }

  const confirmDeleteSubject = async () => {
    if (!subjectToDelete) return
    const result = await deleteSubject(subjectToDelete.id)
    if (result.success) {
      toast.success(`Subject ${subjectToDelete.code} deleted`)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete subject')
    }
    setSubjectToDelete(null)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Department Subjects</h2>
          <p className="text-[12px] text-muted-foreground">Curriculum syllabus, subject codes, and section offerings.</p>
        </div>
        <button
          onClick={() => setAddSubjectSem(1)}
          className="gradient-primary px-3.5 py-2 rounded text-[13px] font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Subject
        </button>
      </div>

      <div className="space-y-6">
        {semesters.map(sem => (
          <div key={sem}>
            <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-border/40">
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"
                style={{ borderLeft: '3px solid hsl(142, 70%, 40%)', paddingLeft: '0.5rem' }}>
                Semester {sem}
                <span className="text-[10px] font-normal normal-case px-1.5 py-0.2 bg-secondary rounded text-muted-foreground">
                  {semesterGroups[sem].length} subject{semesterGroups[sem].length !== 1 ? 's' : ''}
                </span>
              </h3>
              <button
                onClick={() => setAddSubjectSem(sem)}
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add to Sem {sem}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {semesterGroups[sem].map((sub, i) => (
                <motion.div key={sub.id} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                  className="bg-card rounded-2xl border border-black/5 shadow-sm p-4 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded flex-shrink-0" style={{ backgroundColor: 'hsl(142 70% 40% / 0.08)' }}>
                          <BookOpen className="w-3.5 h-3.5" style={{ color: 'hsl(142, 70%, 40%)' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold tracking-tight text-foreground truncate">{sub.code}</p>
                          <p className="text-[12px] text-muted-foreground truncate font-medium">{sub.name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSubjectToDelete({ id: sub.id, name: sub.name, code: sub.code })}
                        className="p-1 text-muted-foreground/30 hover:text-rose-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {sub.courseOfferings.length > 0 ? (
                    <div className="space-y-1.5 pt-2 mt-2 border-t border-border">
                      {sub.courseOfferings.filter((o) => !latestYear || o.academicContext.academicYear === latestYear).map((o) => (
                        <div key={o.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-medium">
                            {o.section.year} Sec {o.section.name}
                          </span>
                          <div>
                            {o.assignments.length > 0 ? (
                              o.assignments.map((a) => (
                                <span key={a.user.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  style={{ backgroundColor: 'hsl(142 70% 40% / 0.08)', color: 'hsl(142, 70%, 40%)' }}>
                                  {a.user.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground/50 italic text-[10px]">Unassigned</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-2 mt-2 border-t border-border/50 text-[11px] text-muted-foreground/60 italic">
                      No active offerings
                    </div>
                  )}
                </motion.div>
              ))}
              {semesterGroups[sem].length === 0 && (
                <div className="col-span-full py-6 px-4 rounded-xl border border-dashed border-border/60 text-center">
                  <p className="text-[12px] text-muted-foreground/60 mb-2">No subjects configured for Semester {sem}.</p>
                  <button
                    onClick={() => setAddSubjectSem(sem)}
                    className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    Add Subject to Semester {sem}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {addSubjectSem !== null && (
          <AddSubjectModal
            departmentId={departmentId}
            initialSemester={addSubjectSem}
            onClose={() => setAddSubjectSem(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!subjectToDelete}
        title="Delete Subject"
        description={`Are you sure you want to delete "${subjectToDelete?.code} - ${subjectToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Subject"
        isDanger={true}
        onConfirm={confirmDeleteSubject}
        onCancel={() => setSubjectToDelete(null)}
      />
    </motion.div>
  )
}

function AddSubjectModal({
  departmentId, initialSemester, onClose
}: {
  departmentId: string
  initialSemester: number
  onClose: () => void
}) {
  const [semester, setSemester] = useState(initialSemester || 1)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !name) return
    setLoading(true)
    const result = await createSubject({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      departmentId,
      semester: Number(semester)
    })
    setLoading(false)
    if ('error' in result && result.error) toast.error(result.error)
    else {
      toast.success(`Subject ${code.toUpperCase()} created successfully`)
      router.refresh()
      onClose()
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl border border-black/5 shadow-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-foreground">Add New Subject</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Semester</label>
            <select
              value={semester}
              onChange={e => setSemester(Number(e.target.value))}
              className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Subject Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. AIML103"
              className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm uppercase"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Subject Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Natural Language Processing"
              className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="gradient-primary w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Create Subject</>}
          </button>
        </form>
      </motion.div>
    </ModalBackdrop>
  )
}
