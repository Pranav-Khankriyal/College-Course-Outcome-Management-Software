import { db } from '@/lib/db'
import { ExcelUpload } from '@/components/features/faculty/excel-upload'
import { ArrowLeft, BookOpen, GraduationCap, Layers, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function HodSubjectPage(props: { params: Promise<{ offeringId: string }> }) {
  const params = await props.params;
  const offeringId = params.offeringId;

  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      subject: true,
      academicContext: true,
      section: {
        include: {
          department: { select: { code: true, name: true } },
        }
      },
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

  if (!offering) notFound()

  // Find students enrolled in this section and academic context
  const enrollments = await db.sectionEnrollment.findMany({
    where: {
      sectionId: offering.sectionId,
      academicContextId: offering.academicContextId
    },
    include: {
      student: {
        include: {
          marks: {
            where: {
              assessmentQuestion: {
                assessment: { courseOfferingId: offeringId }
              }
            },
            include: {
              assessmentQuestion: {
                select: {
                  id: true,
                  questionNumber: true,
                  maxMarks: true,
                  courseOutcome: { select: { code: true } }
                }
              }
            }
          }
        }
      }
    },
    orderBy: { rollNumber: 'asc' }
  })

  // Build CO columns from assessment questions
  const coColumns = offering.assessments.flatMap(a =>
    a.questions.map(q => ({
      code: q.courseOutcome.code,
      maxMarks: q.maxMarks,
      questionId: q.id,
    }))
  ).sort((a, b) => a.code.localeCompare(b.code))

  const hasMarks = enrollments.some(e => e.student.marks.length > 0)

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/hod"
          className="p-1.5 rounded transition-colors duration-150"
          style={{ backgroundColor: 'hsl(220, 17%, 91%)' }}
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground" style={{ letterSpacing: '-0.015em' }}>
            {offering.subject.name}
          </h1>
          <div className="flex items-center gap-2.5 mt-0.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ backgroundColor: 'hsl(221 83% 53% / 0.1)', color: 'hsl(221, 83%, 53%)' }}>
              {offering.subject.code}
            </span>
            <span className="text-[12px] text-muted-foreground flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {offering.section.department.code} · {offering.section.year} · Sec {offering.section.name}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {offering.academicContext.academicYear} · {offering.academicContext.semester}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <GraduationCap className="w-4 h-4" />, value: enrollments.length, label: 'Students', color: 'hsl(221, 83%, 53%)' },
          { icon: <BookOpen className="w-4 h-4" />, value: offering.outcomes.length, label: 'Course Outcomes', color: 'hsl(142, 70%, 40%)' },
          { icon: <BarChart3 className="w-4 h-4" />, value: offering.assessments.length, label: 'Assessments', color: 'hsl(38, 92%, 44%)' },
          {
            icon: <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: hasMarks ? 'hsl(142, 70%, 40%)' : 'hsl(38, 92%, 44%)' }} />,
            value: null,
            label: hasMarks ? 'Marks Uploaded' : 'Pending Upload',
            color: hasMarks ? 'hsl(142, 70%, 40%)' : 'hsl(38, 92%, 44%)',
          },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-md p-3.5">
            <div className="flex items-center gap-2.5">
              <span style={{ color: stat.color }}>{stat.icon}</span>
              <div>
                {stat.value !== null && (
                  <p className="text-xl font-bold text-foreground leading-none">{stat.value}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Excel Upload */}
      <ExcelUpload offeringId={offeringId} />

      {/* Student Marks Table */}
      <div className="glass-card rounded-md">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-foreground">
            Students & Marks <span className="text-muted-foreground font-normal ml-1">({enrollments.length})</span>
          </h2>
        </div>

        {enrollments.length === 0 ? (
          <div className="p-10 text-center">
            <GraduationCap className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No students enrolled yet. Import an Excel file above to add students and marks.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(220, 14%, 87%)' }}>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider w-8">#</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider">Name</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider">Roll No</th>
                  {coColumns.map((co) => (
                    <th key={co.questionId} className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider">
                      {co.code}
                      <span className="block text-[9px] font-normal normal-case tracking-normal opacity-60">/{co.maxMarks}</span>
                    </th>
                  ))}
                  {hasMarks && (
                    <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider">Total</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment, index) => {
                  const marksMap: Record<string, number | null> = {}
                  let total = 0
                  for (const mark of enrollment.student.marks) {
                    const qId = mark.assessmentQuestion.id
                    marksMap[qId] = mark.marksObtained
                    total += mark.marksObtained ?? 0
                  }

                  const getCellStyle = (val: number | null | undefined): React.CSSProperties => {
                    if (val === null || val === undefined) return {}
                    if (val >= 5) return { backgroundColor: 'hsl(142 70% 40% / 0.1)', color: 'hsl(142, 70%, 36%)' }
                    if (val >= 3) return { backgroundColor: 'hsl(38 92% 44% / 0.1)', color: 'hsl(38, 92%, 38%)' }
                    if (val >= 1) return { backgroundColor: 'hsl(25 95% 50% / 0.1)', color: 'hsl(25, 95%, 44%)' }
                    return { backgroundColor: 'hsl(0 72% 51% / 0.1)', color: 'hsl(0, 72%, 48%)' }
                  }

                  return (
                    <tr
                      key={enrollment.id}
                      className="hover:bg-secondary/30 transition-colors duration-100"
                      style={{ borderBottom: '1px solid hsl(220, 14%, 91%)' }}
                    >
                      <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-2.5 text-[13px] font-medium text-foreground">{enrollment.student.name}</td>
                      <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{enrollment.rollNumber}</td>
                      {coColumns.map((co) => {
                        const val = marksMap[co.questionId]
                        return (
                          <td key={co.questionId} className="px-3 py-2.5 text-center">
                            {val !== undefined && val !== null ? (
                              <span
                                className="inline-flex items-center justify-center w-8 h-6 rounded text-[11px] font-semibold"
                                style={getCellStyle(val)}
                              >
                                {val}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30 text-xs">—</span>
                            )}
                          </td>
                        )
                      })}
                      {hasMarks && (
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-[12px] font-bold text-foreground">{total}</span>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
