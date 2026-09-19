'use client'

import { YearKey } from '@/app/actions/analytics'

export const YEAR_COLORS: Record<YearKey, string> = {
  'FY': 'hsl(217, 91%, 60%)',        // Blue
  'SY': 'hsl(160, 84%, 39%)',        // Emerald
  'TY': 'hsl(37, 90%, 51%)',         // Orange
  'Final Year': 'hsl(262, 80%, 55%)' // Violet
}

export const YEAR_BG_COLORS: Record<YearKey, string> = {
  'FY': 'hsl(217, 91%, 60%, 0.1)',
  'SY': 'hsl(160, 84%, 39%, 0.1)',
  'TY': 'hsl(37, 90%, 51%, 0.1)',
  'Final Year': 'hsl(262, 80%, 55%, 0.1)'
}

export function AcademicYearLegend() {
  const years: YearKey[] = ['FY', 'SY', 'TY', 'Final Year']
  
  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-6">
      {years.map(year => (
        <div key={year} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: YEAR_COLORS[year] }}
          />
          <span className="text-[12px] font-medium text-foreground tracking-tight">
            {year}
          </span>
        </div>
      ))}
    </div>
  )
}
