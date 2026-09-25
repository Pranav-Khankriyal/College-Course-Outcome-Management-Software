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

  const yearMatch = currentYear.match(/\d{4}/);
  if (yearMatch) {
    const start = parseInt(yearMatch[0], 10) + 1;
    const end = (start + 1) % 100;
    return `${start}-${end.toString().padStart(2, '0')}`;
  }

  return currentYear;
}

async function testMechanism() {
  console.log('=== TEST 1: getNextAcademicYear ===');
  const tests = [
    { input: '2024-25', expected: '2025-26' },
    { input: '2025-26', expected: '2026-27' },
    { input: '2026-27', expected: '2027-28' },
  ];
  for (const t of tests) {
    const res = getNextAcademicYear(t.input);
    console.log(`Input: ${t.input} -> Result: ${res} (Match: ${res === t.expected})`);
    if (res !== t.expected) throw new Error(`Test failed for ${t.input}`);
  }

  console.log('\n=== TEST 2: Reverse Chronological Dropdown List ===');
  const contexts = await prisma.academicContext.findMany({
    where: { academicYear: { gte: '2024-25' } },
    orderBy: [
      { academicYear: 'desc' },
      { term: 'asc' }
    ]
  });

  const formattedOptions = contexts.map(c => 
    `${c.academicYear} / ${c.semester.replace(' Semester', '')}${c.status === 'CURRENT' ? ' (Current)' : ''}`
  );

  console.log('Dropdown Options (Top to Bottom):');
  formattedOptions.forEach(opt => console.log(` • ${opt}`));

  if (formattedOptions[0] !== '2026-27 / Odd (Current)') {
    throw new Error(`Expected first option to be 2026-27 / Odd (Current), got: ${formattedOptions[0]}`);
  }
  if (formattedOptions[1] !== '2025-26 / Even') {
    throw new Error(`Expected second option to be 2025-26 / Even, got: ${formattedOptions[1]}`);
  }
  if (formattedOptions[formattedOptions.length - 1] !== '2024-25 / Odd') {
    throw new Error(`Expected last option to be 2024-25 / Odd, got: ${formattedOptions[formattedOptions.length - 1]}`);
  }

  console.log('\nAll checks PASSED with 100% precision!');
}

testMechanism()
  .catch(e => { console.error('Test error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
