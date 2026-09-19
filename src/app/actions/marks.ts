'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

async function requireFacultyOrHod() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  return session
}

// ---- Get marks for a course offering ----

export async function getMarksForOffering(courseOfferingId: string) {
  const session = await requireFacultyOrHod()
  const userId = (session.user as { id: string }).id
  const role = (session.user as { role?: string })?.role

  // Verify access: faculty must be assigned, HOD must own the department, admin can view
  if (role === 'FACULTY') {
    const assignment = await db.facultyAssignment.findFirst({
      where: { userId, courseOfferingId }
    })
    if (!assignment) throw new Error('You are not assigned to this offering')
  }

  // Get the offering details
  const offering = await db.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      subject: true,
      section: true,
      academicContext: true,
      outcomes: { orderBy: { code: 'asc' } },
      assessments: {
        include: {
          questions: {
            orderBy: { questionNumber: 'asc' },
            include: {
              courseOutcome: { select: { code: true } },
            }
          }
        }
      }
    }
  })

  if (!offering) throw new Error('Offering not found')

  // Get enrolled students with marks
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
                  id: true,
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

  return { offering, enrollments }
}

// ---- Update a single mark ----

export async function updateMark(markId: string, marksObtained: number | null) {
  const session = await requireFacultyOrHod()
  const userId = (session.user as { id: string }).id
  const role = (session.user as { role?: string })?.role

  const mark = await db.studentMark.findUnique({
    where: { id: markId },
    include: {
      assessmentQuestion: {
        include: {
          assessment: {
            include: {
              courseOffering: {
                include: { section: true, assignments: true }
              }
            }
          }
        }
      }
    }
  })

  if (!mark) return { error: 'Mark not found' }

  // Verify access
  if (role === 'FACULTY') {
    const isAssigned = mark.assessmentQuestion.assessment.courseOffering.assignments.some(
      a => a.userId === userId
    )
    if (!isAssigned) return { error: 'You are not assigned to this offering' }
  }

  // Validate marks range
  if (marksObtained !== null && (marksObtained < 0 || marksObtained > mark.assessmentQuestion.maxMarks)) {
    return { error: `Marks must be between 0 and ${mark.assessmentQuestion.maxMarks}` }
  }

  await db.studentMark.update({
    where: { id: markId },
    data: { marksObtained }
  })

  return { success: true }
}

// ---- Bulk import marks from Excel ----

export async function importMarksFromExcel(
  courseOfferingId: string,
  studentsData: {
    name: string
    rollNumber: string
    co1: number
    co2: number
    co3: number
    co4: number
    co5: number
    co6: number
  }[]
) {
  const session = await requireFacultyOrHod()
  const userId = (session.user as { id: string }).id
  const role = (session.user as { role?: string })?.role

  // Verify access
  if (role === 'FACULTY') {
    const assignment = await db.facultyAssignment.findFirst({
      where: { userId, courseOfferingId }
    })
    if (!assignment) throw new Error('You are not assigned to this offering')
  }

  const offering = await db.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: { section: true, academicContext: true }
  })
  if (!offering) throw new Error('Course offering not found')

  // Ensure COs exist
  const coConfigs = [
    { code: 'CO1', maxMarks: 6 },
    { code: 'CO2', maxMarks: 6 },
    { code: 'CO3', maxMarks: 7 },
    { code: 'CO4', maxMarks: 6 },
    { code: 'CO5', maxMarks: 6 },
    { code: 'CO6', maxMarks: 7 },
  ]

  // Create or get COs
  const coMap: Record<string, string> = {}
  for (const co of coConfigs) {
    const existing = await db.courseOutcome.findFirst({
      where: { courseOfferingId, code: co.code }
    })
    if (existing) {
      coMap[co.code] = existing.id
    } else {
      const created = await db.courseOutcome.create({
        data: { courseOfferingId, code: co.code, description: `${co.code} Outcome` }
      })
      coMap[co.code] = created.id
    }
  }

  // Create or get Assessment
  let assessment = await db.assessment.findFirst({
    where: { courseOfferingId, name: 'Internal Assessment' }
  })
  if (!assessment) {
    assessment = await db.assessment.create({
      data: { courseOfferingId, name: 'Internal Assessment' }
    })
  }

  // Create or get AssessmentQuestions for each CO
  const questionMap: Record<string, string> = {}
  for (let i = 0; i < coConfigs.length; i++) {
    const co = coConfigs[i]
    let question = await db.assessmentQuestion.findFirst({
      where: {
        assessmentId: assessment.id,
        courseOutcomeId: coMap[co.code],
      }
    })
    if (!question) {
      question = await db.assessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          courseOutcomeId: coMap[co.code],
          questionNumber: i + 1,
          maxMarks: co.maxMarks,
        }
      })
    }
    questionMap[co.code] = question.id
  }

  // Process each student
  let processedCount = 0
  for (const row of studentsData) {
    // Create or find student
    const student = await db.student.upsert({
      where: { prn: row.rollNumber },
      update: { name: row.name },
      create: {
        prn: row.rollNumber,
        name: row.name,
        departmentId: offering.section.departmentId,
      }
    })

    // Enroll student
    await db.sectionEnrollment.upsert({
      where: {
        studentId_sectionId_academicContextId: {
          studentId: student.id,
          sectionId: offering.sectionId,
          academicContextId: offering.academicContextId,
        }
      },
      update: {},
      create: {
        studentId: student.id,
        sectionId: offering.sectionId,
        academicContextId: offering.academicContextId,
        rollNumber: row.rollNumber,
      }
    })

    // Create/update marks for each CO
    const coValues: Record<string, number> = {
      CO1: row.co1, CO2: row.co2, CO3: row.co3,
      CO4: row.co4, CO5: row.co5, CO6: row.co6,
    }

    for (const [code, value] of Object.entries(coValues)) {
      await db.studentMark.upsert({
        where: {
          studentId_assessmentQuestionId: {
            studentId: student.id,
            assessmentQuestionId: questionMap[code],
          }
        },
        update: { marksObtained: value, isAbsent: false },
        create: {
          studentId: student.id,
          assessmentQuestionId: questionMap[code],
          marksObtained: value,
          isAbsent: false,
        }
      })
    }

    processedCount++
  }

  revalidatePath(`/faculty/subjects/${courseOfferingId}`)
  revalidatePath('/hod')
  return { success: true, count: processedCount }
}

// ---- CO Attainment Summary ----

export async function getAttainmentSummary(courseOfferingId: string) {
  const session = await requireFacultyOrHod()

  const marks = await db.studentMark.findMany({
    where: {
      assessmentQuestion: {
        assessment: { courseOfferingId }
      }
    },
    include: {
      assessmentQuestion: {
        select: {
          maxMarks: true,
          courseOutcome: { select: { code: true } }
        }
      }
    }
  })

  // Group by CO and calculate attainment
  const coStats: Record<string, { total: number; count: number; maxMarks: number; level3: number; level2: number; level1: number; level0: number }> = {}

  for (const mark of marks) {
    const code = mark.assessmentQuestion.courseOutcome.code
    if (!coStats[code]) {
      coStats[code] = { total: 0, count: 0, maxMarks: mark.assessmentQuestion.maxMarks, level3: 0, level2: 0, level1: 0, level0: 0 }
    }

    const val = mark.marksObtained ?? 0
    coStats[code].total += val
    coStats[code].count++

    if (val >= 5) coStats[code].level3++
    else if (val >= 3) coStats[code].level2++
    else if (val >= 1) coStats[code].level1++
    else coStats[code].level0++
  }

  return coStats
}
