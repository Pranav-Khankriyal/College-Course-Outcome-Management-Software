import { getAcademicPeriods } from '@/app/actions/academic'
import { AcademicPeriodsClient } from '@/components/features/admin/academic-periods-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageLayout } from '@/components/layout/page-layout'

export const metadata = {
  title: 'Academic Periods | Admin',
}

export default async function AcademicPeriodsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const periods = await getAcademicPeriods()

  return (
    <PageLayout
      role="ADMIN"
      activeTab="academic-periods"
      userName={(session.user as any).name || 'Admin'}
      userRole="ADMIN"
      breadcrumbs={[{ label: 'Admin' }, { label: 'Academic Periods' }]}
    >
      <AcademicPeriodsClient initialPeriods={periods} />
    </PageLayout>
  )
}
