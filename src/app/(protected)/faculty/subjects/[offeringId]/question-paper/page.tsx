import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { QuestionPaperForm, RecentQuestionPapers } from '@/components/features/faculty/question-paper-form'
import { getRecentQuestionPapers } from '@/app/actions/question-paper'
import { InfoTooltip } from '@/components/ui/info-tooltip'

export default async function QuestionPaperPage(props: { params: Promise<{ offeringId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user.role !== 'FACULTY' && session.user.role !== 'HOD')) {
    redirect('/login')
  }

  const params = await props.params
  const offeringId = params.offeringId

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
    }
  })

  if (!offering) notFound()

  const recentPapers = await getRecentQuestionPapers(offeringId)

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3 no-print">
        <Link
          href={`/faculty/subjects/${offeringId}`}
          className="p-1.5 rounded transition-colors duration-150"
          style={{ backgroundColor: 'hsl(220, 17%, 91%)' }}
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground" style={{ letterSpacing: '-0.015em' }}>
              Create Question Paper
            </h1>
            <InfoTooltip content="Create a unit test question paper using the official template. The Course Outcomes (COs) you assign to each question here get mapped to the assessment criteria — this is what drives CO attainment analysis. The question structure (number of questions, OR pattern) is determined by the CO Structure selected in Settings." />
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ backgroundColor: 'hsl(221 83% 53% / 0.1)', color: 'hsl(221, 83%, 53%)' }}>
              {offering.subject.code}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {offering.subject.name} · {offering.section.department.code} · {offering.section.year} · Sec {offering.section.name}
            </span>
          </div>
        </div>
      </div>

      {/* Question Paper Form */}
      <QuestionPaperForm
        offeringId={offeringId}
        subjectName={offering.subject.name}
        subjectCode={offering.subject.code}
        departmentCode={offering.section.department.code}
        semester={`Sem ${offering.subject.semester}`}
        academicYear={offering.academicContext.academicYear}
        semesterLabel={offering.academicContext.semester}
        outcomes={offering.outcomes.map(o => ({ code: o.code, id: o.id }))}
      />

      {/* Recently Generated Papers */}
      <div className="no-print">
        <RecentQuestionPapers papers={recentPapers} />
      </div>
    </div>
  )
}
