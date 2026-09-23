import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Starting student data wipe...')

  try {
    // 1. Delete all StudentMarks
    const marksRes = await prisma.studentMark.deleteMany({})
    console.log(`Deleted ${marksRes.count} StudentMark records.`)

    // 2. Delete all InternalAssessments
    const internalRes = await prisma.internalAssessment.deleteMany({})
    console.log(`Deleted ${internalRes.count} InternalAssessment records.`)

    // 3. Delete all SectionEnrollments
    const enrollRes = await prisma.sectionEnrollment.deleteMany({})
    console.log(`Deleted ${enrollRes.count} SectionEnrollment records.`)

    // 4. Delete all Students
    const studentRes = await prisma.student.deleteMany({})
    console.log(`Deleted ${studentRes.count} Student records.`)

    console.log('Successfully wiped all student data.')
  } catch (e) {
    console.error('Error wiping data:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
