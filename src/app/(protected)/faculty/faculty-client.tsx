'use client'

import { motion } from 'framer-motion'
import { BookOpen, GraduationCap, Layers } from 'lucide-react'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

type Assignment = {
  courseOffering: {
    id: string
    subject: { id: string; name: string; code: string }
    academicContext: { academicYear: string; semester: string }
    section: {
      name: string; year: string
      department: { code: string; name: string }
      _count: { sectionEnrollments: number }
    }
    _count: { assessments: number }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

export function FacultyDashboardClient({ assignments }: { assignments: Assignment[] }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role="FACULTY"
        activeTab="subjects"
        onTabChange={() => {}}
        userName="Faculty"
        userRole="FACULTY"
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header breadcrumbs={[{ label: 'Faculty' }, { label: 'My Subjects' }]} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-6"
          >
            {/* Page header */}
            <div>
              <h1 className="text-lg font-semibold text-foreground">My Subjects</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Manage your assigned subjects, upload marks, and view student data.
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-2xl border border-black/5 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded" style={{ backgroundColor: 'hsl(221 83% 53% / 0.1)' }}>
                    <BookOpen className="w-4 h-4" style={{ color: 'hsl(221, 83%, 53%)' }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground leading-none">{assignments.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Assigned Subjects</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl border border-black/5 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded" style={{ backgroundColor: 'hsl(142 70% 40% / 0.1)' }}>
                    <GraduationCap className="w-4 h-4" style={{ color: 'hsl(142, 70%, 40%)' }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground leading-none">
                      {assignments.reduce((acc, a) => acc + a.courseOffering.section._count.sectionEnrollments, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total Students</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Cards */}
            {assignments.length === 0 ? (
              <div className="bg-card rounded-2xl border border-black/5 shadow-sm p-10 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground/25 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No subjects assigned yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Contact your HOD to get assigned to a subject.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {assignments.map((assignment, i) => {
                  const offering = assignment.courseOffering
                  const hasMarks = offering._count.assessments > 0

                  return (
                    <motion.div key={offering.id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                      <Link
                        href={`/faculty/subjects/${offering.id}`}
                        className="bg-card rounded-2xl border border-black/5 shadow-sm p-4 block group relative overflow-hidden transition-shadow duration-200 hover:shadow-md"
                      >
                        {/* Status chip */}
                        <div
                          className="absolute top-0 right-0 px-2.5 py-1 text-[10px] font-semibold rounded-bl-md"
                          style={hasMarks
                            ? { backgroundColor: 'hsl(142 70% 40% / 0.08)', color: 'hsl(142, 70%, 40%)' }
                            : { backgroundColor: 'hsl(38 92% 44% / 0.08)', color: 'hsl(38, 92%, 44%)' }
                          }
                        >
                          {hasMarks ? 'Marks Uploaded' : 'Pending'}
                        </div>

                        <div className="flex items-start gap-3 mb-3 mt-0.5">
                          <div className="p-2 rounded flex-shrink-0" style={{ backgroundColor: 'hsl(221 83% 53% / 0.08)' }}>
                            <BookOpen className="w-4 h-4" style={{ color: 'hsl(221, 83%, 53%)' }} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors duration-150 leading-snug truncate">
                              {offering.subject.name}
                            </h3>
                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: 'hsl(220, 17%, 91%)', color: 'hsl(220, 12%, 50%)' }}>
                              {offering.subject.code}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-[12px] text-muted-foreground pl-0.5">
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-3 h-3 flex-shrink-0 opacity-70" />
                            <span className="truncate">
                              {offering.section.department.code} · {offering.section.year} · Sec {offering.section.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-3 h-3 flex-shrink-0 opacity-70" />
                            <span>{offering.section._count.sectionEnrollments} students</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground/60">
                            {offering.academicContext.academicYear} · {offering.academicContext.semester}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
