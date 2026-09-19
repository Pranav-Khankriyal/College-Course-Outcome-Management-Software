import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const role = (session.user as { role?: string })?.role

  switch (role) {
    case 'ADMIN':
      redirect('/admin')
    case 'HOD':
      redirect('/hod')
    default:
      redirect('/faculty')
  }
}
