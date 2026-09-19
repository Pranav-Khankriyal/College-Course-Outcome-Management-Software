'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

// ---- Stats ----

export async function getAdminStats() {
  await requireAdmin()

  const [departmentCount, userCount, subjectCount, sectionCount, facultyCount, hodCount, studentCount] =
    await Promise.all([
      db.department.count(),
      db.user.count(),
      db.subject.count(),
      db.section.count(),
      db.user.count({ where: { role: 'FACULTY' } }),
      db.user.count({ where: { role: 'HOD' } }),
      db.student.count(),
    ])

  return { departmentCount, userCount, subjectCount, sectionCount, facultyCount, hodCount, studentCount }
}

// ---- Departments ----

export async function getDepartmentsWithDetails() {
  await requireAdmin()

  const departments = await db.department.findMany({
    include: {
      hod: { select: { id: true, name: true, email: true } },
      sections: {
        select: { id: true, name: true, year: true },
        orderBy: [{ year: 'asc' }, { name: 'asc' }],
      },
      subjects: {
        select: { id: true, name: true, code: true, semester: true },
        orderBy: { code: 'asc' },
      },
      _count: {
        select: { sections: true, subjects: true, students: true },
      },
    },
    orderBy: { code: 'asc' },
  })

  return departments
}

export async function getDepartmentSectionsGrouped(departmentId: string) {
  await requireAdmin()

  const sections = await db.section.findMany({
    where: { departmentId },
    include: {
      _count: { select: { sectionEnrollments: true, courseOfferings: true } },
      courseOfferings: {
        include: {
          subject: true,
          assignments: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        }
      }
    },
    orderBy: [{ year: 'asc' }, { name: 'asc' }],
  })

  // Group by year
  const grouped: Record<string, typeof sections> = {}
  for (const sec of sections) {
    if (!grouped[sec.year]) grouped[sec.year] = []
    grouped[sec.year].push(sec)
  }

  return grouped
}

// ---- Users ----

export async function getAllUsers() {
  await requireAdmin()

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      departments: { select: { id: true, name: true, code: true } },
      facultyAssignments: {
        select: {
          courseOffering: {
            select: {
              subject: { select: { name: true, code: true } },
              section: { select: { name: true, year: true, department: { select: { code: true } } } }
            }
          }
        }
      }
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return users
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'HOD' | 'FACULTY'
}) {
  await requireAdmin()

  const existing = await db.user.findUnique({ where: { email: data.email } })
  if (existing) {
    return { error: 'A user with this email already exists' }
  }

  const hashedPassword = await bcrypt.hash(data.password, 12)

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      hashedPassword,
      role: data.role,
      isActive: true,
    },
  })

  revalidatePath('/admin')
  return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
}

export async function updateUser(
  userId: string,
  data: { name?: string; email?: string; role?: 'ADMIN' | 'HOD' | 'FACULTY' }
) {
  await requireAdmin()

  if (data.email) {
    const existing = await db.user.findFirst({
      where: { email: data.email, id: { not: userId } },
    })
    if (existing) {
      return { error: 'A user with this email already exists' }
    }
  }

  await db.user.update({
    where: { id: userId },
    data,
  })

  revalidatePath('/admin')
  return { success: true }
}

export async function toggleUserActive(userId: string) {
  await requireAdmin()

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'User not found' }

  await db.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  })

  revalidatePath('/admin')
  return { success: true, isActive: !user.isActive }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireAdmin()

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await db.user.update({
    where: { id: userId },
    data: { hashedPassword },
  })

  revalidatePath('/admin')
  return { success: true }
}

export async function assignHod(departmentId: string, userId: string | null) {
  await requireAdmin()

  await db.department.update({
    where: { id: departmentId },
    data: { hodId: userId },
  })

  revalidatePath('/admin')
  return { success: true }
}

// ---- Subjects Management ----

export async function getSubjectsByDepartment(departmentId: string) {
  await requireAdmin()

  const subjects = await db.subject.findMany({
    where: { departmentId },
    include: {
      courseOfferings: {
        include: {
          section: { select: { id: true, name: true, year: true } },
          academicContext: { select: { academicYear: true, semester: true } },
          assignments: {
            include: { user: { select: { id: true, name: true, email: true } } }
          },
          _count: { select: { outcomes: true, assessments: true } }
        }
      }
    },
    orderBy: { code: 'asc' },
  })

  return subjects
}

