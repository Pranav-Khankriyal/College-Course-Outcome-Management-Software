'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, BookOpen, GraduationCap, Search, X,
  User, Plus, Trash2, Check, LayoutDashboard, Edit3, Mail, Building2, ChevronDown
} from 'lucide-react'
import { hodRemoveFaculty, hodCreateSubject, hodDeleteSubject, hodUpdateSubject, hodCreateFaculty } from '@/app/actions/hod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import Link from 'next/link'
import { DepartmentDashboard } from '@/components/features/analytics/department-dashboard'
import { CustomSelect } from '@/components/ui/custom-select'
import { AnalyticsData } from '@/app/actions/analytics'

// ---- Types ----

type Overview = {
  department: { id: string; name: string; code: string }
  stats: { subjectCount: number; sectionCount: number; studentCount: number; facultyCount: number }
  yearGroups: Record<string, { sections: any[]; studentCount: number; subjectCount: number }>
}

type SectionsGrouped = Record<string, any[]>

type FacultyItem = {
  user: { id: string; name: string; email: string; role: string; isActive: boolean }
  assignments: {
    id: string
    courseOffering: {
      subject: { name: string; code: string }
      section: { name: string; year: string }
      academicContext: { academicYear: string; semester: string }
    }
  }[]
}

type SubjectItem = {
  id: string; name: string; code: string; semester: number
  courseOfferings: {
    id: string
    section: { id: string; name: string; year: string }
    academicContext: { academicYear: string; semester: string }
    assignments: { user: { id: string; name: string; email: string } }[]
  }[]
}

