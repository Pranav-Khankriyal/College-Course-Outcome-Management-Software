const xlsx = require('xlsx');
const fs = require('fs');

const generateMockExcel = () => {
  const data = [
    [], // Row 1 (index 0)
    ['Subject Incharge: Dr. Gayatri Hegde', '', '', '', 'Sem : 4', '', 'AY : 2025-26'], // Row 2
    ['Course Name: Database Management Systems', '', '', '', 'Odd/Even : Even'], // Row 3
    ['Assessment Sheet for UNIT Test-I'], // Row 4
    ['Questions aligned to Course outcomes and marks obtained', '', '', '', '', '', '', 'Course Outcome Attainment\r\nwith target in %'], // Row 5
    ['S.No.', 'PRN', 'Course outcomes -->', 'CO1', 'CO2', 'CO3', 'Total', 'CO1', 'CO2', 'CO3', 'AVG CO'], // Row 6
    ['', '', '', 'Q.1', 'Q.2', 'Q.3'], // Row 7
    ['', '', 'Distribution of Marks-->', 7, 7, 6, 20], // Row 8
    ['', '', 'Set Target Level- Level 3', '80%'], // Row 9
    ['', '', 'Level 2', '70%'], // Row 10
    ['', '', 'Level 1', '60%'], // Row 11
  ];

  // Generate 30 mock students
  for (let i = 1; i <= 30; i++) {
    const prn = `PRN2025${String(i).padStart(3, '0')}`;
    
    // Generate random realistic marks for Q1(7), Q2(7), Q3(6)
    const q1 = Math.floor(Math.random() * 8); // 0-7
    const q2 = Math.floor(Math.random() * 8); // 0-7
    const q3 = Math.floor(Math.random() * 7); // 0-6
    
    const total = q1 + q2 + q3;

    // The other columns (CO attainment metrics) can just be dummy values for now 
    // as the backend usually recalculates these or expects them.
    const co1Attain = q1 >= 4 ? 3 : (q1 >= 3 ? 2 : (q1 >= 1 ? 1 : 0));
    const co2Attain = q2 >= 4 ? 3 : (q2 >= 3 ? 2 : (q2 >= 1 ? 1 : 0));
    const co3Attain = q3 >= 3 ? 3 : (q3 >= 2 ? 2 : (q3 >= 1 ? 1 : 0));
    const avgCo = parseFloat(((co1Attain + co2Attain + co3Attain) / 3).toFixed(2));

    data.push([
      i,          // S.No.
      prn,        // PRN
      '',         // Course outcomes --> (empty for student rows)
      q1,         // CO1 (Q.1 marks)
      q2,         // CO2 (Q.2 marks)
      q3,         // CO3 (Q.3 marks)
      total,      // Total
      co1Attain,  // CO1 Target
      co2Attain,  // CO2 Target
      co3Attain,  // CO3 Target
      avgCo       // AVG CO
    ]);
  }

  // Add 1 absentee to test "A"
  data.push([
    31,
    `PRN2025031`,
    '',
    'A', 'A', 'A', 'A', 0, 0, 0, 0
  ]);

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(data);

  // Set column widths for better visual readability
  ws['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 15 }, // PRN
    { wch: 25 }, // Course outcomes -->
    { wch: 8 },  // CO1
    { wch: 8 },  // CO2
    { wch: 8 },  // CO3
    { wch: 8 },  // Total
    { wch: 8 },  // CO1 Target
    { wch: 8 },  // CO2 Target
    { wch: 8 },  // CO3 Target
    { wch: 10 }  // AVG CO
  ];

  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  const filePath = '../Mock_UT_Assessment_30_Students.xlsx';
  xlsx.writeFile(wb, filePath);
  
  console.log(`Successfully generated ${filePath} with 31 rows (30 students + 1 absent).`);
};

generateMockExcel();
