'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

async function requireHod() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const role = (session.user as { role?: string })?.role
  if (role !== 'HOD' && role !== 'ADMIN') {
    throw new Error('Unauthorized: HOD access required')
  }
  return session
}

async function getHodDepartment() {
  const session = await requireHod()
  const userId = (session.user as { id: string }).id

  const department = await db.department.findFirst({
    where: { hodId: userId }
  })

  if (!department) throw new Error('No department assigned to this HOD')
  return { department, userId }
}

// ---- Department Overview ----

export async function getHodDepartmentOverview() {
  const { department } = await getHodDepartment()

  const [subjectCount, sectionCount, studentCount, facultyAssignments] = await Promise.all([
    db.subject.count({ where: { departmentId: department.id } }),
    db.section.count({ where: { departmentId: department.id } }),
    db.student.count({ where: { departmentId: department.id } }),
    db.facultyAssignment.findMany({
      where: {
        courseOffering: {
          section: { departmentId: department.id }
        }
      },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  // Sections grouped by year with student counts
  const sections = await db.section.findMany({
    where: { departmentId: department.id },
    include: {
      _count: { select: { sectionEnrollments: true, courseOfferings: true } },
    },
    orderBy: [{ year: 'asc' }, { name: 'asc' }],
  })

  const yearGroups: Record<string, { sections: typeof sections; studentCount: number; subjectCount: number }> = {}
  for (const sec of sections) {
    if (!yearGroups[sec.year]) yearGroups[sec.year] = { sections: [], studentCount: 0, subjectCount: 0 }
    yearGroups[sec.year].sections.push(sec)
    yearGroups[sec.year].studentCount += sec._count.sectionEnrollments
    yearGroups[sec.year].subjectCount += sec._count.courseOfferings
  }

  return {
    department: { id: department.id, name: department.name, code: department.code },
    stats: {
      subjectCount,
      sectionCount,
      studentCount,
      facultyCount: facultyAssignments.length,
    },
    yearGroups,
  }
}

// ---- Sections with Details by Semester ----

export async function getHodDepartmentSemesterDetails(semester: number) {
  const { department } = await getHodDepartment()
  
  const getYearForSem = (sem: number) => {
    if (sem === 1 || sem === 2) return 'FY'
    if (sem === 3 || sem === 4) return 'SY'
    if (sem === 5 || sem === 6) return 'TY'
    return 'Final Year'
  }

  const targetYear = getYearForSem(semester)

  return db.section.findMany({
    where: { departmentId: department.id, year: targetYear },
    include: {
      sectionEnrollments: {
        include: {
          student: { select: { id: true, name: true, prn: true } }
        }
      },
      courseOfferings: {
        where: { subject: { semester } },
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
}

// ---- Sections with Details ----

export async function getHodSections(contextId?: string | null) {
  const { department } = await getHodDepartment()

  const sections = await db.section.findMany({
    where: { departmentId: department.id },
    include: {
      sectionEnrollments: {
        where: contextId ? { academicContextId: contextId } : undefined,
        include: {
          student: { select: { id: true, name: true, prn: true } },
          academicContext: { select: { academicYear: true, semester: true } }
        }
      },
      courseOfferings: {
        where: contextId ? { academicContextId: contextId } : undefined,
        include: {
          subject: { select: { id: true, name: true, code: true } },
          academicContext: { select: { academicYear: true, semester: true } },
          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true } }
            }
          }
        }
      },
      _count: { select: { sectionEnrollments: true } }
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

// ---- Faculty Management ----

export async function getDepartmentFaculty() {
  const { department } = await getHodDepartment()

  // Get all faculty assigned to offerings in this department
  const assignments = await db.facultyAssignment.findMany({
    where: {
      courseOffering: {
        section: { departmentId: department.id }
      }
    },
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

  // Group by faculty
  const facultyMap: Record<string, {
    user: { id: string; name: string; email: string; role: string; isActive: boolean }
    assignments: typeof assignments
  }> = {}

  for (const a of assignments) {
    if (!facultyMap[a.userId]) {
      facultyMap[a.userId] = { user: a.user, assignments: [] }
    }
    facultyMap[a.userId].assignments.push(a)
  }

  return Object.values(facultyMap)
}

export async function hodCreateFaculty(data: { name: string; email: string }) {
  const { department } = await getHodDepartment()

  const existing = await db.user.findUnique({ where: { email: data.email } })
  if (existing) {
    return { error: 'A user with this email already exists' }
  }

  const temporaryPassword = crypto.randomBytes(4).toString('hex')
  const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      hashedPassword,
      role: 'FACULTY',
      isActive: true,
      mustChangePassword: true,
      departments: { connect: { id: department.id } }
    },
  })

  revalidatePath('/hod')
  return { success: true, user: { id: user.id, name: user.name, email: user.email }, temporaryPassword }
}

export async function hodAssignFaculty(userId: string, courseOfferingId: string) {
  const { department } = await getHodDepartment()

  // Verify the offering belongs to this department
  const offering = await db.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: { section: true }
  })
  if (!offering || offering.section.departmentId !== department.id) {
    return { error: 'Course offering not found in your department' }
  }

  const existing = await db.facultyAssignment.findFirst({
    where: { userId, courseOfferingId }
  })
  if (existing) return { error: 'Faculty already assigned' }

  await db.facultyAssignment.create({ data: { userId, courseOfferingId } })

  revalidatePath('/hod')
  return { success: true }
}

export async function hodRemoveFaculty(assignmentId: string) {
  const { department } = await getHodDepartment()

  // Verify assignment belongs to this department
  const assignment = await db.facultyAssignment.findUnique({
    where: { id: assignmentId },
    include: { courseOffering: { include: { section: true } } }
  })
  if (!assignment || assignment.courseOffering.section.departmentId !== department.id) {
    return { error: 'Assignment not found in your department' }
  }

  await db.facultyAssignment.delete({ where: { id: assignmentId } })

  revalidatePath('/hod')
  return { success: true }
}

export async function hodResetFacultyPassword(userId: string) {
  const { department } = await getHodDepartment()

  // Verify the user is associated with the department
  const user = await db.user.findFirst({
    where: {
      id: userId,
      departments: { some: { id: department.id } }
    }
  })

  if (!user) {
    return { error: 'Faculty not found in your department' }
  }

  const temporaryPassword = crypto.randomBytes(4).toString('hex')
  const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

  await db.user.update({
    where: { id: userId },
    data: { hashedPassword, mustChangePassword: true }
  })

  revalidatePath('/hod')
  return { success: true, temporaryPassword }
}

export async function hodRemoveFacultyFromDepartment(userId: string) {
  const { department } = await getHodDepartment()

  // Verify the user is associated with the department
  const user = await db.user.findFirst({
    where: {
      id: userId,
      departments: { some: { id: department.id } }
    }
  })

  if (!user) {
    return { error: 'Faculty not found in your department' }
  }

  // 1. Delete all faculty assignments for this user in this department
  await db.facultyAssignment.deleteMany({
    where: {
      userId,
      courseOffering: {
        section: { departmentId: department.id }
      }
    }
  })

  // 2. Disconnect the user from the department
  await db.user.update({
    where: { id: userId },
    data: {
      departments: { disconnect: { id: department.id } }
    }
  })

  revalidatePath('/hod')
  return { success: true }
}

// ---- Subjects ----

export async function getHodSubjects() {
  const { department } = await getHodDepartment()

  return db.subject.findMany({
    where: { departmentId: department.id },
    include: {
      courseOfferings: {
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
}

export async function hodCreateSubject(data: { name: string; code: string }) {
  const { department } = await getHodDepartment()

  const existing = await db.subject.findFirst({
    where: { code: data.code, departmentId: department.id }
  })
  if (existing) return { error: 'Subject code already exists in this department' }

  await db.subject.create({
    data: { ...data, departmentId: department.id }
  })

  revalidatePath('/hod')
  return { success: true }
}

export async function hodUpdateSubject(subjectId: string, data: { name?: string; code?: string }) {
  const { department } = await getHodDepartment()

  const subject = await db.subject.findUnique({ where: { id: subjectId } })
  if (!subject || subject.departmentId !== department.id) {
    return { error: 'Subject not found in your department' }
  }

  await db.subject.update({ where: { id: subjectId }, data })

  revalidatePath('/hod')
  return { success: true }
}

export async function hodDeleteSubject(subjectId: string) {
  const { department } = await getHodDepartment()

  const subject = await db.subject.findUnique({ where: { id: subjectId } })
  if (!subject || subject.departmentId !== department.id) {
    return { error: 'Subject not found in your department' }
  }

  const offerings = await db.courseOffering.count({ where: { subjectId } })
  if (offerings > 0) return { error: 'Cannot delete subject with existing course offerings' }

  await db.subject.delete({ where: { id: subjectId } })

  revalidatePath('/hod')
  return { success: true }
}

// ---- Marks (HOD can read and write) ----

export async function getHodMarks(courseOfferingId: string) {
  const { department } = await getHodDepartment()

  // Verify offering belongs to department
  const offering = await db.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: { section: true }
  })
  if (!offering || offering.section.departmentId !== department.id) {
    throw new Error('Offering not found in your department')
  }

  // Get enrolled students with their marks
  const enrollments = await db.sectionEnrollment.findMany({
    where: {
      sectionId: offering.sectionId,
      academicContextId: offering.academicContextId,
    },
    include: {
      student: {
        include: {
          marks: {
            where: {
              assessmentQuestion: {
                assessment: { courseOfferingId }
              }
            },
            include: {
              assessmentQuestion: {
                select: {
                  questionNumber: true,
                  maxMarks: true,
                  courseOutcome: { select: { code: true } },
                  assessment: { select: { name: true } }
                }
              }
            }
          }
        }
      }
    },
    orderBy: { rollNumber: 'asc' }
  })

  return enrollments
}

export async function hodUpdateMark(markId: string, marksObtained: number | null) {
  const { department } = await getHodDepartment()

  // Verify mark belongs to department
  const mark = await db.studentMark.findUnique({
    where: { id: markId },
    include: {
      assessmentQuestion: {
        include: {
          assessment: {
            include: {
              courseOffering: {
                include: { section: true }
              }
            }
          }
        }
      }
    }
  })

  if (!mark || mark.assessmentQuestion.assessment.courseOffering.section.departmentId !== department.id) {
    return { error: 'Mark not found in your department' }
  }

  await db.studentMark.update({
    where: { id: markId },
    data: { marksObtained }
  })

  revalidatePath('/hod')
  return { success: true }
}

// ---- HOD's own subjects (if HOD is also faculty) ----

export async function getHodOwnSubjects() {
  const session = await requireHod()
  const userId = (session.user as { id: string }).id

  const assignments = await db.facultyAssignment.findMany({
    where: { userId },
    include: {
      courseOffering: {
        include: {
          subject: true,
          academicContext: true,
          section: {
            include: {
              department: { select: { code: true } },
              _count: { select: { sectionEnrollments: true } }
            }
          }
        }
      }
    }
  })

  return assignments
}

// ---- Search users (for faculty assignment) ----

export async function searchUsersForAssignment(query: string) {
  await requireHod()

  return db.user.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ]
    },
    select: { id: true, name: true, email: true, role: true },
    take: 10,
  })
}

// ---- Get unassigned offerings ----

export async function getUnassignedOfferings() {
  const { department } = await getHodDepartment()

  return db.courseOffering.findMany({
    where: {
      section: { departmentId: department.id },
      assignments: { none: {} }
    },
    include: {
      subject: { select: { name: true, code: true } },
      section: { select: { name: true, year: true } },
      academicContext: { select: { academicYear: true, semester: true } },
    }
  })
}
