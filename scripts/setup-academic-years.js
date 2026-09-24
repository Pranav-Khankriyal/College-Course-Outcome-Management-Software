const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning and configuring Academic Contexts (2024-25 to 2026-27) ---');

  // 1. Delete unused academic contexts prior to 2024-25
  const oldContexts = await prisma.academicContext.findMany({
    where: {
      academicYear: { in: ['2021-22', '2022-23', '2023-24'] }
    },
    include: {
      _count: { select: { courseOfferings: true, sectionEnrollments: true } }
    }
  });

  for (const ctx of oldContexts) {
    if (ctx._count.courseOfferings === 0 && ctx._count.sectionEnrollments === 0) {
      await prisma.academicContext.delete({ where: { id: ctx.id } });
      console.log(`Deleted unused old context: ${ctx.academicYear} ${ctx.semester}`);
    }
  }

  // 2. Define the contexts from 2024-25 to 2026-27
  const contexts = [
    { academicYear: '2024-25', semester: 'Odd Semester', term: 'Odd', status: 'COMPLETED' },
    { academicYear: '2024-25', semester: 'Even Semester', term: 'Even', status: 'COMPLETED' },
    { academicYear: '2025-26', semester: 'Odd Semester', term: 'Odd', status: 'COMPLETED' },
    { academicYear: '2025-26', semester: 'Even Semester', term: 'Even', status: 'COMPLETED' },
    { academicYear: '2026-27', semester: 'Odd Semester', term: 'Odd', status: 'CURRENT' },
    { academicYear: '2026-27', semester: 'Even Semester', term: 'Even', status: 'UPCOMING' },
  ];

  const createdContexts = {};

  for (const ctx of contexts) {
    const existing = await prisma.academicContext.findFirst({
      where: { academicYear: ctx.academicYear, semester: ctx.semester }
    });

    if (existing) {
      const updated = await prisma.academicContext.update({
        where: { id: existing.id },
        data: { term: ctx.term, status: ctx.status }
      });
      createdContexts[`${ctx.academicYear}_${ctx.term}`] = updated;
      console.log(`Updated: ${ctx.academicYear} ${ctx.semester} (${ctx.status})`);
    } else {
      const created = await prisma.academicContext.create({
        data: ctx
      });
      createdContexts[`${ctx.academicYear}_${ctx.term}`] = created;
      console.log(`Created: ${ctx.academicYear} ${ctx.semester} (${ctx.status})`);
    }
  }

  // 3. For 2026-27 Odd Semester (CURRENT), ensure course offerings exist for all department subjects & matching sections
  const currentContext = createdContexts['2026-27_Odd'];
  if (currentContext) {
    const semToYear = {
      1: 'FY', 3: 'SY', 5: 'TY', 7: 'Final Year'
    };

    const subjects = await prisma.subject.findMany({
      include: { department: { include: { sections: true } } }
    });

    let offeringsCount = 0;
    for (const sub of subjects) {
      const targetYear = semToYear[sub.semester] || (sub.semester % 2 !== 0 ? 'FY' : null);
      if (!targetYear) continue; // For Odd semester, only odd semester subjects are actively offered

      const matchingSections = sub.department.sections.filter(s => s.year === targetYear);
      for (const sec of matchingSections) {
        const existing = await prisma.courseOffering.findFirst({
          where: {
            subjectId: sub.id,
            sectionId: sec.id,
            academicContextId: currentContext.id
          }
        });

        if (!existing) {
          await prisma.courseOffering.create({
            data: {
              subjectId: sub.id,
              sectionId: sec.id,
              academicContextId: currentContext.id
            }
          });
          offeringsCount++;
        }
      }
    }
    console.log(`Ensured ${offeringsCount} course offerings for 2026-27 Odd Semester`);
  }

  console.log('Academic contexts configuration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
