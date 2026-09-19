'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, BookOpen, User, Plus, Trash2, Check, LayoutDashboard, Edit3, Mail, Building2, ExternalLink, ArrowRight, Save, X, Settings2, Trash, Upload, ChevronDown, GraduationCap, Search
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { DepartmentDashboard } from '@/components/features/analytics/department-dashboard'
import { CustomSelect } from '@/components/ui/custom-select'
import { AnalyticsData } from '@/app/actions/analytics'

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

export function AdminDepartmentClient({
  overview, sections, faculty, subjects, academicContexts, activeContextId, analytics
}: {
  overview: any
  sections: Record<string, any[]>
  faculty: any[]
  subjects: any[]
  academicContexts: any[]
  activeContextId: string | null
  analytics: AnalyticsData
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
    return sections[yearKey]?.map(sec => ({
      key: `section-${sec.id}`,
      label: `Sec ${sec.name}`,
      onClick: () => setActiveTab(`section-${sec.id}`)
    })) || []
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
  ]

  let breadcrumbLabel = 'Dashboard'
  let activeSection = null
  if (activeTab.startsWith('section-')) {
    const secId = activeTab.replace('section-', '')
    for (const year of Object.values(sections)) {
      const found = year.find((s: any) => s.id === secId)
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
        <Header breadcrumbs={[
          { label: 'Departments', href: '/admin' },
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
                subtitle={`Head of Department: ${overview.hodName} | Academic Context: ${
                  academicContexts.find(c => c.id === activeContextId)?.academicYear || 'All'
                }`} 
              />
            )}
            {activeTab.startsWith('section-') && activeSection && (
              <SectionTab key={activeTab} section={activeSection} department={overview.department} />
            )}
            {activeTab === 'faculty' && <FacultyTab key="faculty" faculty={faculty} />}
            {activeTab === 'subjects' && <SubjectsTab key="subjects" subjects={subjects} />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

// Component DashboardTab was replaced by DepartmentDashboard

function SectionTab({ section, department }: { section: any; department: any }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-4">
      <div className="glass-card rounded-md px-5 py-3.5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Sec {section.name} <span className="text-muted-foreground font-normal">({section.year})</span>
          </h2>
          <p className="text-[12px] text-muted-foreground">{department.code}</p>
        </div>
        <span className="text-[12px] text-muted-foreground">{section.sectionEnrollments?.length || 0} students</span>
      </div>

      <div className="glass-card rounded-md">
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
              {section.sectionEnrollments?.map((e: any, idx: number) => (
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

function FacultyTab({ faculty }: { faculty: any[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const filtered = faculty.filter(f =>
    f.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Department Faculty</h2>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search faculty…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="glass-input w-full pl-9 pr-3.5 py-2 rounded text-sm"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((f, i) => (
          <motion.div key={f.user.id} custom={i} variants={cardVariants} initial="hidden" animate="visible"
            className="glass-card rounded-md">
            <div className="px-5 py-3.5 flex items-center gap-3 border-b border-border">
              <div className="w-8 h-8 rounded flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                style={{ backgroundColor: 'hsl(210, 80%, 50%)' }}>
                {f.user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold truncate">{f.user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{f.user.email}</p>
              </div>
            </div>
            <div className="px-5 py-3">
              {f.assignments.length > 0 ? (
                <div className="space-y-1.5">
                  {f.assignments.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 py-1.5 px-3 rounded text-[12px]"
                      style={{ backgroundColor: 'hsl(220, 17%, 96%)' }}>
                      <BookOpen className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{a.courseOffering.subject.code}</span>
                      <span className="text-muted-foreground truncate">— {a.courseOffering.subject.name}</span>
                      <span className="text-muted-foreground/60 hidden sm:inline">
                        · {a.courseOffering.section.year} Sec {a.courseOffering.section.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground/60 italic">No teaching assignments.</p>
              )}
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">
            {searchQuery ? 'No faculty matching search.' : 'No faculty assigned to this department.'}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function SubjectsTab({ subjects }: { subjects: any[] }) {
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8]
  const allYears = subjects.flatMap(s => s.courseOfferings.map((o: any) => o.academicContext.academicYear))
  const latestYear = allYears.length > 0 ? allYears.sort().reverse()[0] : ''

  const semesterGroups: Record<number, typeof subjects> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
  }
  for (const sub of subjects) {
    if (semesterGroups[sub.semester]) semesterGroups[sub.semester].push(sub)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-5">
      <h2 className="text-base font-semibold text-foreground">Department Subjects</h2>
      <div className="space-y-5">
        {semesters.map(sem => (
          <div key={sem}>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2"
              style={{ borderLeft: '2px solid hsl(142, 70%, 40%)', paddingLeft: '0.5rem' }}>
              Semester {sem}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {semesterGroups[sem].map((sub, i) => (
                <motion.div key={sub.id} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                  className="glass-card rounded-md p-3.5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 rounded flex-shrink-0" style={{ backgroundColor: 'hsl(142 70% 40% / 0.08)' }}>
                      <BookOpen className="w-3.5 h-3.5" style={{ color: 'hsl(142, 70%, 40%)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold truncate">{sub.code} — {sub.name}</p>
                      <p className="text-[11px] text-muted-foreground">{sub.courseOfferings.filter((o: any) => o.academicContext.academicYear === latestYear).length} offering{sub.courseOfferings.filter((o: any) => o.academicContext.academicYear === latestYear).length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {sub.courseOfferings.filter((o: any) => o.academicContext.academicYear === latestYear).length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      {sub.courseOfferings.filter((o: any) => o.academicContext.academicYear === latestYear).map((o: any) => (
                        <div key={o.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-medium">
                            {o.section.year} Sec {o.section.name}
                          </span>
                          <div>
                            {o.assignments.length > 0 ? (
                              o.assignments.map((a: any) => (
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
                  )}
                </motion.div>
              ))}
              {semesterGroups[sem].length === 0 && (
                <p className="text-[11px] text-muted-foreground/40 col-span-3">No subjects for Semester {sem}.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
