const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bvdu.edu.in' },
    update: {},
    create: {
      email: 'admin@bvdu.edu.in',
      name: 'System Admin',
      hashedPassword,
      role: 'ADMIN',
    },
  })

  const hod = await prisma.user.upsert({
    where: { email: 'hod.cse@bvdu.edu.in' },
    update: {},
    create: {
      email: 'hod.cse@bvdu.edu.in',
      name: 'CSE HOD',
      hashedPassword,
      role: 'HOD',
    },
  })

  const faculty = await prisma.user.upsert({
    where: { email: 'teacher@bvdu.edu.in' },
    update: {},
    create: {
      email: 'teacher@bvdu.edu.in',
      name: 'Demo Faculty',
      hashedPassword,
      role: 'FACULTY',
    },
  })

  const dept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      name: 'Computer Science and Engineering',
      code: 'CSE',
      hodId: hod.id,
    },
  })

  console.log({ admin, hod, faculty, dept })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
