import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Restoring all demo data...\n');

  // ── 1. Create Users ──────────────────────────────────
  const adminPwd = await bcrypt.hash('admin123', 10);
  const hodPwd = await bcrypt.hash('hod123', 10);
  const facultyPwd = await bcrypt.hash('faculty123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@bvdu.edu.in' },
    update: {},
    create: {
      email: 'admin@bvdu.edu.in',
      name: 'Admin',
      hashedPassword: adminPwd,
      role: 'ADMIN',
    },
  });
  console.log('✓ Admin: admin@bvdu.edu.in / admin123');

  const hod = await prisma.user.upsert({
    where: { email: 'hod.csbs@bvdu.edu.in' },
    update: {},
    create: {
      email: 'hod.csbs@bvdu.edu.in',
      name: 'Dr. HOD CSBS',
      hashedPassword: hodPwd,
      role: 'HOD',
    },
  });
  console.log('✓ HOD:   hod.csbs@bvdu.edu.in / hod123');

  const faculty = await prisma.user.upsert({
    where: { email: 'priya@bvdu.edu.in' },
    update: {},
    create: {
      email: 'priya@bvdu.edu.in',
      name: 'Prof. Priya',
      hashedPassword: facultyPwd,
      role: 'FACULTY',
    },
  });
  console.log('✓ Faculty: priya@bvdu.edu.in / faculty123');

  // ── 2. Create Department ─────────────────────────────
  const csbs = await prisma.department.upsert({
    where: { code: 'CSBS' },
    update: { hodId: hod.id },
    create: {
      name: 'Computer Science and Business Systems',
      code: 'CSBS',
      hodId: hod.id,
    },
  });

  // Connect users to department
  await prisma.user.update({
    where: { id: hod.id },
    data: { departments: { connect: { id: csbs.id } } },
  });
  await prisma.user.update({
    where: { id: faculty.id },
    data: { departments: { connect: { id: csbs.id } } },
  });
  console.log('✓ Department: CSBS (HOD assigned)');

  // ── 3. Academic Contexts ─────────────────────────────
  const contexts = [
    { academicYear: '2024-25', semester: 'Even Semester' },
    { academicYear: '2024-25', semester: 'Odd Semester' },
    { academicYear: '2023-24', semester: 'Even Semester' },
    { academicYear: '2023-24', semester: 'Odd Semester' },
    { academicYear: '2022-23', semester: 'Odd Semester' },
    { academicYear: '2022-23', semester: 'Even Semester' },
    { academicYear: '2021-22', semester: 'Odd Semester' },
    { academicYear: '2021-22', semester: 'Even Semester' },
  ];
  for (const ctx of contexts) {
    await prisma.academicContext.upsert({
      where: { academicYear_semester: ctx },
      update: {},
      create: ctx,
    });
  }
  console.log('✓ Academic contexts created');

  // ── 4. Sections ──────────────────────────────────────
  const sectionMap = {};
  for (const s of [
    { year: 'FY', name: 'A' },
    { year: 'SY', name: 'A' },
    { year: 'TY', name: 'A' },
    { year: 'Final Year', name: 'A' },
  ]) {
    let section = await prisma.section.findFirst({
      where: { departmentId: csbs.id, year: s.year, name: s.name },
    });
    if (!section) {
      section = await prisma.section.create({
        data: { departmentId: csbs.id, year: s.year, name: s.name },
      });
    }
    sectionMap[s.year] = section;
  }
  console.log('✓ Sections created');

  // ── 5. Create a few real subjects & offerings ────────
  const currentCtx = await prisma.academicContext.findFirst({
    where: { academicYear: '2024-25', semester: 'Even Semester' },
  });

  const subjectsData = [
    { name: 'Data Structures', code: 'CS201', semester: 3, year: 'SY' },
    { name: 'Operating Systems', code: 'CS301', semester: 4, year: 'SY' },
    { name: 'Computer Networks', code: 'CS302', semester: 4, year: 'SY' },
    { name: 'Database Management', code: 'CS203', semester: 3, year: 'SY' },
    { name: 'Machine Learning', code: 'CS501', semester: 5, year: 'TY' },
  ];

  const offerings = [];
  for (const subData of subjectsData) {
    let subject = await prisma.subject.findFirst({
      where: { code: subData.code, departmentId: csbs.id },
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          name: subData.name,
          code: subData.code,
          semester: subData.semester,
          departmentId: csbs.id,
        },
      });
    }

    const section = sectionMap[subData.year];
    let offering = await prisma.courseOffering.findFirst({
      where: { subjectId: subject.id, sectionId: section.id, academicContextId: currentCtx.id },
    });
    if (!offering) {
      offering = await prisma.courseOffering.create({
        data: {
          subjectId: subject.id,
          sectionId: section.id,
          academicContextId: currentCtx.id,
        },
      });
    }
    offerings.push(offering);

    // Create COs for each offering
    for (let i = 1; i <= 6; i++) {
      await prisma.courseOutcome.upsert({
        where: { courseOfferingId_code: { courseOfferingId: offering.id, code: `CO${i}` } },
        update: {},
        create: {
          courseOfferingId: offering.id,
          code: `CO${i}`,
          description: `Course Outcome ${i} for ${subData.name}`,
        },
      });
    }
  }
  console.log('✓ Subjects & course offerings created (with COs)');

  // ── 6. Assign faculty (Priya) to first 3 subjects, HOD to first one ──
  for (let i = 0; i < Math.min(3, offerings.length); i++) {
    const existing = await prisma.facultyAssignment.findFirst({
      where: { userId: faculty.id, courseOfferingId: offerings[i].id },
    });
    if (!existing) {
      await prisma.facultyAssignment.create({
        data: { userId: faculty.id, courseOfferingId: offerings[i].id },
      });
    }
  }

  // Assign HOD to first offering as faculty too
  const hodExisting = await prisma.facultyAssignment.findFirst({
    where: { userId: hod.id, courseOfferingId: offerings[0].id },
  });
  if (!hodExisting) {
    await prisma.facultyAssignment.create({
      data: { userId: hod.id, courseOfferingId: offerings[0].id },
    });
  }
  console.log('✓ Faculty assignments created');

  // ── 7. Create some students & enroll them ────────────
  const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Diya', 'Ananya', 'Aadhya', 'Saanvi', 'Myra', 'Ira', 'Avni', 'Kavya', 'Riya', 'Navya', 'Pranav', 'Rohan', 'Kabir', 'Rishi', 'Neha', 'Pooja', 'Shruti', 'Ankit', 'Karan', 'Sneha'];
  const lastNames = ['Sharma', 'Patil', 'Deshmukh', 'Joshi', 'Kulkarni', 'Desai', 'Jadhav', 'Pawar', 'Gaikwad', 'Shinde'];

  for (let i = 0; i < 25; i++) {
    const prn = `2024BTECS${String(i + 1).padStart(5, '0')}`;
    let student = await prisma.student.findUnique({ where: { prn } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          prn,
          name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
          departmentId: csbs.id,
        },
      });
    }

    // Enroll in SY section
    const enrollKey = {
      studentId: student.id,
      sectionId: sectionMap['SY'].id,
      academicContextId: currentCtx.id,
    };
    const existingEnrollment = await prisma.sectionEnrollment.findUnique({
      where: { studentId_sectionId_academicContextId: enrollKey },
    });
    if (!existingEnrollment) {
      await prisma.sectionEnrollment.create({
        data: { ...enrollKey, rollNumber: String(i + 1) },
      });
    }
  }
  console.log('✓ 25 students created & enrolled');

  console.log('\n═══════════════════════════════════════');
  console.log('  Demo Data Restored Successfully!');
  console.log('═══════════════════════════════════════');
  console.log('  Admin:   admin@bvdu.edu.in / admin123');
  console.log('  HOD:     hod.csbs@bvdu.edu.in / hod123');
  console.log('  Faculty: priya@bvdu.edu.in / faculty123');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
