import {
  getAdminStats, getDepartmentsWithDetails, getAllUsers, getAcademicContexts,
} from '@/app/actions/admin'
import { AdminDashboardClient } from './admin-client'

export default async function AdminDashboard() {
  const [stats, departments, users, academicContexts] = await Promise.all([
    getAdminStats(),
    getDepartmentsWithDetails(),
    getAllUsers(),
    getAcademicContexts(),
  ])

  return (
    <AdminDashboardClient
      stats={stats}
      departments={departments}
      users={users}
      academicContexts={academicContexts}
    />
  )
}
