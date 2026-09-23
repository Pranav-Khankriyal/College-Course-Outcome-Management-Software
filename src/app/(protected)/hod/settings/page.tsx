import { SettingsClient } from '@/components/features/settings/settings-client'
import { getHodDepartmentOverview } from '@/app/actions/hod'
import { redirect } from 'next/navigation'

export default async function HODSettingsPage() {
  let overview;
  try {
    overview = await getHodDepartmentOverview();
  } catch {
    redirect('/login')
  }

  if (!overview || !overview.department) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-medium">
          No Department Assigned. You cannot manage settings.
        </div>
      </div>
    )
  }

  return (
    <SettingsClient role="HOD" departmentId={overview.department.id} />
  )
}
