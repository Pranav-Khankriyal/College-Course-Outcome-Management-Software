'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AcademicPeriodStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

async function requireAdminOrHod() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const user = session.user as { role: string; id: string }
  if (user.role === 'ADMIN' || user.role === 'HOD') return user
  throw new Error('Unauthorized')
}

/**
 * Calculates the next academic year string from the current one.
 * e.g., "2024-25" -> "2025-26", "2026-27" -> "2027-28"
 */
function getNextAcademicYear(currentYear: string): string {
  const parts = currentYear.split('-')
  if (parts.length === 2) {
    const startYear = parseInt(parts[0], 10)
    const endPart = parts[1]
    const nextStart = startYear + 1

    if (endPart.length === 2) {
      const nextEnd = (parseInt(endPart, 10) + 1) % 100
      return `${nextStart}-${nextEnd.toString().padStart(2, '0')}`
    } else if (endPart.length === 4) {
      const nextEnd = parseInt(endPart, 10) + 1
      return `${nextStart}-${nextEnd}`
    }
  }

  const yearMatch = currentYear.match(/\d{4}/)
  if (yearMatch) {
    const start = parseInt(yearMatch[0], 10) + 1
    const end = (start + 1) % 100
    return `${start}-${end.toString().padStart(2, '0')}`
  }

  return currentYear
}

/**
 * Seeds course offerings for an academic context based on whether it is Odd or Even semester.
 */
export async function seedCourseOfferingsForContext(academicContextId: string) {
  const context = await db.academicContext.findUnique({
    where: { id: academicContextId }
  })
  if (!context) return 0

  const isOdd = context.term === 'Odd' || context.semester.toLowerCase().includes('odd')
  const semToYear: Record<number, string> = isOdd
    ? { 1: 'FY', 3: 'SY', 5: 'TY', 7: 'Final Year' }
    : { 2: 'FY', 4: 'SY', 6: 'TY', 8: 'Final Year' }

  const subjects = await db.subject.findMany({
    include: { department: { include: { sections: true } } }
  })

  let count = 0
  for (const subject of subjects) {
    const targetYear = semToYear[subject.semester]
    if (!targetYear) continue

    const matchingSections = subject.department.sections.filter(s => s.year === targetYear)
    for (const section of matchingSections) {
      const existing = await db.courseOffering.findFirst({
        where: {
          subjectId: subject.id,
          sectionId: section.id,
          academicContextId: context.id
        }
      })
      if (!existing) {
        await db.courseOffering.create({
          data: {
            subjectId: subject.id,
            sectionId: section.id,
            academicContextId: context.id
          }
        })
        count++
      }
    }
  }
  return count
}

/**
 * Automatically creates the next Academic Year (Odd and Even semesters)
 * triggered after every 2 semesters (upon conclusion of every Even semester).
 */
export async function ensureNextAcademicYearCreated(currentYear: string) {
  await requireAdminOrHod()
  const nextYear = getNextAcademicYear(currentYear)

  // 1. Check if next year already has an Odd semester
  let oddContext = await db.academicContext.findFirst({
    where: { academicYear: nextYear, term: 'Odd' }
  })

  if (!oddContext) {
    // Mark previous CURRENT periods as COMPLETED
    await db.academicContext.updateMany({
      where: { status: 'CURRENT' },
      data: { status: 'COMPLETED' }
    })

    oddContext = await db.academicContext.create({
      data: {
        academicYear: nextYear,
        semester: 'Odd Semester',
        term: 'Odd',
        status: 'CURRENT'
      }
    })
  }

  // 2. Seed offerings for the new Odd Semester
  if (oddContext) {
    await seedCourseOfferingsForContext(oddContext.id)
  }

  revalidatePath('/admin/academic-periods')
  revalidatePath('/admin/promotion')
  revalidatePath('/admin')
  return { nextYear, oddContext }
}

/**
 * Advance the academic calendar:
 * If currently in Odd semester -> switches to Even semester of same academic year.
 * If currently in Even semester (2 semesters completed) -> automatically creates next Academic Year!
 */
