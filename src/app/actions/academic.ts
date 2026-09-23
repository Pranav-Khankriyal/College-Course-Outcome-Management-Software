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

export async function getAcademicPeriods() {
  await requireAdminOrHod()
  return await db.academicContext.findMany({
    orderBy: { academicYear: 'desc' }
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
  revalidatePath('/admin/academic-periods')
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
  revalidatePath('/admin/academic-periods')
  return period
}

export async function previewPromotion(
  sourceAcademicContextId: string,
  targetAcademicContextId: string,
  departmentId: string,
  sectionId?: string
) {
  await requireAdminOrHod()

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

  return {
    totalFound: enrollments.length,
    eligible: eligibleStudents.length,
    held: heldStudents.length,
    left: leftStudents.length,
    enrollments: eligibleStudents
  }
}

export async function executePromotion(
  sourceAcademicContextId: string,
  targetAcademicContextId: string,
  departmentId: string,
  sectionId?: string,
  autoUpgradeSections: boolean = false
) {
  await requireAdminOrHod()

  const preview = await previewPromotion(sourceAcademicContextId, targetAcademicContextId, departmentId, sectionId)

  let count = 0
  for (const enrollment of preview.enrollments) {
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
    count++
  }

  if (autoUpgradeSections) {
    const sectionsToUpgrade = sectionId && sectionId !== 'all' 
      ? await db.section.findMany({ where: { id: sectionId } })
      : await db.section.findMany({ where: { departmentId } })
      
    for (const sec of sectionsToUpgrade) {
      const semMatch = sec.name.match(/(Sem(?:ester)?\s*)(\d+)/i)
      let newName = sec.name
      let newYear = sec.year

      if (semMatch) {
        const currentSem = parseInt(semMatch[2], 10)
        const nextSem = currentSem + 1
        newName = sec.name.replace(semMatch[0], `${semMatch[1]}${nextSem}`)
        
        if (nextSem === 3) newYear = 'SY'
        else if (nextSem === 5) newYear = 'TY'
        else if (nextSem === 7) newYear = 'Final Year'
        else if (nextSem === 9) newYear = 'Graduated' // optional fallback
      }

      // Also handle basic year string upgrades if the section doesn't use "Sem X" in name
      // but the user wants to upgrade FY to SY, etc.
      // E.g. if name is just "FY CSBS", we might want to change it.
      // But if we already matched semMatch, we updated it. 
      // If we didn't match semMatch, we could try to find FY/SY in the name or year.
      if (!semMatch) {
         if (newYear === 'FY') newYear = 'SY'
         else if (newYear === 'SY') newYear = 'TY'
         else if (newYear === 'TY') newYear = 'Final Year'
      }

      if (newName !== sec.name || newYear !== sec.year) {
        await db.section.update({
          where: { id: sec.id },
          data: { name: newName, year: newYear }
        })
      }
    }
  }

  revalidatePath('/admin/promotion')
  return { success: true, promotedCount: count }
}
