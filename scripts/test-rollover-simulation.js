import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function getNextAcademicYear(currentYear) {
  const parts = currentYear.split('-');
  if (parts.length === 2) {
    const startYear = parseInt(parts[0], 10);
    const endPart = parts[1];
    const nextStart = startYear + 1;

    if (endPart.length === 2) {
      const nextEnd = (parseInt(endPart, 10) + 1) % 100;
      return `${nextStart}-${nextEnd.toString().padStart(2, '0')}`;
    } else if (endPart.length === 4) {
      const nextEnd = parseInt(endPart, 10) + 1;
      return `${nextStart}-${nextEnd}`;
    }
  }
  return currentYear;
}

async function simulate() {
  console.log('--- Step 1: Starting at 2026-27 Odd Semester ---');
  let current = await prisma.academicContext.findFirst({ where: { status: 'CURRENT' } });
  console.log(`Current is: ${current.academicYear} ${current.semester}`);

  console.log('\n--- Step 2: Simulating Advance to Even Semester ---');
  await prisma.academicContext.update({
    where: { id: current.id },
    data: { status: 'COMPLETED' }
  });
  let even = await prisma.academicContext.findFirst({
    where: { academicYear: current.academicYear, term: 'Even' }
  });
  await prisma.academicContext.update({
    where: { id: even.id },
    data: { status: 'CURRENT' }
  });
  console.log(`Now active: ${even.academicYear} ${even.semester} (2nd semester of ${even.academicYear})`);

  console.log('\n--- Step 3: Simulating 2nd Semester Completion -> Automatic Year Rollover ---');
  // When even semester finishes, calculate next year:
  const nextYear = getNextAcademicYear(even.academicYear);
  console.log(`Next Academic Year calculated: ${nextYear}`);

  // Create next year's Odd and Even contexts:
  await prisma.academicContext.update({
    where: { id: even.id },
    data: { status: 'COMPLETED' }
  });

  const newOdd = await prisma.academicContext.create({
    data: {
      academicYear: nextYear,
      semester: 'Odd Semester',
      term: 'Odd',
      status: 'CURRENT'
    }
  });

  const newEven = await prisma.academicContext.create({
    data: {
      academicYear: nextYear,
      semester: 'Even Semester',
      term: 'Even',
      status: 'UPCOMING'
    }
  });

  console.log(`Successfully created next Academic Year: ${newOdd.academicYear} Odd (CURRENT) & Even (UPCOMING)!`);

  // Verify dropdown would now have 2027-28 as latest!
  const dropdownList = await prisma.academicContext.findMany({
    where: { academicYear: { gte: '2024-25' } },
    orderBy: [{ academicYear: 'desc' }, { term: 'desc' }]
  });
  console.log(`Updated dropdown list count: ${dropdownList.length}`);
  console.log(`New Latest: ${dropdownList[0].academicYear} ${dropdownList[0].semester}`);
  console.log(`Oldest: ${dropdownList[dropdownList.length - 1].academicYear} ${dropdownList[dropdownList.length - 1].semester}`);

  console.log('\n--- Step 4: Cleaning up simulated 2027-28 and restoring 2026-27 Odd as CURRENT ---');
  await prisma.academicContext.delete({ where: { id: newOdd.id } });
  await prisma.academicContext.delete({ where: { id: newEven.id } });

  await prisma.academicContext.updateMany({
    where: { academicYear: '2026-27', term: 'Odd' },
    data: { status: 'CURRENT' }
  });
  await prisma.academicContext.updateMany({
    where: { academicYear: '2026-27', term: 'Even' },
    data: { status: 'UPCOMING' }
  });

  console.log('Restored to 2026-27 Odd (CURRENT), 2026-27 Even (UPCOMING), oldest 2024-25.');
  console.log('Simulation Test PASSED successfully!');
}

simulate()
  .catch(e => { console.error('Simulation error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
