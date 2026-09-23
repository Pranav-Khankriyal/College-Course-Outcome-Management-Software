import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // --- Users ---
  const adminPassword = await bcrypt.hash('admin123', 12)
  const hodPassword = await bcrypt.hash('hod123', 12)
  const facultyPassword = await bcrypt.hash('faculty123', 12)

  await prisma.user.create({
    data: { email: 'admin@bvdu.edu.in', name: 'Dr. Admin', hashedPassword: adminPassword, role: 'ADMIN' }
  })

  const hodCSBS = await prisma.user.create({
    data: { email: 'hod.csbs@bvdu.edu.in', name: 'Dr. Meena Sharma', hashedPassword: hodPassword, role: 'HOD' }
  })

  const hodAIML = await prisma.user.create({
    data: { email: 'hod.aiml@bvdu.edu.in', name: 'Dr. Rajesh Gupta', hashedPassword: hodPassword, role: 'HOD' }
  })

  const faculty1 = await prisma.user.create({
    data: { email: 'priya@bvdu.edu.in', name: 'Prof. Priya Desai', hashedPassword: facultyPassword, role: 'FACULTY' }
  })

  const faculty2 = await prisma.user.create({
    data: { email: 'ankit@bvdu.edu.in', name: 'Prof. Ankit Joshi', hashedPassword: facultyPassword, role: 'FACULTY' }
  })

  const faculty3 = await prisma.user.create({
    data: { email: 'sneha@bvdu.edu.in', name: 'Prof. Sneha Patil', hashedPassword: facultyPassword, role: 'FACULTY' }
  })

  const faculty4 = await prisma.user.create({
    data: { email: 'rahul@bvdu.edu.in', name: 'Prof. Rahul Mehta', hashedPassword: facultyPassword, role: 'FACULTY' }
  })

  // --- Departments ---
  const csbs = await prisma.department.create({
    data: { name: 'Computer Science & Business Systems', code: 'CSBS', hodId: hodCSBS.id }
  })

  const aiml = await prisma.department.create({
    data: { name: 'Artificial Intelligence & Machine Learning', code: 'AIML', hodId: hodAIML.id }
  })

  const cse = await prisma.department.create({
    data: { name: 'Computer Science & Engineering', code: 'CSE' }
  })

  const it = await prisma.department.create({
    data: { name: 'Information Technology', code: 'IT' }
  })

  // --- Sections (Year-wise) ---
  const years = ['FY', 'SY', 'TY', 'Final Year'] as const
  const sectionNames = ['A', 'B']

  const allSections: Record<string, { id: string; name: string; year: string; departmentId: string }[]> = {}
  for (const dept of [csbs, aiml, cse, it]) {
    allSections[dept.code] = []
    for (const year of years) {
      for (const sec of sectionNames) {
        const section = await prisma.section.create({
          data: { name: sec, year, departmentId: dept.id }
        })
        allSections[dept.code].push(section)
      }
    }
  }

  // --- Academic Context ---
  const ac2025 = await prisma.academicContext.create({
    data: { academicYear: '2025-26', semester: 'Odd' }
  })

  // --- Subjects (for CSBS & AIML, a few per year) ---
  const csbsSubjects = [
    { name: 'Mathematics I', code: 'CSBS101', year: 'FY' },
    { name: 'Physics', code: 'CSBS102', year: 'FY' },
    { name: 'Programming Fundamentals', code: 'CSBS103', year: 'FY' },
    { name: 'Data Structures', code: 'CSBS201', year: 'SY' },
    { name: 'OOP with Java', code: 'CSBS202', year: 'SY' },
    { name: 'Database Management', code: 'CSBS203', year: 'SY' },
    { name: 'Operating Systems', code: 'CSBS301', year: 'TY' },
    { name: 'Computer Networks', code: 'CSBS302', year: 'TY' },
    { name: 'Machine Learning', code: 'CSBS303', year: 'TY' },
    { name: 'Deep Learning', code: 'CSBS401', year: 'Final Year' },
    { name: 'Capstone Project', code: 'CSBS402', year: 'Final Year' },
  ]

  const aimlSubjects = [
    { name: 'Mathematics I', code: 'AIML101', year: 'FY' },
    { name: 'Python Programming', code: 'AIML102', year: 'FY' },
    { name: 'Machine Learning Basics', code: 'AIML201', year: 'SY' },
    { name: 'Deep Learning', code: 'AIML301', year: 'TY' },
    { name: 'Computer Vision', code: 'AIML302', year: 'TY' },
    { name: 'AI Product Design', code: 'AIML401', year: 'Final Year' },
  ]

  // Create subjects and course offerings for CSBS
  for (const sub of csbsSubjects) {
    const subject = await prisma.subject.create({
      data: { name: sub.name, code: sub.code, departmentId: csbs.id }
    })

    // Create course offerings for each section in that year
    const sectionsForYear = allSections['CSBS'].filter(s => s.year === sub.year)
    for (const sec of sectionsForYear) {
      await prisma.courseOffering.create({
        data: {
          subjectId: subject.id,
          academicContextId: ac2025.id,
          sectionId: sec.id,
        }
      })
    }
  }

  // Create subjects for AIML
  for (const sub of aimlSubjects) {
    const subject = await prisma.subject.create({
      data: { name: sub.name, code: sub.code, departmentId: aiml.id }
    })

    const sectionsForYear = allSections['AIML'].filter(s => s.year === sub.year)
    for (const sec of sectionsForYear) {
      await prisma.courseOffering.create({
        data: {
          subjectId: subject.id,
          academicContextId: ac2025.id,
          sectionId: sec.id,
        }
      })
    }
  }

  // --- Faculty Assignments ---
  // Assign faculty1 and faculty2 to some CSBS offerings
  const csbsOfferings = await prisma.courseOffering.findMany({
    where: { section: { departmentId: csbs.id } },
    take: 4,
  })

  if (csbsOfferings[0]) {
    await prisma.facultyAssignment.create({
      data: { userId: faculty1.id, courseOfferingId: csbsOfferings[0].id }
    })
  }
  if (csbsOfferings[1]) {
    await prisma.facultyAssignment.create({
      data: { userId: faculty1.id, courseOfferingId: csbsOfferings[1].id }
    })
  }
  if (csbsOfferings[2]) {
    await prisma.facultyAssignment.create({
      data: { userId: faculty2.id, courseOfferingId: csbsOfferings[2].id }
    })
  }

  // HOD also teaches a subject
  if (csbsOfferings[3]) {
    await prisma.facultyAssignment.create({
      data: { userId: hodCSBS.id, courseOfferingId: csbsOfferings[3].id }
    })
  }

  // Assign faculty3 to AIML
  const aimlOfferings = await prisma.courseOffering.findMany({
    where: { section: { departmentId: aiml.id } },
    take: 2,
  })
  if (aimlOfferings[0]) {
    await prisma.facultyAssignment.create({
      data: { userId: faculty3.id, courseOfferingId: aimlOfferings[0].id }
    })
  }
  if (aimlOfferings[1]) {
    await prisma.facultyAssignment.create({
      data: { userId: faculty4.id, courseOfferingId: aimlOfferings[1].id }
    })
  }

  // --- Some demo students for CSBS FY Sec A ---
  const csbsFYA = allSections['CSBS'].find(s => s.year === 'FY' && s.name === 'A')
  if (csbsFYA) {
    const studentNames = [
      'Aarav Patel', 'Aditi Kulkarni', 'Arjun Nair', 'Diya Sharma', 'Ishaan Reddy',
      'Kavya Iyer', 'Manav Deshmukh', 'Neha Joshi', 'Pranav Bhatt', 'Riya Kapoor',
      'Rohan Singh', 'Sakshi Gupta', 'Tanvi Rao', 'Varun Pillai', 'Zara Khan',
    ]
    for (let i = 0; i < studentNames.length; i++) {
      const student = await prisma.student.create({
        data: {
          prn: `CSBS2025${String(i + 1).padStart(3, '0')}`,
          name: studentNames[i],
          departmentId: csbs.id,
        }
      })
      await prisma.sectionEnrollment.create({
        data: {
          studentId: student.id,
          sectionId: csbsFYA.id,
          academicContextId: ac2025.id,
          rollNumber: `CSBS${String(i + 1).padStart(3, '0')}`,
        }
      })
    }
  }

  console.log('✅ Seed complete!')
  console.log('')
  console.log('Demo Credentials:')
  console.log('  Admin:   admin@bvdu.edu.in / admin123')
  console.log('  HOD CSBS: hod.csbs@bvdu.edu.in / hod123')
  console.log('  HOD AIML: hod.aiml@bvdu.edu.in / hod123')
  console.log('  Faculty: priya@bvdu.edu.in / faculty123')
  console.log('  Faculty: ankit@bvdu.edu.in / faculty123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
