'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface QuestionData {
  questionNumber: string
  question: string
  maxMarks: string
  co: string
  btLevel: string
}

export interface QuestionGroup {
  main: QuestionData[]
  alternative: QuestionData[]
}

export interface QuestionPaperInput {
  courseOfferingId: string
  unitTest: string
  semester: string
  department: string
  subjectName: string
  date: string
  duration: string
  maxMarks: string
  minMarks: string
  examination: string
  questionGroups: QuestionGroup[]
}

export async function saveQuestionPaper(input: QuestionPaperInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  // Check the user is FACULTY or HOD
  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user || (user.role !== 'FACULTY' && user.role !== 'HOD')) {
    return { error: 'Only faculty can create question papers' }
  }

  try {
    // Save the question paper record
    const paper = await db.questionPaper.create({
      data: {
        courseOfferingId: input.courseOfferingId,
        createdByUserId: session.user.id,
        title: `${input.unitTest} Question Paper`,
        unitTest: input.unitTest,
        semester: input.semester,
        department: input.department,
        subjectName: input.subjectName,
        date: input.date,
        duration: input.duration,
        maxMarks: input.maxMarks,
        minMarks: input.minMarks,
        examination: input.examination,
        questionsJson: JSON.stringify(input.questionGroups),
      },
    })

    // Also create/update the Assessment and AssessmentQuestion records for CO mapping
    // Find or create assessment for this UT
    let assessment = await db.assessment.findFirst({
      where: {
        courseOfferingId: input.courseOfferingId,
        name: input.unitTest,
      },
    })

    if (!assessment) {
      assessment = await db.assessment.create({
        data: {
          courseOfferingId: input.courseOfferingId,
          name: input.unitTest,
        },
      })
    } else {
      // Delete existing questions for this assessment to re-create
      await db.assessmentQuestion.deleteMany({
        where: { assessmentId: assessment.id },
      })
    }

    // Get course outcomes for this offering
    const outcomes = await db.courseOutcome.findMany({
      where: { courseOfferingId: input.courseOfferingId },
    })
    const outcomeMap = new Map(outcomes.map(o => [o.code, o.id]))

    // Create AssessmentQuestion records from the main questions in each group
    let questionNum = 1
    for (const group of input.questionGroups) {
      for (const q of group.main) {
        if (q.co && outcomeMap.has(q.co) && q.maxMarks) {
          await db.assessmentQuestion.create({
            data: {
              assessmentId: assessment.id,
              courseOutcomeId: outcomeMap.get(q.co)!,
              questionNumber: questionNum,
              maxMarks: parseInt(q.maxMarks) || 0,
            },
          })
          questionNum++
        }
      }
    }

    revalidatePath(`/faculty/subjects/${input.courseOfferingId}`)
    return { success: true, paperId: paper.id }
  } catch (error) {
    console.error('Error saving question paper:', error)
    return { error: 'Failed to save question paper' }
  }
}

export async function getRecentQuestionPapers(courseOfferingId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return []
  }

  const papers = await db.questionPaper.findMany({
    where: { courseOfferingId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      createdBy: {
        select: { name: true },
      },
    },
  })

  return papers
}

export async function getQuestionPaperById(paperId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }

  const paper = await db.questionPaper.findUnique({
    where: { id: paperId },
  })

  return paper
}
