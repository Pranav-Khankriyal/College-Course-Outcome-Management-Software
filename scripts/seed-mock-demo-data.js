import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Diya', 'Ananya', 'Aadhya', 'Saanvi', 'Myra', 'Ira', 'Avni', 'Kavya', 'Riya', 'Navya', 'Pranav', 'Rohan', 'Kabir', 'Rishi', 'Neha', 'Pooja', 'Shruti', 'Ankit', 'Karan', 'Sneha'];
const lastNames = ['Sharma', 'Patil', 'Deshmukh', 'Joshi', 'Kulkarni', 'Desai', 'Jadhav', 'Pawar', 'Gaikwad', 'Shinde', 'Rao', 'Iyer', 'Reddy', 'Singh', 'Kapoor', 'Kumar', 'Das', 'Sen', 'Bose', 'Gupta'];

function getRandomName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

async function main() {
  console.log('Starting massive mock data generation for CSBS...');

  // 1. Get CSBS Department
  const csbs = await prisma.department.findFirst({
    where: { code: 'CSBS' }
  });
  if (!csbs) {
    throw new Error('CSBS department not found!');
  }

  // 2. Fetch Academic Contexts
  const contexts = await prisma.academicContext.findMany({
    orderBy: { academicYear: 'desc' }
  });

  // 3. Ensure Sections Exist
  const sectionNames = [
    { year: 'FY', name: 'A' },
    { year: 'SY', name: 'A' },
    { year: 'TY', name: 'A' },
    { year: 'Final Year', name: 'A' }
  ];
  const sectionMap = {};
  for (const s of sectionNames) {
    let section = await prisma.section.findFirst({
      where: { departmentId: csbs.id, year: s.year, name: s.name }
    });
    if (!section) {
      section = await prisma.section.create({
        data: { departmentId: csbs.id, year: s.year, name: s.name }
      });
    }
    sectionMap[s.year] = section;
  }

  // 4. Create Faculty
  console.log('Generating faculty...');
  const facultyList = [];
  const pwd = await bcrypt.hash('faculty123', 10);
  for (let i = 1; i <= 10; i++) {
    const email = `faculty${i}@mock.edu`;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: `Prof. ${getRandomName()}`,
          email,
          hashedPassword: pwd,
          role: 'FACULTY',
          isActive: true,
          departments: { connect: { id: csbs.id } }
        }
      });
    }
    facultyList.push(user);
  }

  // 5. Generate Students globally (30 per year)
  console.log('Generating students globally...');
  const allStudents = {}; // year -> student[]
  for (const year of ['FY', 'SY', 'TY', 'Final Year']) {
    allStudents[year] = [];
    for (let i = 1; i <= 30; i++) {
      const prn = `202${Math.floor(Math.random() * 9)}BTECS${Math.floor(Math.random() * 90000) + 10000}`;
      let student = await prisma.student.findUnique({ where: { prn } });
      if (!student) {
        student = await prisma.student.create({
          data: {
            prn,
            name: getRandomName(),
            departmentId: csbs.id,
          }
        });
      }
      allStudents[year].push(student);
    }
  }

  // 6. Iterate through Contexts and populate
  for (const ctx of contexts) {
    console.log(`\n--- Populating Context: ${ctx.academicYear} ${ctx.semester} ---`);
    const isOdd = ctx.semester.toLowerCase().includes('odd');
    
    // Determine which semesters to populate
    const sems = isOdd ? [1, 3, 5, 7] : [2, 4, 6, 8];
    const yearMapping = {
      1: 'FY', 2: 'FY',
      3: 'SY', 4: 'SY',
      5: 'TY', 6: 'TY',
      7: 'Final Year', 8: 'Final Year'
    };

    for (const sem of sems) {
      const year = yearMapping[sem];
      const section = sectionMap[year];
      console.log(`  Populating Semester ${sem} (${year})`);

      // Create/Get Subjects
      for (let subIdx = 1; subIdx <= 5; subIdx++) {
        const subCode = `CSBS${sem}0${subIdx}`;
        let subject = await prisma.subject.findFirst({
          where: { code: subCode, departmentId: csbs.id }
        });
        if (!subject) {
          subject = await prisma.subject.create({
            data: {
              code: subCode,
              name: `Mock Subject ${sem}.${subIdx}`,
              semester: sem,
              departmentId: csbs.id
            }
          });
        }

        // Create Course Offering
        let offering = await prisma.courseOffering.findFirst({
          where: { subjectId: subject.id, sectionId: section.id, academicContextId: ctx.id }
        });
        if (!offering) {
          offering = await prisma.courseOffering.create({
            data: { subjectId: subject.id, sectionId: section.id, academicContextId: ctx.id }
          });
        }

        // Assign Random Faculty
        const randomFaculty = facultyList[Math.floor(Math.random() * facultyList.length)];
        const existingAssignment = await prisma.facultyAssignment.findFirst({
          where: { userId: randomFaculty.id, courseOfferingId: offering.id }
        });
        if (!existingAssignment) {
          await prisma.facultyAssignment.create({
            data: { userId: randomFaculty.id, courseOfferingId: offering.id }
          });
        }

        // Create Course Outcomes (CO1 to CO6)
        const cos = [];
        for (let i = 1; i <= 6; i++) {
          let co = await prisma.courseOutcome.findFirst({
            where: { courseOfferingId: offering.id, code: `CO${i}` }
          });
          if (!co) {
            co = await prisma.courseOutcome.create({
              data: { courseOfferingId: offering.id, code: `CO${i}`, description: `Mock CO ${i}` }
            });
          }
          cos.push(co);
        }

        // Create Assessments
        const assessmentsToCreate = ['Internal Assessment 1', 'Internal Assessment 2'];
        for (const assName of assessmentsToCreate) {
          let assessment = await prisma.assessment.findFirst({
            where: { courseOfferingId: offering.id, name: assName }
          });
          if (!assessment) {
            assessment = await prisma.assessment.create({
              data: { courseOfferingId: offering.id, name: assName }
            });
          }

          // Create Assessment Questions mapped to COs
          const qs = [];
          for (let i = 0; i < 6; i++) {
            let q = await prisma.assessmentQuestion.findFirst({
              where: { assessmentId: assessment.id, courseOutcomeId: cos[i].id }
            });
            if (!q) {
              q = await prisma.assessmentQuestion.create({
                data: {
                  assessmentId: assessment.id,
                  courseOutcomeId: cos[i].id,
                  questionNumber: i + 1,
                  maxMarks: Math.floor(Math.random() * 4) + 4 // Random max marks 4-7
                }
              });
            }
            qs.push(q);
          }

          // Enroll students and populate marks
          const students = allStudents[year];
          let rollNo = 1;
          for (const student of students) {
            // Enroll
            const enrollKey = { studentId: student.id, sectionId: section.id, academicContextId: ctx.id };
            let enrollment = await prisma.sectionEnrollment.findUnique({ where: { studentId_sectionId_academicContextId: enrollKey } });
            if (!enrollment) {
              enrollment = await prisma.sectionEnrollment.create({
                data: { ...enrollKey, rollNumber: String(rollNo++) }
              });
            }

            // Create Marks
            for (const q of qs) {
              const markKey = { studentId: student.id, assessmentQuestionId: q.id };
              const existingMark = await prisma.studentMark.findUnique({ where: { studentId_assessmentQuestionId: markKey } });
              if (!existingMark) {
                // 90% chance to attend, random marks up to maxMarks
                const attended = Math.random() > 0.1;
                const obtained = attended ? Math.floor(Math.random() * (q.maxMarks + 1)) : 0;
                
                await prisma.studentMark.create({
                  data: { ...markKey, marksObtained: obtained, isAbsent: !attended }
                });
              }
            }
          }
        }
      }
    }
  }

  console.log('\nSUCCESS! Massive mock data generation complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