export async function advanceSemesterOrRollover() {
  await requireAdminOrHod()

  const currentPeriod = await db.academicContext.findFirst({
    where: { status: 'CURRENT' },
    orderBy: [{ academicYear: 'desc' }, { term: 'asc' }]
  })

  if (!currentPeriod) {
    throw new Error('No active academic period found.')
  }

  const isEven = currentPeriod.term === 'Even' || currentPeriod.semester.toLowerCase().includes('even')

  if (isEven) {
    // 2 semesters completed! Create new academic year
    await db.academicContext.update({
      where: { id: currentPeriod.id },
      data: { status: 'COMPLETED' }
    })

    const result = await ensureNextAcademicYearCreated(currentPeriod.academicYear)
    revalidatePath('/admin/academic-periods')
    revalidatePath('/admin/promotion')
    revalidatePath('/admin')

    return {
      success: true,
      rollover: true,
      message: `Completed Academic Year ${currentPeriod.academicYear} (2 semesters). Successfully created new Academic Year ${result.nextYear} starting with Odd Semester!`,
      nextYear: result.nextYear
    }
  } else {
    // Odd semester completed -> advance to Even semester of same academic year
    await db.academicContext.update({
      where: { id: currentPeriod.id },
      data: { status: 'COMPLETED' }
    })

    let evenPeriod = await db.academicContext.findFirst({
      where: { academicYear: currentPeriod.academicYear, term: 'Even' }
    })

    if (!evenPeriod) {
      evenPeriod = await db.academicContext.create({
        data: {
          academicYear: currentPeriod.academicYear,
          semester: 'Even Semester',
          term: 'Even',
          status: 'CURRENT'
        }
      })
    } else {
      evenPeriod = await db.academicContext.update({
        where: { id: evenPeriod.id },
        data: { status: 'CURRENT' }
      })
    }

    await seedCourseOfferingsForContext(evenPeriod.id)
    revalidatePath('/admin/academic-periods')
    revalidatePath('/admin/promotion')
    revalidatePath('/admin')

    return {
      success: true,
      rollover: false,
      message: `Switched from Odd Semester to Even Semester for Academic Year ${currentPeriod.academicYear}.`,
      academicYear: currentPeriod.academicYear
    }
  }
}

export async function getAcademicPeriods() {
  await requireAdminOrHod()
  return await db.academicContext.findMany({
    where: { academicYear: { gte: '2024-25' } },
    orderBy: [
      { academicYear: 'desc' },
      { term: 'asc' }
    ]
  })
}

export async function createAcademicPeriod(data: {
  academicYear: string,
  semester: string,
  term?: string,
  startDate?: Date,
  endDate?: Date,
  status: AcademicPeriodStatus
}) {
  await requireAdminOrHod()
  const period = await db.academicContext.create({ data })
  if (data.status === 'CURRENT') {
    await seedCourseOfferingsForContext(period.id)
  }
  revalidatePath('/admin/academic-periods')
  revalidatePath('/admin')
  return period
}

export async function updateAcademicPeriod(id: string, data: {
  term?: string,
  startDate?: Date,
  endDate?: Date,
  status: AcademicPeriodStatus
}) {
  await requireAdminOrHod()
  const period = await db.academicContext.update({
    where: { id },
    data
  })

  // When an Even semester is marked COMPLETED (after 2 semesters), auto-create the next year!
  if (data.status === 'COMPLETED') {
    const isEven = period.term === 'Even' || period.semester.toLowerCase().includes('even')
    if (isEven) {
      await ensureNextAcademicYearCreated(period.academicYear)
    } else {
      // If Odd completed, ensure Even is ready or activate it
      const even = await db.academicContext.findFirst({
        where: { academicYear: period.academicYear, term: 'Even' }
      })
      if (even && even.status === 'UPCOMING') {
        await db.academicContext.update({
          where: { id: even.id },
          data: { status: 'CURRENT' }
        })
        await seedCourseOfferingsForContext(even.id)
      }
    }
  }

  if (data.status === 'CURRENT') {
    await seedCourseOfferingsForContext(period.id)
  }

  revalidatePath('/admin/academic-periods')
  revalidatePath('/admin')
  return period
}

export async function previewPromotion(
  sourceAcademicContextId: string,
  targetAcademicContextId: string,
  departmentId: string,
  sectionId?: string
) {
  await requireAdminOrHod()

  const [sourceContext, targetContext] = await Promise.all([
    db.academicContext.findUnique({ where: { id: sourceAcademicContextId } }),
    db.academicContext.findUnique({ where: { id: targetAcademicContextId } })
  ])

  if (!sourceContext || !targetContext) {
    throw new Error('Academic periods not found')
  }

  const isYearRollover = sourceContext.term === 'Even' || sourceContext.semester.toLowerCase().includes('even')

  const whereClause: Record<string, unknown> = {
    academicContextId: sourceAcademicContextId,
    section: { departmentId }
  }
  if (sectionId && sectionId !== 'all') {
    whereClause.sectionId = sectionId
  }

  const enrollments = await db.sectionEnrollment.findMany({
    where: whereClause,
    include: {
      student: true,
      section: true,
    }
  })

  // Group by section or evaluate eligibility
  const eligibleStudents = enrollments.filter(e => e.student.status === 'ACTIVE')
  const heldStudents = enrollments.filter(e => e.student.status === 'INACTIVE')
  const leftStudents = enrollments.filter(e => e.student.status === 'LEFT' || e.student.status === 'TRANSFERRED' || e.student.status === 'GRADUATED')

  const fyCount = eligibleStudents.filter(e => e.section.year === 'FY').length
  const syCount = eligibleStudents.filter(e => e.section.year === 'SY').length
  const tyCount = eligibleStudents.filter(e => e.section.year === 'TY').length
  const finalYearCount = eligibleStudents.filter(e => e.section.year === 'Final Year').length

  return {
    totalFound: enrollments.length,
    eligible: eligibleStudents.length,
    held: heldStudents.length,
    left: leftStudents.length,
    enrollments: eligibleStudents,
    isYearRollover,
    sourceYear: sourceContext.academicYear,
    targetYear: targetContext.academicYear,
    breakdown: {
      fyCount,
      syCount,
      tyCount,
      finalYearCount
    }
  }
}

