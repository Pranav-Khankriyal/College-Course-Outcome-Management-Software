import { getAcademicPeriods } from '@/app/actions/academic'
import { db } from '@/lib/db'
import { PromotionClient } from '@/components/features/admin/promotion-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageLayout } from '@/components/layout/page-layout'

export const metadata = {
  title: 'Semester Promotion | Admin',
}

export default async function AdminPromotionPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const departments = await db.department.findMany()
  const academicContexts = await getAcademicPeriods()
  const sections = await db.section.findMany()

  return (
    <PageLayout
      role="ADMIN"
      activeTab="promotion"
      userName={(session.user as any).name || 'Admin'}
      userRole="ADMIN"
      breadcrumbs={[{ label: 'Admin' }, { label: 'Semester Promotion' }]}
    >
      <PromotionClient 
        departments={departments}
        academicContexts={academicContexts}
        sections={sections}
        role="ADMIN"
      />
    </PageLayout>
  )
}
