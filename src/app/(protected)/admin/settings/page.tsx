import { SettingsClient } from '@/components/features/settings/settings-client'
import { db } from '@/lib/db'

export default async function AdminSettingsPage() {
  const departments = await db.department.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' }
  })

  return (
    <SettingsClient role="ADMIN" departments={departments} />
  )
}
