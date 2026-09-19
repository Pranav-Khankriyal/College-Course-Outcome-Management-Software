import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { FacultyDashboardClient } from "./faculty-client"

export default async function FacultyDashboard() {
  const session = await getServerSession(authOptions)
  
  const assignments = await db.facultyAssignment.findMany({
    where: { userId: session?.user?.id },
    include: {
      courseOffering: {
        include: {
          subject: true,
          academicContext: true,
          section: {
            include: {
              department: { select: { code: true, name: true } },
              _count: { select: { sectionEnrollments: true } },
            }
          },
          _count: { select: { assessments: true } }
        }
      }
    }
  })

  return <FacultyDashboardClient assignments={assignments} />
}
