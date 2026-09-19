'use client'

import { AnalyticsData, YearKey } from '@/app/actions/analytics'
import { YEAR_BG_COLORS, YEAR_COLORS } from './academic-year-legend'

export function CoAttainmentTable({ coAttainment }: { coAttainment: AnalyticsData['coAttainment'] }) {
  const years: YearKey[] = ['FY', 'SY', 'TY', 'Final Year']
  const allCos = new Set<string>()

  // Collect all unique COs across all years
  years.forEach(year => {
    Object.keys(coAttainment[year] || {}).forEach(co => allCos.add(co))
  })

  const sortedCos = Array.from(allCos).sort()

  if (sortedCos.length === 0) {
    return (
      <div className="py-12 flex items-center justify-center border border-dashed border-border rounded-md">
        <p className="text-sm text-muted-foreground">No CO attainment data available</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="px-5 py-4 text-left font-semibold text-[12px] uppercase tracking-wider text-muted-foreground border-b border-black/5 dark:border-white/5">
              Outcome
            </th>
            {years.map(year => (
              <th 
                key={year} 
                className="px-5 py-4 text-center font-semibold text-[12px] uppercase tracking-wider border-b border-black/5 dark:border-white/5"
                style={{ color: YEAR_COLORS[year] }}
              >
                {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedCos.map((co, idx) => (
            <tr key={co} className={idx !== sortedCos.length - 1 ? "border-b border-black/5 dark:border-white/5" : ""}>
              <td className="px-5 py-4 font-semibold text-[13px] text-foreground">
                {co}
              </td>
              {years.map(year => {
                const data = coAttainment[year]?.[co]
                const val = data?.percentage

                return (
                  <td key={`${co}-${year}`} className="px-5 py-4 text-center">
                    {val !== null && val !== undefined ? (
                      <span 
                        className="inline-block px-3 py-1.5 rounded-full font-semibold text-[12px]"
                        style={{ 
                          backgroundColor: YEAR_BG_COLORS[year],
                          color: YEAR_COLORS[year]
                        }}
                      >
                        {val}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30 text-[12px] font-medium">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