export async function createSubject(data: {
  name: string
  code: string
  departmentId: string
  semester: number
}) {
  await requireAdmin()

  const existing = await db.subject.findFirst({
    where: { code: data.code, departmentId: data.departmentId }
  })
  if (existing) return { error: 'A subject with this code already exists in this department' }

  const subject = await db.subject.create({ data })

  revalidatePath('/admin')
  return { success: true, subject }
}

export async function updateSubject(subjectId: string, data: { name?: string; code?: string }) {
  await requireAdmin()

  await db.subject.update({ where: { id: subjectId }, data })

  revalidatePath('/admin')
  return { success: true }
}

export async function deleteSubject(subjectId: string) {
  await requireAdmin()

  // Check for existing course offerings
  const offerings = await db.courseOffering.count({ where: { subjectId } })
  if (offerings > 0) {
    return { error: 'Cannot delete subject with existing course offerings. Remove offerings first.' }
  }

  await db.subject.delete({ where: { id: subjectId } })

  revalidatePath('/admin')
  return { success: true }
}

// ---- Faculty Assignment ----

export async function assignFacultyToOffering(userId: string, courseOfferingId: string) {
  await requireAdmin()

  const existing = await db.facultyAssignment.findFirst({
    where: { userId, courseOfferingId }
  })
  if (existing) return { error: 'Faculty is already assigned to this offering' }

  await db.facultyAssignment.create({
    data: { userId, courseOfferingId }
  })

  revalidatePath('/admin')
  return { success: true }
}

export async function removeFacultyFromOffering(assignmentId: string) {
  await requireAdmin()

  await db.facultyAssignment.delete({ where: { id: assignmentId } })

  revalidatePath('/admin')
  return { success: true }
}

// ---- Marks (Read-only for Admin) ----

export async function getMarksOverview(courseOfferingId: string) {
  await requireAdmin()

  const marks = await db.studentMark.findMany({
    where: {
      assessmentQuestion: {
        assessment: { courseOfferingId }
      }
    },
    include: {
      student: { select: { id: true, name: true, prn: true } },
      assessmentQuestion: {
        select: {
          questionNumber: true,
          maxMarks: true,
          courseOutcome: { select: { code: true } },
          assessment: { select: { name: true } }
        }
      }
    }
  })

  return marks
}

// ---- Admin Pool ----

export async function promoteToAdmin(userId: string) {
  await requireAdmin()

  await db.user.update({
    where: { id: userId },
    data: { role: 'ADMIN' },
  })

  revalidatePath('/admin')
  return { success: true }
}

export async function demoteFromAdmin(userId: string) {
  await requireAdmin()

  // Don't let the last admin demote themselves
  const adminCount = await db.user.count({ where: { role: 'ADMIN' } })
  if (adminCount <= 1) {
    return { error: 'Cannot remove the last admin' }
  }

  await db.user.update({
    where: { id: userId },
    data: { role: 'FACULTY' },
  })

  revalidatePath('/admin')
  return { success: true }
}

// ---- Create Course Offering ----

export async function createCourseOffering(data: {
  subjectId: string
  sectionId: string
  academicContextId: string
}) {
  await requireAdmin()

  const existing = await db.courseOffering.findFirst({
    where: {
      subjectId: data.subjectId,
      sectionId: data.sectionId,
      academicContextId: data.academicContextId,
    }
  })
  if (existing) return { error: 'This course offering already exists' }

  await db.courseOffering.create({ data })

  revalidatePath('/admin')
  return { success: true }
}

// ---- Create Section ----

export async function createSection(data: {
  name: string
  year: string
  departmentId: string
}) {
  await requireAdmin()

  await db.section.create({ data })

  revalidatePath('/admin')
  return { success: true }
}

// ---- Get Academic Contexts ----

export async function getAcademicContexts() {
  await requireAdmin()

  return db.academicContext.findMany({ orderBy: { academicYear: 'desc' } })
}

// ---- Department Semester Details ----

export async function getDepartmentSemesterDetails(departmentId: string, semester: number) {
  await requireAdmin()
  
  const getYearForSem = (sem: number) => {
    if (sem === 1 || sem === 2) return 'FY'
    if (sem === 3 || sem === 4) return 'SY'
    if (sem === 5 || sem === 6) return 'TY'
    return 'Final Year'
  }

  const targetYear = getYearForSem(semester)

  const sections = await db.section.findMany({
    where: { departmentId, year: targetYear },
    include: {
      sectionEnrollments: {
        include: {
          student: { select: { id: true, name: true, prn: true } }
        }
      },
      courseOfferings: {
        where: {
          subject: { semester }
        },
        include: {
          subject: { select: { id: true, name: true, code: true, semester: true } },
          assignments: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  })
  
  return sections
}
