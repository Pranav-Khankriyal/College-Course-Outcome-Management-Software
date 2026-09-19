'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  return session
}

export type YearKey = 'FY' | 'SY' | 'TY' | 'Final Year'

export type AnalyticsData = {
  overview: {
    studentCount: number
    facultyCount: number
    sectionCount: number
    subjectCount: number
  }
  results: Record<YearKey, { passed: number; total: number; percentage: number | null }>
  coAttainment: Record<YearKey, Record<string, { attained: number; total: number; percentage: number | null }>>
  utPerformance: Record<YearKey, Record<string, { obtained: number; max: number; percentage: number | null }>>
  subjectPerformance: Record<YearKey, { subjectName: string; code: string; obtained: number; max: number; percentage: number | null }[]>
  assessmentProgress: Record<YearKey, { completed: number; total: number; percentage: number | null }>
  attentionRequired: { type: string; message: string; link?: string; severity: 'high' | 'medium' | 'low' }[]
}

export async function getDepartmentAnalytics(departmentId: string, contextId?: string | null): Promise<AnalyticsData> {
  await requireAuth()

  // 1. Fetch basic overview counts
  const [studentCount, sectionCount, subjectCount, facultyAssignments] = await Promise.all([
    db.student.count({ where: { departmentId } }),
    db.section.count({ where: { departmentId } }),
    db.subject.count({ where: { departmentId } }),
    db.facultyAssignment.findMany({
      where: { courseOffering: { section: { departmentId } } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  // 2. Fetch all offerings in this department to build assessment progress and subject list
  const offerings = await db.courseOffering.findMany({
    where: { 
      section: { departmentId },
      ...(contextId ? { academicContextId: contextId } : {})
    },
    include: {
      subject: true,
      section: true,
      assessments: {
        include: { questions: { include: { studentMarks: true } } }
      }
    }
  })

  // 3. Fetch all marks in this department for performance calculations
  const marks = await db.studentMark.findMany({
    where: {
      assessmentQuestion: {
        assessment: { 
          courseOffering: { 
            section: { departmentId },
            ...(contextId ? { academicContextId: contextId } : {})
          } 
        }
      }
    },
    include: {
      student: true,
      assessmentQuestion: {
        include: {
          courseOutcome: true,
          assessment: {
            include: { courseOffering: { include: { section: true, subject: true } } }
          }
        }
      }
    }
  })

  // Initialize empty structure
  const emptyYear = () => ({ passed: 0, total: 0, percentage: null })
  const emptyCO = () => ({})
  const emptyUT = () => ({})
  
  const data: AnalyticsData = {
    overview: {
      studentCount,
      facultyCount: facultyAssignments.length,
      sectionCount,
      subjectCount,
    },
    results: { 'FY': emptyYear(), 'SY': emptyYear(), 'TY': emptyYear(), 'Final Year': emptyYear() },
    coAttainment: { 'FY': {}, 'SY': {}, 'TY': {}, 'Final Year': {} },
    utPerformance: { 'FY': {}, 'SY': {}, 'TY': {}, 'Final Year': {} },
    subjectPerformance: { 'FY': [], 'SY': [], 'TY': [], 'Final Year': [] },
    assessmentProgress: {
      'FY': { completed: 0, total: 0, percentage: null },
      'SY': { completed: 0, total: 0, percentage: null },
      'TY': { completed: 0, total: 0, percentage: null },
      'Final Year': { completed: 0, total: 0, percentage: null },
    },
    attentionRequired: []
  }

  // --- Aggregate Assessment Progress ---
  for (const offering of offerings) {
    const year = offering.section.year as YearKey
    data.assessmentProgress[year].total += 1
    
    // Check if this offering has marks uploaded
    const hasMarks = offering.assessments.some(a => a.questions.some(q => q.studentMarks.length > 0))
    if (hasMarks) {
      data.assessmentProgress[year].completed += 1
    } else {
      data.attentionRequired.push({
        type: 'MISSING_MARKS',
        message: `${offering.subject.code} (${year} Sec ${offering.section.name}) has no marks uploaded.`,
        severity: 'medium'
      })
    }
  }

  // Calculate progress %
  for (const year of ['FY', 'SY', 'TY', 'Final Year'] as YearKey[]) {
    const prog = data.assessmentProgress[year]
    if (prog.total > 0) prog.percentage = Math.round((prog.completed / prog.total) * 100)
  }

  // --- Process Marks for Results, COs, UTs, Subjects ---
  // To calculate pass/fail, we need to aggregate by student + assessment
  const studentTotals: Record<string, { year: YearKey; obtained: number; max: number }> = {}
  
  // For subject performance aggregation
  const subjectAgg: Record<string, { year: YearKey; subjectName: string; code: string; obtained: number; max: number }> = {}

  for (const mark of marks) {
    if (mark.marksObtained === null) continue;

    const q = mark.assessmentQuestion
    const offering = q.assessment.courseOffering
    const year = offering.section.year as YearKey
    const assessmentName = q.assessment.name // e.g., "Internal Assessment"
    const coCode = q.courseOutcome.code // e.g., "CO1"
    const studentKey = `${mark.studentId}-${q.assessment.id}`
    const subjectKey = `${offering.subjectId}-${year}`

    // 1. Result Performance (Student-Assessment level aggregation)
    if (!studentTotals[studentKey]) {
      studentTotals[studentKey] = { year, obtained: 0, max: 0 }
    }
    studentTotals[studentKey].obtained += mark.marksObtained
    studentTotals[studentKey].max += q.maxMarks

    // 2. CO Attainment
    if (!data.coAttainment[year][coCode]) {
      data.coAttainment[year][coCode] = { attained: 0, total: 0, percentage: null }
    }
    data.coAttainment[year][coCode].total += q.maxMarks
    data.coAttainment[year][coCode].attained += mark.marksObtained

    // 3. UT Performance
    if (!data.utPerformance[year][assessmentName]) {
      data.utPerformance[year][assessmentName] = { obtained: 0, max: 0, percentage: null }
    }
    data.utPerformance[year][assessmentName].obtained += mark.marksObtained
    data.utPerformance[year][assessmentName].max += q.maxMarks

    // 4. Subject Performance
    if (!subjectAgg[subjectKey]) {
      subjectAgg[subjectKey] = { 
        year, 
        subjectName: offering.subject.name, 
        code: offering.subject.code, 
        obtained: 0, max: 0 
      }
    }
    subjectAgg[subjectKey].obtained += mark.marksObtained
    subjectAgg[subjectKey].max += q.maxMarks
  }

  // --- Finalize Result Performance (Passing %) ---
  // A student passes an assessment if they get >= 40%
  for (const val of Object.values(studentTotals)) {
    const passed = (val.obtained / val.max) >= 0.40
    data.results[val.year].total += 1
    if (passed) data.results[val.year].passed += 1
  }
  for (const year of ['FY', 'SY', 'TY', 'Final Year'] as YearKey[]) {
    const res = data.results[year]
    if (res.total > 0) res.percentage = Math.round((res.passed / res.total) * 100)
  }

  // --- Finalize CO Attainment % ---
  for (const year of ['FY', 'SY', 'TY', 'Final Year'] as YearKey[]) {
    for (const coCode in data.coAttainment[year]) {
      const co = data.coAttainment[year][coCode]
      if (co.total > 0) co.percentage = Math.round((co.attained / co.total) * 100)
    }
  }

  // --- Finalize UT Performance % ---
  for (const year of ['FY', 'SY', 'TY', 'Final Year'] as YearKey[]) {
    for (const ut in data.utPerformance[year]) {
      const perf = data.utPerformance[year][ut]
      if (perf.max > 0) perf.percentage = Math.round((perf.obtained / perf.max) * 100)
    }
  }

  // --- Finalize Subject Performance % ---
  for (const key in subjectAgg) {
    const s = subjectAgg[key]
    const percentage = s.max > 0 ? Math.round((s.obtained / s.max) * 100) : null
    data.subjectPerformance[s.year].push({
      subjectName: s.subjectName,
      code: s.code,
      obtained: s.obtained,
      max: s.max,
      percentage
    })
  }

  // Sort subjects by percentage (descending)
  for (const year of ['FY', 'SY', 'TY', 'Final Year'] as YearKey[]) {
    data.subjectPerformance[year].sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
  }

  // Add dummy attention item if empty, to show UI capability
  if (data.attentionRequired.length === 0) {
    data.attentionRequired.push({
      type: 'ALL_CLEAR',
      message: 'All current assessments have been mapped and uploaded.',
      severity: 'low'
    })
  }

  return data
}
