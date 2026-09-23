import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding historical academic contexts...');

  const contexts = [
    { academicYear: '2023-24', semester: 'Even Semester' },
    { academicYear: '2022-23', semester: 'Odd Semester' },
    { academicYear: '2022-23', semester: 'Even Semester' },
    { academicYear: '2021-22', semester: 'Odd Semester' },
    { academicYear: '2021-22', semester: 'Even Semester' },
  ];

  for (const ctx of contexts) {
    const exists = await prisma.academicContext.findFirst({
      where: { academicYear: ctx.academicYear, semester: ctx.semester },
    });

    if (!exists) {
      await prisma.academicContext.create({
        data: {
          academicYear: ctx.academicYear,
          semester: ctx.semester,
        },
      });
      console.log(`Created: ${ctx.academicYear} ${ctx.semester}`);
    } else {
      console.log(`Already exists: ${ctx.academicYear} ${ctx.semester}`);
    }
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
