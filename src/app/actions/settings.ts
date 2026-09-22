'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Settings
export async function getSetting(key: string, departmentId?: string, academicYear?: string) {
  const setting = await db.appSetting.findFirst({
    where: {
      key,
      departmentId: departmentId || null,
      academicYear: academicYear || null,
    },
  })
  return setting
}

export async function saveSetting(key: string, value: string, departmentId?: string, academicYear?: string) {
  const existing = await db.appSetting.findFirst({
    where: {
      key,
      departmentId: departmentId || null,
      academicYear: academicYear || null,
    },
  })

  if (existing) {
    await db.appSetting.update({
      where: { id: existing.id },
      data: { value },
    })
  } else {
    await db.appSetting.create({
      data: {
        key,
        value,
        departmentId: departmentId || null,
        academicYear: academicYear || null,
      },
    })
  }
  revalidatePath('/', 'layout')
  return { success: true }
}

// Sections
export async function getSectionsByYear(departmentId: string, year: string) {
  const sections = await db.section.findMany({
    where: { departmentId, year },
    orderBy: { name: 'asc' },
  })
  return sections
}

export async function addSection(departmentId: string, year: string, name: string) {
  if (!name.trim()) return { error: 'Section name cannot be empty' }
  const existing = await db.section.findFirst({
    where: { departmentId, year, name: name.trim() },
  })
  if (existing) {
    return { error: 'Section already exists' }
  }
  await db.section.create({
    data: { departmentId, year, name: name.trim() },
  })
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteSection(id: string) {
  try {
    await db.section.delete({
      where: { id },
    })
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Cannot delete section. It may be in use.' }
  }
}

// CO Structures
export async function getCustomStructures(departmentIdOrCode?: string) {
  let departmentId = departmentIdOrCode;
  if (departmentIdOrCode) {
    const dept = await db.department.findFirst({
      where: { OR: [{ id: departmentIdOrCode }, { code: departmentIdOrCode }] }
    })
    departmentId = dept?.id || departmentIdOrCode;
  }

  const setting = await db.appSetting.findFirst({
    where: {
      key: 'CUSTOM_CO_STRUCTURES',
      departmentId: departmentId || null,
    }
  })
  if (!setting) return []
  try {
    return JSON.parse(setting.value)
  } catch {
    return []
  }
}

export async function saveCustomStructure(departmentId: string | undefined, structure: any) {
  const customStr = await getCustomStructures(departmentId)
  const existingIdx = customStr.findIndex((s: any) => s.id === structure.id)
  
  if (existingIdx >= 0) {
    customStr[existingIdx] = structure
  } else {
    customStr.push(structure)
  }
  
  await saveSetting('CUSTOM_CO_STRUCTURES', JSON.stringify(customStr), departmentId)
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteCustomStructure(departmentId: string | undefined, structureId: string) {
  let customStr = await getCustomStructures(departmentId)
  customStr = customStr.filter((s: any) => s.id !== structureId)
  await saveSetting('CUSTOM_CO_STRUCTURES', JSON.stringify(customStr), departmentId)
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getActiveStructure(departmentIdOrCode: string, academicYear: string) {
  const dept = await db.department.findFirst({
    where: { OR: [{ id: departmentIdOrCode }, { code: departmentIdOrCode }] }
  })
  const departmentId = dept?.id || departmentIdOrCode;

  const setting = await db.appSetting.findFirst({
    where: {
      key: 'ACTIVE_CO_STRUCTURE',
      departmentId,
      academicYear,
    }
  })
  return setting?.value || 'STRUCTURE_1'
}

export async function setActiveStructure(departmentId: string, academicYear: string, structureId: string) {
  await saveSetting('ACTIVE_CO_STRUCTURE', structureId, departmentId, academicYear)
  revalidatePath('/', 'layout')
  return { success: true }
}