type OwnSubject = {
  courseOffering: {
    id: string
    subject: { id: string; name: string; code: string }
    academicContext: { academicYear: string; semester: string }
    section: {
      name: string; year: string
      department: { code: string }
      _count: { sectionEnrollments: number }
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

// ---- Shared UI Atoms ----

function Spinner() {
  return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-80" />
}

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
      style={isActive
        ? { backgroundColor: 'hsl(142 70% 40% / 0.1)', color: 'hsl(142, 70%, 40%)' }
        : { backgroundColor: 'hsl(0 72% 51% / 0.08)', color: 'hsl(0, 72%, 51%)' }
      }
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

// ---- Main Component ----

export function HodDashboardClient({
  overview, sections, faculty, subjects, ownSubjects, analytics, hodName, academicContexts, activeContextId
}: {
  overview: Overview
  sections: SectionsGrouped
  faculty: FacultyItem[]
  subjects: SubjectItem[]
  ownSubjects: OwnSubject[]
  analytics: AnalyticsData
  hodName: string
  academicContexts: any[]
  activeContextId: string | null
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
    { key: 'my-subjects', label: 'My Subjects', icon: <GraduationCap className="w-[15px] h-[15px]" />, onClick: () => setActiveTab('my-subjects') },
  ]

  let breadcrumbLabel = 'Dashboard'
  let activeSection = null
  if (activeTab.startsWith('section-')) {
    const secId = activeTab.replace('section-', '')
    for (const year of Object.values(sections)) {
      const found = year.find(s => s.id === secId)
      if (found) {
        activeSection = found
        breadcrumbLabel = `Sec ${found.name} (${found.year})`
        break
      }
    }
  } else if (activeTab === 'faculty') breadcrumbLabel = 'Faculty'
  else if (activeTab === 'subjects') breadcrumbLabel = 'Subjects'
  else if (activeTab === 'my-subjects') breadcrumbLabel = 'My Subjects'

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role="HOD"
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab)}
        userName={overview.department.code + ' HOD'}
        userRole="HOD"
        customItems={customNavItems}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header breadcrumbs={[
          { label: overview.department.code },
          { label: breadcrumbLabel },
        ]} />

        {/* Context selector bar */}
        <div className="bg-card border-b border-black/5 px-5 py-1.5 flex items-center justify-between sticky top-11 z-40">
          <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5 tracking-tight">
            <div className="p-1 bg-primary/10 rounded text-primary">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            {overview.department.name}
          </span>
          <CustomSelect
            value={activeContextId || ''}
            onChange={handleContextChange}
            options={academicContexts.map((c: any) => ({
              value: c.id,
              label: `${c.academicYear} / ${c.semester.replace(' Semester', '')}`
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
                subtitle={`Head of Department: ${hodName} | Academic Context: ${
                  academicContexts.find(c => c.id === activeContextId)?.academicYear || 'All'
                }`} 
              />
            )}
            {activeTab.startsWith('section-') && activeSection && (
              <SectionTab key={activeTab} section={activeSection} department={overview.department} />
            )}
            {activeTab === 'faculty' && <FacultyTab key="faculty" faculty={faculty} />}
            {activeTab === 'subjects' && <SubjectsTab key="subjects" subjects={subjects} />}
            {activeTab === 'my-subjects' && <MySubjectsTab key="my-subjects" ownSubjects={ownSubjects} />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

// Component DashboardTab was replaced by DepartmentDashboard

// ---- Section Tab ----

function SectionTab({ section, department }: { section: any; department: { code: string; [key: string]: any } }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-4">
      <div className="bg-card rounded-2xl border border-black/5 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground" style={{ letterSpacing: '-0.015em' }}>
            Sec {section.name} <span className="text-muted-foreground font-normal">({section.year})</span>
          </h2>
          <p className="text-[12px] text-muted-foreground">{department.code}</p>
        </div>
        <span className="text-[12px] text-muted-foreground">{section.sectionEnrollments?.length || 0} students enrolled</span>
      </div>

      <div className="bg-card rounded-2xl border border-black/5 shadow-sm">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-[13px] font-semibold text-foreground">Students Enrolled</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(220, 14%, 87%)' }}>
                {['#', 'Name', 'Roll No', 'PRN', 'UT 1', 'UT 2', 'UT 3', 'Aggregate'].map((col, i) => (
                  <th key={col} className={`px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${
                    i < 4 ? 'text-left' : 'text-center'
                  }`}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.sectionEnrollments?.map((e: any, idx: number) => (
                <tr key={e.id} className="hover:bg-secondary/30 transition-colors duration-100"
                  style={{ borderBottom: '1px solid hsl(220, 14%, 93%)' }}>
                  <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-[13px] font-medium">{e.student?.name}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{e.rollNumber}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{e.student?.prn}</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground/40 text-xs">—</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground/40 text-xs">—</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground/40 text-xs">—</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground/40 text-xs">—</td>
                </tr>
              ))}
              {(!section.sectionEnrollments || section.sectionEnrollments.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No students enrolled in this section.
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

// ---- Faculty Tab ----

function FacultyTab({ faculty }: { faculty: FacultyItem[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null)
  const router = useRouter()

  const filtered = faculty.filter(f =>
    f.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const confirmRemoveAssignment = async () => {
    if (!assignmentToDelete) return
    const result = await hodRemoveFaculty(assignmentToDelete)
    if (result.success) {
      toast.success('Faculty assignment removed')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed')
    }
    setAssignmentToDelete(null)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Department Faculty</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="gradient-primary px-3.5 py-2 rounded text-[13px] font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Faculty
        </button>
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
            <div className="px-5 py-3.5 flex items-center gap-3 border-b border-border">
              <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: 'hsl(210, 80%, 50%)' }}>
                {f.user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold truncate">{f.user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{f.user.email}</p>
              </div>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded flex-shrink-0 ${
                f.user.role === 'HOD'
                  ? 'bg-blue-500/10 text-blue-600'
                  : 'bg-emerald-500/10 text-emerald-600'
              }`}>{f.user.role}</span>
            </div>
            <div className="px-5 py-3">
              {f.assignments.length > 0 ? (
                <div className="space-y-1.5">
                  {f.assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-1.5 px-3 rounded group"
                      style={{ backgroundColor: 'hsl(220, 17%, 96%)' }}>
                      <div className="flex items-center gap-2 text-[12px] min-w-0">
                        <BookOpen className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{a.courseOffering.subject.code}</span>
                        <span className="text-muted-foreground truncate">— {a.courseOffering.subject.name}</span>
                        <span className="text-muted-foreground/60 hidden sm:inline truncate">
                          · {a.courseOffering.section.year} Sec {a.courseOffering.section.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setAssignmentToDelete(a.id)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        style={{ color: 'hsl(0, 72%, 51%)' }}
                        title="Remove assignment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground/60 italic">No teaching assignments yet.</p>
              )}
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {searchQuery ? 'No faculty matching your search.' : 'No faculty assigned to this department yet.'}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && <HodAddFacultyModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={!!assignmentToDelete}
        title="Remove Assignment"
        description="Are you sure you want to remove this faculty assignment?"
        isDanger={true}
        confirmText="Remove"
        onConfirm={confirmRemoveAssignment}
        onCancel={() => setAssignmentToDelete(null)}
      />
    </motion.div>
  )
}

// ---- Subjects Tab ----

function SubjectsTab({ subjects }: { subjects: SubjectItem[] }) {
  const [addSubjectSem, setAddSubjectSem] = useState<number | null>(null)
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null)
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null)
  const router = useRouter()

  const allYears = subjects.flatMap(s => s.courseOfferings.map(o => o.academicContext.academicYear))
  const latestYear = allYears.length > 0 ? allYears.sort().reverse()[0] : ''

  const semesterGroups: Record<number, typeof subjects> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] }
  for (const sub of subjects) {
    if (semesterGroups[sub.semester]) semesterGroups[sub.semester].push(sub)
  }

  const confirmDelete = async () => {
    if (!subjectToDelete) return
    const result = await hodDeleteSubject(subjectToDelete)
    if (result.success) { toast.success('Subject deleted'); router.refresh() }
    else toast.error(result.error || 'Failed')
    setSubjectToDelete(null)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-5">
      <h2 className="text-base font-semibold text-foreground">Department Subjects</h2>

      <div className="space-y-5">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
          <div key={sem}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                style={{ borderLeft: '2px solid hsl(142, 70%, 40%)', paddingLeft: '0.5rem' }}>
                Semester {sem}
              </h3>
              <button
                onClick={() => setAddSubjectSem(sem)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded transition-colors duration-150"
                style={{ backgroundColor: 'hsl(142 70% 40% / 0.08)', color: 'hsl(142, 70%, 40%)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(142 70% 40% / 0.14)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(142 70% 40% / 0.08)'}
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {semesterGroups[sem].map((sub, i) => (
                <motion.div key={sub.id} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                  className="bg-card rounded-2xl border border-black/5 shadow-sm">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold truncate">{sub.code} — {sub.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {sub.courseOfferings.filter(o => o.academicContext.academicYear === latestYear).length} offering{sub.courseOfferings.filter(o => o.academicContext.academicYear === latestYear).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button onClick={() => setEditingSubject(sub)}
                        className="p-1.5 rounded transition-colors duration-150 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        title="Edit">
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button onClick={() => setSubjectToDelete(sub.id)}
                        className="p-1.5 rounded transition-colors duration-150 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Delete">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {sub.courseOfferings.filter(o => o.academicContext.academicYear === latestYear).length > 0 && (
                    <div className="border-t border-border px-4 py-2.5 space-y-1.5">
                      {sub.courseOfferings.filter(o => o.academicContext.academicYear === latestYear).map(o => (
                        <div key={o.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-medium">
                            {o.section.year} Sec {o.section.name}
                          </span>
                          <div>
                            {o.assignments.length > 0 ? (
                              o.assignments.map(a => (
                                <span key={a.user.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  style={{ backgroundColor: 'hsl(142 70% 40% / 0.08)', color: 'hsl(142, 70%, 40%)' }}>
                                  {a.user.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground/50 italic">Unassigned</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
        {subjects.length === 0 && (
          <p className="text-center py-10 text-sm text-muted-foreground">No subjects in this department yet.</p>
        )}
      </div>

      <AnimatePresence>
        {addSubjectSem !== null && <HodAddSubjectModal semester={addSubjectSem} onClose={() => setAddSubjectSem(null)} />}
        {editingSubject && <HodEditSubjectModal subject={editingSubject} onClose={() => setEditingSubject(null)} />}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={!!subjectToDelete}
        title="Delete Subject"
        description="Are you sure you want to delete this subject? This action cannot be undone."
        isDanger={true}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setSubjectToDelete(null)}
      />
    </motion.div>
  )
}

// ---- My Subjects Tab ----

function MySubjectsTab({ ownSubjects }: { ownSubjects: OwnSubject[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">My Teaching Subjects</h2>
      {ownSubjects.length === 0 ? (
        <div className="bg-card rounded-2xl border border-black/5 shadow-sm p-10 text-center">
          <GraduationCap className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">You are not assigned as faculty to any subject.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ownSubjects.map((item, i) => {
            const offering = item.courseOffering
            return (
              <motion.div key={offering.id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                <Link
                  href={`/hod/subjects/${offering.id}`}
                  className="bg-card rounded-2xl border border-black/5 shadow-sm p-4 block group transition-shadow duration-150 hover:shadow-md"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-1.5 rounded" style={{ backgroundColor: 'hsl(262 80% 55% / 0.1)' }}>
                      <BookOpen className="w-4 h-4" style={{ color: 'hsl(262, 80%, 55%)' }} />
                    </div>
                    <h3 className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors duration-150 truncate">
                      {offering.subject.name}
                    </h3>
                  </div>
                  <div className="space-y-1 text-[12px] text-muted-foreground">
                    <p>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mr-2"
                        style={{ backgroundColor: 'hsl(221 83% 53% / 0.08)', color: 'hsl(221, 83%, 53%)' }}>
                        {offering.subject.code}
                      </span>
                    </p>
                    <p>{offering.section.department.code} · {offering.section.year} · Sec {offering.section.name}</p>
                    <p>{offering.academicContext.academicYear} · {offering.academicContext.semester}</p>
                    <p className="text-[11px] text-muted-foreground/60">{offering.section._count.sectionEnrollments} students enrolled</p>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// ---- Modals ----

function HodAddFacultyModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await hodCreateFaculty({ name, email })
    setLoading(false)
    if (result.error) toast.error(result.error)
    else { toast.success('Faculty added successfully'); router.refresh(); onClose() }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl border border-black/5 shadow-md p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">Add Faculty</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Full name" className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full pl-9 pr-3.5 py-2.5 rounded text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="faculty@bvdu.edu.in" className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full pl-9 pr-3.5 py-2.5 rounded text-sm" required />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Default password: <strong className="text-foreground">faculty123</strong></p>
          <button type="submit" disabled={loading}
            className="gradient-primary w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2">
            {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Add Faculty</>}
          </button>
        </form>
      </motion.div>
    </ModalBackdrop>
  )
}

function HodAddSubjectModal({ semester, onClose }: { semester: number; onClose: () => void }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await hodCreateSubject({ name, code, semester } as any)
    setLoading(false)
    if (result.error) toast.error(result.error)
    else { toast.success('Subject created'); router.refresh(); onClose() }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl border border-black/5 shadow-md p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">Add Subject — Semester {semester}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Subject Code</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)}
              placeholder="e.g. CSBS301" className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm" required />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Subject Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Operating Systems" className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm" required />
          </div>
          <button type="submit" disabled={loading}
            className="gradient-primary w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2">
            {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Create Subject</>}
          </button>
        </form>
      </motion.div>
    </ModalBackdrop>
  )
}

function HodEditSubjectModal({ subject, onClose }: { subject: SubjectItem; onClose: () => void }) {
  const [name, setName] = useState(subject.name)
  const [code, setCode] = useState(subject.code)
  const [semester, setSemester] = useState(subject.semester || 1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await hodUpdateSubject(subject.id, { name, code, semester } as any)
    setLoading(false)
    if (result.error) toast.error(result.error)
    else { toast.success('Subject updated'); router.refresh(); onClose() }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl border border-black/5 shadow-md p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">Edit Subject</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Subject Code</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)}
              className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm" required />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Subject Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm" required />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Semester</label>
            <input type="number" min="1" max="8" value={semester} onChange={e => setSemester(parseInt(e.target.value) || 1)}
              className="bg-card border border-black/5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 w-full px-3.5 py-2.5 rounded text-sm" required />
          </div>
          <button type="submit" disabled={loading}
            className="gradient-primary w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2">
            {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Save Changes</>}
          </button>
        </form>
      </motion.div>
    </ModalBackdrop>
  )
}