export async function executePromotion(
  sourceAcademicContextId: string,
  targetAcademicContextId: string,
  departmentId: string,
  sectionId?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _autoUpgradeSections: boolean = false
) {
  await requireAdminOrHod()

  const [sourceContext, targetContext] = await Promise.all([
    db.academicContext.findUnique({ where: { id: sourceAcademicContextId } }),
    db.academicContext.findUnique({ where: { id: targetAcademicContextId } })
  ])

  if (!sourceContext || !targetContext) {
    throw new Error('Academic periods not found')
  }

  const preview = await previewPromotion(sourceAcademicContextId, targetAcademicContextId, departmentId, sectionId)
  const isYearRollover = sourceContext.term === 'Even' || sourceContext.semester.toLowerCase().includes('even')

  // Seed target context offerings
  await seedCourseOfferingsForContext(targetAcademicContextId)

  // Pre-load all sections of this department
  const deptSections = await db.section.findMany({
    where: { departmentId }
  })

  const getOrCreateSection = async (name: string, year: string) => {
    let match = deptSections.find(s => s.name.toLowerCase() === name.toLowerCase() && s.year === year)
    if (!match) {
      match = await db.section.create({
        data: { name, year, departmentId }
      })
      deptSections.push(match)
    }
    return match
  }

  let promotedCount = 0
  let graduatedCount = 0

  for (const enrollment of preview.enrollments) {
    const currentYear = enrollment.section.year
    const secName = enrollment.section.name

    if (isYearRollover) {
      // Academic year rollover: advance student year levels
      if (currentYear === 'Final Year') {
        // Final Year students graduate
        await db.student.update({
          where: { id: enrollment.studentId },
          data: { status: 'GRADUATED' }
        })
        graduatedCount++
      } else {
        // Advance: FY -> SY, SY -> TY, TY -> Final Year
        let nextYearLevel = 'SY'
        if (currentYear === 'FY') nextYearLevel = 'SY'
        else if (currentYear === 'SY') nextYearLevel = 'TY'
        else if (currentYear === 'TY') nextYearLevel = 'Final Year'

        const targetSection = await getOrCreateSection(secName, nextYearLevel)

        await db.sectionEnrollment.upsert({
          where: {
            studentId_sectionId_academicContextId: {
              studentId: enrollment.studentId,
              sectionId: targetSection.id,
              academicContextId: targetAcademicContextId
            }
          },
          update: {
            rollNumber: enrollment.rollNumber
          },
          create: {
            studentId: enrollment.studentId,
            sectionId: targetSection.id,
            academicContextId: targetAcademicContextId,
            rollNumber: enrollment.rollNumber
          }
        })
        promotedCount++
      }
    } else {
      // Mid-year promotion (Odd -> Even): students stay in same section
      await db.sectionEnrollment.upsert({
        where: {
          studentId_sectionId_academicContextId: {
            studentId: enrollment.studentId,
            sectionId: enrollment.sectionId,
            academicContextId: targetAcademicContextId
          }
        },
        update: {
          rollNumber: enrollment.rollNumber
        },
        create: {
          studentId: enrollment.studentId,
          sectionId: enrollment.sectionId,
          academicContextId: targetAcademicContextId,
          rollNumber: enrollment.rollNumber
        }
      })
      promotedCount++
    }
  }

  // NOTE: Section records (FY, SY, TY, Final Year) remain permanent and are never renamed or deleted.
  // FY in the target context is completely clean with 0 students, ready for fresh student intake.

  revalidatePath('/admin/promotion')
  revalidatePath('/admin/departments')
  revalidatePath('/admin')
  return { 
    success: true, 
    promotedCount, 
    graduatedCount,
    isYearRollover
  }
}

