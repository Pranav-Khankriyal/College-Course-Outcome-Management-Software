import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getHodDepartmentOverview, getHodSections, getDepartmentFaculty, getHodSubjects, getHodOwnSubjects } from "@/app/actions/hod"
import { HodDashboardClient } from "./hod-client"

export default async function HodDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  try {
    const [overview, sections, faculty, subjects, ownSubjects] = await Promise.all([
      getHodDepartmentOverview(),
      getHodSections(),
      getDepartmentFaculty(),
      getHodSubjects(),
      getHodOwnSubjects(),
    ])

    return (
      <HodDashboardClient
        overview={overview}
        sections={sections}
        faculty={faculty}
        subjects={subjects}
        ownSubjects={ownSubjects}
        hodName={session.user.name || 'HOD'}
      />
    )
  } catch {
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
}
