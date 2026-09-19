import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getHodDepartmentOverview, getHodSections, getDepartmentFaculty, getHodSubjects, getHodOwnSubjects } from "@/app/actions/hod"
import { getDepartmentAnalytics } from "@/app/actions/analytics"
import { HodDashboardClient } from "./hod-client"

import { db } from "@/lib/db"

export default async function HodDashboard(props: {
  searchParams: Promise<{ context?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const searchParams = await props.searchParams
  const contextId = searchParams.context || null

  let data = null;

  try {
    // Fetch contexts for the dropdown
    const academicContexts = await db.academicContext.findMany({
      orderBy: { academicYear: 'desc' }
    })
    const activeContext = contextId 
      ? academicContexts.find(c => c.id === contextId) 
      : academicContexts[0]
      
    const activeContextId = activeContext?.id || null

    const [overview, sections, faculty, subjects, ownSubjects] = await Promise.all([
      getHodDepartmentOverview(),
      getHodSections(activeContextId),
      getDepartmentFaculty(),
      getHodSubjects(),
      getHodOwnSubjects(),
    ])

    const analytics = await getDepartmentAnalytics(overview.department.id, activeContextId)

    data = { overview, sections, faculty, subjects, ownSubjects, analytics, academicContexts, activeContextId }
  } catch (error) {
    console.error(error)
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card-strong rounded-2xl p-8 text-center max-w-md">
          <h1 className="text-xl font-bold mb-2">No Department Assigned</h1>
          <p className="text-sm text-muted-foreground">
            You have not been assigned as HOD to any department yet. Please contact the administrator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <HodDashboardClient
      overview={data.overview}
      sections={data.sections}
      faculty={data.faculty}
      subjects={data.subjects}
      ownSubjects={data.ownSubjects}
      analytics={data.analytics}
      hodName={session.user.name || 'HOD'}
      academicContexts={data.academicContexts}
      activeContextId={data.activeContextId}
    />
  )
}
