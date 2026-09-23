'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as xlsx from 'xlsx'
import { StudentStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

async function requireAdminOrHod(departmentId?: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const user = session.user as { role: string; id: string }
  if (user.role === 'ADMIN') return user
  if (user.role === 'HOD') {
    if (departmentId) {
      const isHodOfDept = await db.department.findFirst({
        where: { id: departmentId, hodId: user.id }
      })
      if (!isHodOfDept) throw new Error('Unauthorized for this department')
    }
    return user
  }
  throw new Error('Unauthorized')
}

export async function getStudents(departmentId: string, academicContextId: string, sectionId?: string) {
  await requireAdminOrHod(departmentId)
  
  const whereClause: Record<string, unknown> = {
    academicContextId,
    section: { departmentId }
  }
  if (sectionId && sectionId !== 'all') {
    whereClause.sectionId = sectionId
  }

  const enrollments = await db.sectionEnrollment.findMany({
    where: whereClause,
    include: {
      student: true,
      section: true,
    },
    orderBy: { rollNumber: 'asc' }
  })

  return enrollments
}

export async function previewStudentImport(
  base64Data: string,
  departmentId: string,
  academicContextId: string,
  sectionId?: string
) {
  await requireAdminOrHod(departmentId)

  const buffer = Buffer.from(base64Data, 'base64')
  const workbook = xlsx.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = xlsx.utils.sheet_to_json(worksheet)

  let newStudents = 0
  let existingStudents = 0
  let duplicatesInFile = 0
  let invalidRows = 0
  const parsedData: { prn: string; name: string; rollNumber: string; email: string; sectionName?: string }[] = []
  const seenPrns = new Set<string>()

  for (const row of jsonData as Record<string, string | number>[]) {
    const prn = String(row['Enrollment Number'] || row['PRN'] || '').trim()
    const name = String(row['Student Name'] || row['Name'] || '').trim()
    const rollNumber = String(row['Roll Number'] || row['Roll No'] || '').trim()
    const email = String(row['Email'] || '').trim()
    const sectionName = String(row['Section'] || '').trim()

    if (!prn || !name || !rollNumber) {
      invalidRows++
      continue
    }

    if (seenPrns.has(prn)) {
      duplicatesInFile++
      continue
    }
    seenPrns.add(prn)

    const existingStudent = await db.student.findUnique({
      where: { prn }
    })

    if (existingStudent) {
      existingStudents++
    } else {
      newStudents++
    }

    parsedData.push({
      prn,
      name,
      rollNumber,
      email,
      sectionName: sectionId ? undefined : sectionName
    })
  }

  return {
    totalRows: jsonData.length,
    newStudents,
    existingStudents,
    duplicatesInFile,
    invalidRows,
    parsedData
  }
}

export async function confirmStudentImport(
  parsedData: { prn: string; name: string; rollNumber: string; email: string; sectionName?: string }[],
  departmentId: string,
  academicContextId: string,
  sectionId?: string
) {
  await requireAdminOrHod(departmentId)

  const sections: Record<string, string> = {}
  
  if (sectionId && sectionId !== 'all') {
    sections['default'] = sectionId
  } else {
    const deptSections = await db.section.findMany({ where: { departmentId } })
    deptSections.forEach(s => sections[s.name.toLowerCase()] = s.id)
  }

  const context = await db.academicContext.findUnique({ where: { id: academicContextId } })
  if (!context) throw new Error('Academic Context not found')

  const admissionYear = context.academicYear.split('-')[0]

  for (const data of parsedData) {
    let targetSectionId = sectionId && sectionId !== 'all' ? sectionId : null;
    
    if (!targetSectionId && data.sectionName) {
      targetSectionId = sections[data.sectionName.toLowerCase()]
      if (!targetSectionId) {
        const newSec = await db.section.create({
          data: { name: data.sectionName, departmentId, year: 'FY' }
        })
        sections[data.sectionName.toLowerCase()] = newSec.id
        targetSectionId = newSec.id
      }
    }

    if (!targetSectionId) throw new Error(`Could not resolve section for student ${data.prn}`)

    const student = await db.student.upsert({
      where: { prn: data.prn },
      update: {
        name: data.name,
        email: data.email || null,
        departmentId,
      },
      create: {
        prn: data.prn,
        name: data.name,
        email: data.email || null,
        departmentId,
        admissionYear,
        status: 'ACTIVE'
      }
    })

    await db.sectionEnrollment.upsert({
      where: {
        studentId_sectionId_academicContextId: {
          studentId: student.id,
          sectionId: targetSectionId,
          academicContextId
        }
      },
      update: {
        rollNumber: data.rollNumber
      },
      create: {
        studentId: student.id,
        sectionId: targetSectionId,
        academicContextId,
        rollNumber: data.rollNumber
      }
    })
  }

  revalidatePath('/admin/students')
  revalidatePath('/hod/students')
  return { success: true }
}

export async function addStudent(data: {
  prn: string, name: string, email: string, rollNumber: string, 
  departmentId: string, academicContextId: string, sectionId: string
}) {
  await requireAdminOrHod(data.departmentId)

  const student = await db.student.upsert({
    where: { prn: data.prn },
    update: { name: data.name, email: data.email },
    create: {
      prn: data.prn,
      name: data.name,
      email: data.email,
      departmentId: data.departmentId,
      status: 'ACTIVE'
    }
  })

  await db.sectionEnrollment.upsert({
    where: {
      studentId_sectionId_academicContextId: {
        studentId: student.id,
        sectionId: data.sectionId,
        academicContextId: data.academicContextId
      }
    },
    update: { rollNumber: data.rollNumber },
    create: {
      studentId: student.id,
      sectionId: data.sectionId,
      academicContextId: data.academicContextId,
      rollNumber: data.rollNumber
    }
  })

  revalidatePath('/admin/students')
  revalidatePath('/hod/students')
  return { success: true }
}

export async function updateStudent(studentId: string, data: { name: string, email: string, status: StudentStatus }) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  await db.student.update({
    where: { id: studentId },
    data: { name: data.name, email: data.email, status: data.status }
  })
  
  revalidatePath('/admin/students')
  revalidatePath('/hod/students')
  return { success: true }
}

export async function getStudentHistory(studentId: string) {
  const enrollments = await db.sectionEnrollment.findMany({
    where: { studentId },
    include: {
      academicContext: true,
      section: true
    },
    orderBy: {
      academicContext: { startDate: 'desc' }
    }
  })
  return enrollments
}
