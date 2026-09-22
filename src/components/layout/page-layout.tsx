'use client'

import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export function PageLayout({
  role,
  activeTab,
  userName,
  userRole,
  breadcrumbs,
  children,
}: {
  role: string
  activeTab: string
  userName: string
  userRole: string
  breadcrumbs: { label: string; href?: string }[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const dashboardPath = role === 'ADMIN' ? '/admin' : role === 'HOD' ? '/hod' : '/faculty'

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role={role}
        activeTab={activeTab}
        onTabChange={() => router.push(dashboardPath)}
        userName={userName}
        userRole={userRole}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header breadcrumbs={breadcrumbs} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
