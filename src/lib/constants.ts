export interface Teacher {
  email: string;
  password: string;
  name: string;
}

export interface Student {
  id: string;
  department: string;
  course: string;
  semester: string;
  subject: string;
  name: string;
  rollNumber: string;
  co1: number;
  co2: number;
  co3: number;
  co4: number;
  co5: number;
  co6: number;
  timestamp: number;
}

export const DEPARTMENTS = ['CSBS', 'AIML', 'CSE', 'IT'] as const;

export const COURSES: Record<string, string[]> = {
  CSBS: ['2018', '2021', '2023'],
  AIML: ['2021'],
  CSE: ['2021'],
  IT: ['2021'],
};

export const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];

const SUBJECTS_MAP: Record<string, Record<string, string[]>> = {
  CSBS: {
    'Sem 1': ['Mathematics I', 'Physics', 'Basic Electrical Engg', 'Programming Fundamentals', 'Engineering Graphics', 'Communication Skills'],
    'Sem 2': ['Mathematics II', 'Chemistry', 'Data Structures', 'Digital Electronics', 'Environmental Studies', 'Workshop Practice'],
    'Sem 3': ['Discrete Mathematics', 'OOP with Java', 'Computer Organization', 'Business Analytics', 'Database Management', 'Probability & Statistics'],
    'Sem 4': ['Operating Systems', 'Software Engineering', 'Computer Networks', 'Business Intelligence', 'Web Technologies', 'Organizational Behavior'],
    'Sem 5': ['Machine Learning', 'Cloud Computing', 'Information Security', 'Business Process Mgmt', 'Data Warehousing', 'Project Management'],
    'Sem 6': ['Deep Learning', 'Big Data Analytics', 'Blockchain Technology', 'Digital Marketing', 'IoT Applications', 'Entrepreneurship'],
    'Sem 7': ['NLP', 'DevOps Practices', 'Cyber Security', 'Business Strategy', 'Capstone Project I', 'Professional Ethics'],
    'Sem 8': ['AI for Business', 'Distributed Systems', 'IT Governance', 'Innovation Management', 'Capstone Project II', 'Seminar'],
  },
  AIML: {
    'Sem 1': ['Mathematics I', 'Physics', 'Basic Electronics', 'Python Programming', 'Engineering Graphics', 'Communication Skills'],
    'Sem 2': ['Mathematics II', 'Chemistry', 'Data Structures', 'Digital Logic Design', 'Environmental Science', 'Workshop Practice'],
    'Sem 3': ['Linear Algebra', 'OOP with Java', 'Computer Architecture', 'Probability & Statistics', 'DBMS', 'Discrete Mathematics'],
    'Sem 4': ['Operating Systems', 'Machine Learning Basics', 'Computer Networks', 'Algorithms Design', 'Web Development', 'Numerical Methods'],
    'Sem 5': ['Deep Learning', 'Computer Vision', 'NLP Fundamentals', 'Reinforcement Learning', 'Data Mining', 'Software Engineering'],
    'Sem 6': ['Advanced ML', 'Generative AI', 'Robotics', 'Big Data Processing', 'Cloud AI Services', 'Research Methodology'],
    'Sem 7': ['AI Ethics', 'Edge AI', 'MLOps', 'Autonomous Systems', 'Capstone Project I', 'Technical Writing'],
    'Sem 8': ['AI Product Design', 'Federated Learning', 'AI in Healthcare', 'Quantum Computing', 'Capstone Project II', 'Seminar'],
  },
  CSE: {
    'Sem 1': ['Mathematics I', 'Physics', 'Basic Electrical Engg', 'C Programming', 'Engineering Graphics', 'English Communication'],
    'Sem 2': ['Mathematics II', 'Chemistry', 'Data Structures in C', 'Digital Electronics', 'Environmental Studies', 'Workshop Practice'],
    'Sem 3': ['Discrete Structures', 'OOP with C++', 'Computer Organization', 'DBMS', 'Probability & Statistics', 'Data Communication'],
    'Sem 4': ['Operating Systems', 'Theory of Computation', 'Computer Networks', 'Algorithm Analysis', 'Microprocessors', 'Software Engineering'],
    'Sem 5': ['Compiler Design', 'AI & ML', 'Information Security', 'Web Engineering', 'Mobile App Dev', 'Elective I'],
    'Sem 6': ['Distributed Computing', 'Data Science', 'Cloud Computing', 'IoT Systems', 'Software Testing', 'Elective II'],
    'Sem 7': ['High Performance Computing', 'Blockchain', 'DevOps Engineering', 'Cyber Forensics', 'Capstone Project I', 'Elective III'],
    'Sem 8': ['Quantum Computing', 'AR/VR Technologies', 'Green Computing', 'Tech Entrepreneurship', 'Capstone Project II', 'Seminar'],
  },
  IT: {
    'Sem 1': ['Mathematics I', 'Physics', 'Basic Electronics', 'Programming in C', 'Engineering Drawing', 'Soft Skills'],
    'Sem 2': ['Mathematics II', 'Chemistry', 'Data Structures', 'Digital Circuits', 'Environmental Science', 'Workshop'],
    'Sem 3': ['Discrete Mathematics', 'Java Programming', 'Computer Architecture', 'DBMS', 'Statistics', 'Unix Programming'],
    'Sem 4': ['Operating Systems', 'Software Engineering', 'Network Fundamentals', 'Algorithm Design', 'Web Technologies', 'IT Infrastructure'],
    'Sem 5': ['Information Security', 'Cloud Services', 'Data Analytics', 'Mobile Computing', 'ERP Systems', 'Elective I'],
    'Sem 6': ['Machine Learning', 'Big Data Technologies', 'Network Security', 'DevOps', 'UI/UX Design', 'Elective II'],
    'Sem 7': ['AI Applications', 'Blockchain Tech', 'IT Service Mgmt', 'Digital Transformation', 'Capstone Project I', 'Elective III'],
    'Sem 8': ['Advanced Cloud Arch', 'Cyber Security Ops', 'IT Governance', 'Innovation Lab', 'Capstone Project II', 'Seminar'],
  },
};

export function getSubjects(dept: string, semester: string): string[] {
  return SUBJECTS_MAP[dept]?.[semester] || [];
}

export const CO_CONFIG = [
  { key: 'co1' as const, label: 'CO1', max: 6, unit: 1 },
  { key: 'co2' as const, label: 'CO2', max: 6, unit: 1 },
  { key: 'co3' as const, label: 'CO3', max: 7, unit: 1 },
  { key: 'co4' as const, label: 'CO4', max: 6, unit: 2 },
  { key: 'co5' as const, label: 'CO5', max: 6, unit: 2 },
  { key: 'co6' as const, label: 'CO6', max: 7, unit: 2 },
];

export function getLevel(marks: number): { level: number; color: string; label: string } {
  if (marks >= 5) return { level: 3, color: 'level-3', label: 'Level 3' };
  if (marks >= 3) return { level: 2, color: 'level-2', label: 'Level 2' };
  if (marks >= 1) return { level: 1, color: 'level-1', label: 'Level 1' };
  return { level: 0, color: 'level-0', label: 'Level 0' };
}

export function getAverageLevel(student: Student): number {
  const total = student.co1 + student.co2 + student.co3 + student.co4 + student.co5 + student.co6;
  const avg = total / 6;
  return Math.round(avg * 10) / 10;
}
