import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { AdminDepartmentClient } from './department-client'

export default async function AdminDepartmentPage(props: { 
  params: Promise<{ departmentId: string }>,
  searchParams: Promise<{ context?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    redirect('/login')
  }

  const params = await props.params
  const searchParams = await props.searchParams
  const departmentId = params.departmentId
  const contextId = searchParams.context || null

  const department = await db.department.findUnique({
    where: { id: departmentId },
    include: { hod: { select: { name: true, email: true } } }
  })

  if (!department) notFound()

  // Academic Contexts for the dropdown
  const academicContexts = await db.academicContext.findMany({
    orderBy: { academicYear: 'desc' }
  })
  
  const activeContext = contextId 
    ? academicContexts.find(c => c.id === contextId) 
    : academicContexts[0]

  // Stats
  const [subjectCount, sectionCount, studentCount, facultyAssignments] = await Promise.all([
    db.subject.count({ where: { departmentId } }),
    db.section.count({ where: { departmentId } }),
    db.student.count({ where: { departmentId } }),
    db.facultyAssignment.findMany({
      where: { courseOffering: { section: { departmentId } } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  const overview = {
    department: { id: department.id, name: department.name, code: department.code },
    hodName: department.hod ? department.hod.name : 'Not assigned',
    stats: {
      subjectCount,
      sectionCount,
      studentCount,
      facultyCount: facultyAssignments.length,
    }
  }

  // Sections (Grouped by Year)
  const sectionsData = await db.section.findMany({
    where: { departmentId },
    include: {
      sectionEnrollments: {
        where: activeContext ? { academicContextId: activeContext.id } : undefined,
        include: {
          student: { select: { id: true, name: true, prn: true } },
          academicContext: { select: { academicYear: true, semester: true } }
        }
      },
      courseOfferings: {
        where: activeContext ? { academicContextId: activeContext.id } : undefined,
        include: {
          subject: { select: { id: true, name: true, code: true } },
          academicContext: { select: { academicYear: true, semester: true } },
          assignments: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        }
      },
    },
    orderBy: [{ year: 'asc' }, { name: 'asc' }],
  })

  const sections: Record<string, any[]> = {}
  for (const sec of sectionsData) {
    if (!sections[sec.year]) sections[sec.year] = []
    sections[sec.year].push(sec)
  }

  // Faculty
  const allAssignments = await db.facultyAssignment.findMany({
    where: { courseOffering: { section: { departmentId } } },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      courseOffering: {
        include: {
          subject: { select: { name: true, code: true } },
          section: { select: { name: true, year: true } },
          academicContext: { select: { academicYear: true, semester: true } },
        }
      }
    }
  })

  const facultyMap: Record<string, any> = {}
  for (const a of allAssignments) {
    if (!facultyMap[a.userId]) {
      facultyMap[a.userId] = { user: a.user, assignments: [] }
    }
    facultyMap[a.userId].assignments.push(a)
  }
  const faculty = Object.values(facultyMap)

  // Subjects
  const subjects = await db.subject.findMany({
    where: { departmentId },
    include: {
      courseOfferings: {
        where: activeContext ? { academicContextId: activeContext.id } : undefined,
        include: {
          section: { select: { id: true, name: true, year: true } },
          academicContext: { select: { academicYear: true, semester: true } },
          assignments: {
            include: { user: { select: { id: true, name: true, email: true } } }
          },
        }
      }
    },
    orderBy: { code: 'asc' },
  })

  return (
    <AdminDepartmentClient 
      overview={overview} 
      sections={sections} 
      faculty={faculty} 
      subjects={subjects} 
      academicContexts={academicContexts}
      activeContextId={activeContext?.id || null}
    />
  )
}
