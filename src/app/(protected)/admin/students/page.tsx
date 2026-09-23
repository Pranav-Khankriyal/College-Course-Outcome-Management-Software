import { getAcademicPeriods } from '@/app/actions/academic'
import { db } from '@/lib/db'
import { StudentsClient } from '@/components/features/shared/students-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageLayout } from '@/components/layout/page-layout'

export const metadata = {
  title: 'Student Management | Admin',
}

export default async function AdminStudentsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const departments = await db.department.findMany()
  const academicContexts = await getAcademicPeriods()
  const sections = await db.section.findMany()

  return (
    <PageLayout
      role="ADMIN"
      activeTab="students"
      userName={session.user?.name || 'Admin'}
      userRole="ADMIN"
      breadcrumbs={[{ label: 'Admin' }, { label: 'Student Master' }]}
    >
      <StudentsClient 
        departments={departments}
        academicContexts={academicContexts}
        sections={sections}
        role="ADMIN"
      />
    </PageLayout>
  )
}
