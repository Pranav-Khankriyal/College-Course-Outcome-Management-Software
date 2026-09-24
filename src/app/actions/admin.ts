'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import * as xlsx from 'xlsx'

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

export async function previewFacultyImport(base64Data: string) {
  await requireAdmin()

  const buffer = Buffer.from(base64Data, 'base64')
  const workbook = xlsx.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = xlsx.utils.sheet_to_json(worksheet)

  let newFaculty = 0
  let existingFaculty = 0
  let invalidRows = 0
  const parsedData: { name: string; email: string; role: string; password: string; subjectCode?: string }[] = []
  const seenEmails = new Set<string>()

  for (const row of jsonData as Record<string, string | number>[]) {
    const name = String(row['Name'] || row['Full Name'] || '').trim()
    const email = String(row['Email'] || row['Email Address'] || '').trim().toLowerCase()
    const role = String(row['Role'] || 'FACULTY').trim().toUpperCase()
    const rawPassword = String(row['Password'] || 'faculty123').trim()

    if (!name || !email) {
      invalidRows++
      continue
    }

    if (seenEmails.has(email)) {
      continue
    }
    seenEmails.add(email)

    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      existingFaculty++
    } else {
      newFaculty++
    }

    const subjectCode = String(row['Subject Code'] || row['SubjectCode'] || row['Subject'] || '').trim().toUpperCase()

    parsedData.push({
      name,
      email,
      role: ['ADMIN', 'HOD', 'FACULTY'].includes(role) ? role : 'FACULTY',
      password: rawPassword,
      subjectCode: subjectCode || undefined,
    })
  }

  return {
    totalRows: jsonData.length,
    newFaculty,
    existingFaculty,
    invalidRows,
    parsedData
  }
}

