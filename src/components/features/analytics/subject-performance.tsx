'use client'

import { AnalyticsData, YearKey } from '@/app/actions/analytics'
import { useState } from 'react'
import { YEAR_BG_COLORS, YEAR_COLORS } from './academic-year-legend'

export function SubjectPerformance({ subjectPerformance }: { subjectPerformance: AnalyticsData['subjectPerformance'] }) {
  const years: YearKey[] = ['FY', 'SY', 'TY', 'Final Year']
  const availableYears = years.filter(y => subjectPerformance[y].length > 0)
  
  const [activeYear, setActiveYear] = useState<YearKey | null>(availableYears.length > 0 ? availableYears[0] : null)

  if (!activeYear || availableYears.length === 0) {
    return (
      <div className="py-12 flex items-center justify-center border border-dashed border-border rounded-md">
        <p className="text-sm text-muted-foreground">No subject performance data available</p>
      </div>
    )
  }

  const subjects = subjectPerformance[activeYear]

  return (
    <div className="space-y-4">
      {/* Year Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {availableYears.map(year => (
          <button
            key={year}
            onClick={() => setActiveYear(year)}
            className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
              activeYear === year 
                ? 'bg-secondary text-foreground shadow-sm' 
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Subject Bars */}
      <div className="space-y-3">
        {subjects.map((sub, idx) => (
          <div key={`${sub.code}-${idx}`} className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold text-foreground truncate max-w-[70%]">
                {sub.code} — {sub.subjectName}
              </span>
              <span className="font-semibold text-muted-foreground">
                {sub.percentage !== null ? `${sub.percentage}%` : '—'}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${sub.percentage || 0}%`,
                  backgroundColor: YEAR_COLORS[activeYear] 
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
              {sub.percentage !== null ? `${sub.obtained} / ${sub.max} marks` : 'No marks uploaded'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
