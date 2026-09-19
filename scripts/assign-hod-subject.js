const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'hod.csbs@bvdu.edu.in' } });
  if (!user) {
    console.log('User hod.csbs@bvdu.edu.in not found');
    return;
  }

  // Find an existing CourseOffering in CSBS
  const offering = await prisma.courseOffering.findFirst({
    where: {
      section: {
        department: { code: 'CSBS' }
      }
    },
    include: {
      subject: true,
      section: true,
      academicContext: true
    }
  });

  if (!offering) {
    console.log('No CourseOfferings found in CSBS');
    return;
  }

  // Assign HOD to this offering
  const existingAssignment = await prisma.facultyAssignment.findFirst({
    where: { userId: user.id, courseOfferingId: offering.id }
  });

  if (!existingAssignment) {
    await prisma.facultyAssignment.create({
      data: {
        userId: user.id,
        courseOfferingId: offering.id
      }
    });
    console.log(`Successfully assigned HOD to ${offering.subject.name} (Sec ${offering.section.name}, ${offering.section.year})`);
  } else {
    console.log('HOD is already assigned to a subject');
  }
}

main().finally(() => prisma.$disconnect());
