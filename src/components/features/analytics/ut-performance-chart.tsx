'use client'

import { AnalyticsData, YearKey } from '@/app/actions/analytics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { YEAR_COLORS } from './academic-year-legend'

export function UtPerformanceChart({ utPerformance }: { utPerformance: AnalyticsData['utPerformance'] }) {
  const years: YearKey[] = ['FY', 'SY', 'TY', 'Final Year']
  const allAssessments = new Set<string>()

  // Collect all unique assessment names (e.g. Internal Assessment, UT1, UT2)
  years.forEach(year => {
    Object.keys(utPerformance[year] || {}).forEach(ut => allAssessments.add(ut))
  })

  const sortedAssessments = Array.from(allAssessments).sort()

  if (sortedAssessments.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center border border-dashed border-border rounded-md">
        <p className="text-sm text-muted-foreground">No assessment data available</p>
      </div>
    )
  }

  // Format data for Recharts: [{ name: 'UT1', FY: 75, SY: 80, ... }]
  const data = sortedAssessments.map(assessment => {
    const dataPoint: Record<string, string | number | null> = { name: assessment }
    years.forEach(year => {
      const val = utPerformance[year]?.[assessment]?.percentage
      dataPoint[year] = val !== null && val !== undefined ? val : null
    })
    return dataPoint
  })

  return (
    <div className="h-[250px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }}
            domain={[0, 100]}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-card rounded-2xl border border-black/5 shadow-md px-3 py-2 rounded shadow-sm border border-border">
                    <p className="text-[12px] font-semibold text-foreground mb-1">{label}</p>
                    {payload.map(p => (
                      <div key={String(p.dataKey)} className="flex items-center gap-2 mt-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-[11px] text-muted-foreground flex-1 w-16">{String(p.dataKey)}</span>
                        <span className="text-[11px] font-semibold text-foreground">{p.value}%</span>
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          {years.map(year => (
            <Line
              key={year}
              type="monotone"
              dataKey={year}
              stroke={YEAR_COLORS[year]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2, fill: 'var(--background)' }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
