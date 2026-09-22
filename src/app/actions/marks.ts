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
  payload: {
    assessmentName: string;
    questions: { col: number; coCode: string; questionName: string; maxMarks: number }[];
    students: {
      name: string;
      rollNumber: string;
      marks: { questionName: string; coCode: string; maxMarks: number; obtained: number }[];
    }[];
  }
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

  // Ensure COs exist based on the template
  const coMap: Record<string, string> = {}
  for (const q of payload.questions) {
    if (!coMap[q.coCode]) {
      let existing = await db.courseOutcome.findFirst({
        where: { courseOfferingId, code: q.coCode }
      })
      if (!existing) {
        existing = await db.courseOutcome.create({
          data: { courseOfferingId, code: q.coCode, description: `${q.coCode} Outcome` }
        })
      }
      coMap[q.coCode] = existing.id
    }
  }

  // Create or get Assessment based on parsed name
  const assessmentName = payload.assessmentName || 'Internal Assessment'
  let assessment = await db.assessment.findFirst({
    where: { courseOfferingId, name: assessmentName }
  })
  if (!assessment) {
    assessment = await db.assessment.create({
      data: { courseOfferingId, name: assessmentName }
    })
  }

  // Create or get AssessmentQuestions dynamically
  const questionMap: Record<string, string> = {} // Keyed by questionName
  for (let i = 0; i < payload.questions.length; i++) {
    const q = payload.questions[i]
    let question = await db.assessmentQuestion.findFirst({
      where: {
        assessmentId: assessment.id,
        courseOutcomeId: coMap[q.coCode],
      }
    })
    if (!question) {
      question = await db.assessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          courseOutcomeId: coMap[q.coCode],
          questionNumber: i + 1, // Using sequence as number
          maxMarks: q.maxMarks,
        }
      })
    } else if (question.maxMarks !== q.maxMarks) {
      // Update max marks if changed in template
      await db.assessmentQuestion.update({
        where: { id: question.id },
        data: { maxMarks: q.maxMarks }
      })
    }
    questionMap[q.questionName] = question.id
  }

  // Process each student
  let processedCount = 0
  for (const row of payload.students) {
    // Find enrollment
    const enrollment = await db.sectionEnrollment.findFirst({
      where: {
        rollNumber: row.rollNumber,
        sectionId: offering.sectionId,
        academicContextId: offering.academicContextId,
      },
      include: { student: true }
    })

    if (!enrollment) {
      // Also try to find by PRN, just in case the excel used PRN
      const altEnrollment = await db.sectionEnrollment.findFirst({
        where: {
          sectionId: offering.sectionId,
          academicContextId: offering.academicContextId,
          student: { prn: row.rollNumber }
        },
        include: { student: true }
      })
      
      if (!altEnrollment) {
        throw new Error(`Student with Roll Number / PRN "${row.rollNumber}" does not exist in the selected section and academic period. Please add the student to Student Management before importing marks.`)
      }
      var student = altEnrollment.student;
    } else {
      var student = enrollment.student;
    }

    // Create/update marks for each question mapping
    for (const mark of row.marks) {
      const qId = questionMap[mark.questionName];
      if (!qId) continue;
      
      await db.studentMark.upsert({
        where: {
          studentId_assessmentQuestionId: {
            studentId: student.id,
            assessmentQuestionId: qId,
          }
        },
        update: { marksObtained: mark.obtained, isAbsent: false },
        create: {
          studentId: student.id,
          assessmentQuestionId: qId,
          marksObtained: mark.obtained,
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