export async function confirmFacultyImport(parsedData: { name: string; email: string; role: string; password: string; subjectCode?: string }[]) {
  await requireAdmin()

  for (const data of parsedData) {
    const existing = await db.user.findUnique({ where: { email: data.email } })
    
    if (existing) {
      await db.user.update({
        where: { email: data.email },
        data: {
          name: data.name,
          role: data.role as 'ADMIN' | 'HOD' | 'FACULTY'
        }
      })
    } else {
      const hashedPassword = await bcrypt.hash(data.password, 12)
      await db.user.create({
        data: {
          name: data.name,
          email: data.email,
          role: data.role as 'ADMIN' | 'HOD' | 'FACULTY',
          hashedPassword,
          isActive: true
        }
      })
    }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function confirmDepartmentFacultyImport(
  parsedData: { name: string; email: string; role: string; password: string; subjectCode?: string }[],
  options?: { departmentId?: string; defaultOfferingId?: string }
) {
  await requireAdmin()

  for (const data of parsedData) {
    const cleanEmail = data.email.trim().toLowerCase()
    let user = await db.user.findUnique({ where: { email: cleanEmail } })

    if (user) {
      user = await db.user.update({
        where: { email: cleanEmail },
        data: {
          name: data.name.trim(),
          role: (data.role as 'ADMIN' | 'HOD' | 'FACULTY') || 'FACULTY'
        }
      })
    } else {
      const hashedPassword = await bcrypt.hash(data.password || 'faculty123', 12)
      user = await db.user.create({
        data: {
          name: data.name.trim(),
          email: cleanEmail,
          role: (data.role as 'ADMIN' | 'HOD' | 'FACULTY') || 'FACULTY',
          hashedPassword,
          isActive: true
        }
      })
    }

    // Determine offering assignment
    let targetOfferingId = options?.defaultOfferingId

    if (data.subjectCode && options?.departmentId) {
      const offering = await db.courseOffering.findFirst({
        where: {
          subject: {
            code: { equals: data.subjectCode, mode: 'insensitive' },
            departmentId: options.departmentId,
          }
        }
      })
      if (offering) targetOfferingId = offering.id
    }

    if (targetOfferingId) {
      const existingAssignment = await db.facultyAssignment.findFirst({
        where: { userId: user.id, courseOfferingId: targetOfferingId }
      })
      if (!existingAssignment) {
        await db.facultyAssignment.create({
          data: { userId: user.id, courseOfferingId: targetOfferingId }
        })
      }
    }
  }

  revalidatePath('/admin')
  return { success: true }
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

  if (data.role && data.role !== 'ADMIN') {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (user && user.role === 'ADMIN') {
      const otherAdmins = await db.user.count({
        where: { role: 'ADMIN', isActive: true, id: { not: userId } }
      })
      if (otherAdmins === 0) {
        return { error: 'Cannot remove the last active admin. Please promote another user first.' }
      }
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

  if (user.isActive && user.role === 'ADMIN') {
    const otherAdmins = await db.user.count({
      where: { role: 'ADMIN', isActive: true, id: { not: userId } }
    })
    if (otherAdmins === 0) {
      return { error: 'Cannot deactivate the last active admin. Please promote another user first.' }
    }
  }

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

  // Auto-create course offerings for existing sections matching this semester's year
  const semToYear: Record<number, string> = {
    1: 'FY', 2: 'FY',
    3: 'SY', 4: 'SY',
    5: 'TY', 6: 'TY',
    7: 'Final Year', 8: 'Final Year'
  }
  const targetYear = semToYear[data.semester] || 'FY'

  try {
    const [sections, contexts] = await Promise.all([
      db.section.findMany({
        where: { departmentId: data.departmentId, year: targetYear }
      }),
      db.academicContext.findMany({
        take: 2,
        orderBy: { academicYear: 'desc' }
      })
    ])

    for (const context of contexts) {
      for (const section of sections) {
        await db.courseOffering.create({
          data: {
            subjectId: subject.id,
            sectionId: section.id,
            academicContextId: context.id,
          }
        }).catch(() => {})
      }
    }
  } catch (err) {
    console.error('Failed to auto-generate offerings:', err)
  }

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

  // Check for existing marks or internal assessments
  const [marksCount, assessmentsCount] = await Promise.all([
    db.studentMark.count({
      where: { assessmentQuestion: { assessment: { courseOffering: { subjectId } } } }
    }),
    db.assessment.count({
      where: { courseOffering: { subjectId } }
    })
  ])

  if (marksCount > 0 || assessmentsCount > 0) {
    return { error: 'Cannot delete subject because student marks or assessments are already recorded for it.' }
  }

  // Safe to clean up empty assignments, question papers, and offerings
  await db.facultyAssignment.deleteMany({
    where: { courseOffering: { subjectId } }
  })
  await db.questionPaper.deleteMany({
    where: { courseOffering: { subjectId } }
  })
  await db.courseOffering.deleteMany({
    where: { subjectId }
  })

  await db.subject.delete({ where: { id: subjectId } })

  revalidatePath('/admin')
  return { success: true }
}

// ---- Faculty Assignment ----

export async function createAndAssignFaculty(data: {
  name: string
  email: string
  password?: string
  courseOfferingId?: string
}): Promise<{ success: true; user: { id: string; name: string; email: string } } | { error: string }> {
  try {
    await requireAdmin()

    const cleanEmail = data.email.trim().toLowerCase()
    let user = await db.user.findUnique({ where: { email: cleanEmail } })
    if (!user) {
      const hashedPassword = await bcrypt.hash(data.password || 'faculty123', 12)
      user = await db.user.create({
        data: {
          name: data.name.trim(),
          email: cleanEmail,
          hashedPassword,
          role: 'FACULTY',
          isActive: true,
        }
      })
    }

    if (data.courseOfferingId) {
      const existing = await db.facultyAssignment.findFirst({
        where: { userId: user.id, courseOfferingId: data.courseOfferingId }
      })
      if (!existing) {
        await db.facultyAssignment.create({
          data: { userId: user.id, courseOfferingId: data.courseOfferingId }
        })
      }
    }

    revalidatePath('/admin')
    return { success: true, user: { id: user.id, name: user.name, email: user.email } }
  } catch (e) {
    return { error: (e as Error).message || 'Failed to create or assign faculty' }
  }
}

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

  const user = await db.user.findUnique({ where: { id: userId } })
  if (user && user.role === 'ADMIN') {
    const otherAdmins = await db.user.count({
      where: { role: 'ADMIN', isActive: true, id: { not: userId } }
    })
    if (otherAdmins === 0) {
      return { error: 'Cannot remove the last active admin. Please promote another user first.' }
    }
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

  return db.academicContext.findMany({ 
    where: { academicYear: { gte: '2024-25' } },
    orderBy: [
      { academicYear: 'desc' },
      { term: 'asc' }
    ] 
  })
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
