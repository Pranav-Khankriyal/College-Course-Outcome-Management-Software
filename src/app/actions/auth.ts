'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function changePassword(newPassword: string) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return { error: 'Unauthorized' }
  }

  const userId = (session.user as { id: string }).id
  if (!userId) {
    return { error: 'Unauthorized' }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await db.user.update({
    where: { id: userId },
    data: {
      hashedPassword,
      mustChangePassword: false,
    },
  })

  return { success: true }
}
