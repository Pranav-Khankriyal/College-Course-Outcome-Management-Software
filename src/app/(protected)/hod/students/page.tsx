import { getAcademicPeriods } from '@/app/actions/academic'
import { db } from '@/lib/db'
import { StudentsClient } from '@/components/features/shared/students-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageLayout } from '@/components/layout/page-layout'

export const metadata = {
  title: 'Student Management | HOD',
}

export default async function HodStudentsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const user = session.user as any

  const departments = await db.department.findMany({
    where: { hodId: user.id }
  })
  
  if (departments.length === 0) {
    return <div className="p-8 text-slate-500">You are not assigned as HOD for any department.</div>
  }

  const academicContexts = await getAcademicPeriods()
  const sections = await db.section.findMany({
    where: { departmentId: { in: departments.map(d => d.id) } }
  })

  return (
    <PageLayout
      role="HOD"
      activeTab="students"
      userName={user.name || 'HOD'}
      userRole="HOD"
      breadcrumbs={[{ label: 'HOD' }, { label: 'Student Master' }]}
    >
      <StudentsClient 
        departments={departments}
        academicContexts={academicContexts}
        sections={sections}
        initialDepartmentId={departments[0].id}
        role="HOD"
      />
    </PageLayout>
  )
}
