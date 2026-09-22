export type CoStructureType = 'PREDEFINED_1' | 'PREDEFINED_2' | 'PREDEFINED_3' | 'CUSTOM'

export interface QuestionPattern {
  name: string
  hasAlternative: boolean
}

export interface UtConfig {
  name: string
  unitsCovered: number
  isReUt: boolean
  questions: QuestionPattern[]
}

export interface CoStructure {
  id: string
  name: string
  description: string
  type: CoStructureType
  numberOfUts: number
  uts: UtConfig[]
}

export const PREDEFINED_STRUCTURES: CoStructure[] = [
  {
    id: 'STRUCTURE_1',
    name: 'Structure 1',
    description: '3 UTs, 2 Units per UT. 3 questions with OR alternatives.',
    type: 'PREDEFINED_1',
    numberOfUts: 3,
    uts: [
      {
        name: 'UT1',
        unitsCovered: 2,
        isReUt: false,
        questions: [
          { name: 'Q1', hasAlternative: true },
          { name: 'Q2', hasAlternative: true },
          { name: 'Q3', hasAlternative: true },
        ],
      },
      {
        name: 'UT2',
        unitsCovered: 2,
        isReUt: false,
        questions: [
          { name: 'Q1', hasAlternative: true },
          { name: 'Q2', hasAlternative: true },
          { name: 'Q3', hasAlternative: true },
        ],
      },
      {
        name: 'UT3',
        unitsCovered: 2,
        isReUt: false,
        questions: [
          { name: 'Q1', hasAlternative: true },
          { name: 'Q2', hasAlternative: true },
          { name: 'Q3', hasAlternative: true },
        ],
      },
    ],
  },
  {
    id: 'STRUCTURE_2',
    name: 'Structure 2',
    description: '2 UTs with 3 questions (OR). Re-UT with 6 mandatory questions.',
    type: 'PREDEFINED_2',
    numberOfUts: 3, // Count Re-UT as a UT for configuration purposes
    uts: [
      {
        name: 'UT1',
        unitsCovered: 3,
        isReUt: false,
        questions: [
          { name: 'Q1', hasAlternative: true },
          { name: 'Q2', hasAlternative: true },
          { name: 'Q3', hasAlternative: true },
        ],
      },
      {
        name: 'UT2',
        unitsCovered: 3,
        isReUt: false,
        questions: [
          { name: 'Q1', hasAlternative: true },
          { name: 'Q2', hasAlternative: true },
          { name: 'Q3', hasAlternative: true },
        ],
      },
      {
        name: 'Re-UT',
        unitsCovered: 6,
        isReUt: true,
        questions: [
          { name: 'Q1', hasAlternative: false },
          { name: 'Q2', hasAlternative: false },
          { name: 'Q3', hasAlternative: false },
          { name: 'Q4', hasAlternative: false },
          { name: 'Q5', hasAlternative: false },
          { name: 'Q6', hasAlternative: false },
        ],
      },
    ],
  },
  {
    id: 'STRUCTURE_3',
    name: 'Structure 3',
    description: '2 UTs. Re-UT contains 3 questions (OR) randomly selected from all 6 Units.',
    type: 'PREDEFINED_3',
    numberOfUts: 3,
    uts: [
      {
        name: 'UT1',
        unitsCovered: 3,
        isReUt: false,
        questions: [
          { name: 'Q1', hasAlternative: true },
          { name: 'Q2', hasAlternative: true },
          { name: 'Q3', hasAlternative: true },
        ],
      },
      {
        name: 'UT2',
        unitsCovered: 3,
        isReUt: false,
        questions: [
          { name: 'Q1', hasAlternative: true },
          { name: 'Q2', hasAlternative: true },
          { name: 'Q3', hasAlternative: true },
        ],
      },
      {
        name: 'Re-UT',
        unitsCovered: 6,
        isReUt: true,
        questions: [
          { name: 'Q1', hasAlternative: true },
          { name: 'Q2', hasAlternative: true },
          { name: 'Q3', hasAlternative: true },
        ],
      },
    ],
  },
]

export function getSemesterYearMapping(semesterLabel: string): string {
  if (['Sem 1', 'Sem 2', '1', '2'].includes(semesterLabel)) return 'FY'
  if (['Sem 3', 'Sem 4', '3', '4'].includes(semesterLabel)) return 'SY'
  if (['Sem 5', 'Sem 6', '5', '6'].includes(semesterLabel)) return 'TY'
  if (['Sem 7', 'Sem 8', '7', '8'].includes(semesterLabel)) return 'Final Year'
  return 'FY' // Default
}
