'use client'

import { AnalyticsData, YearKey } from '@/app/actions/analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { YEAR_COLORS } from './academic-year-legend'

export function ResultPerformanceChart({ results }: { results: AnalyticsData['results'] }) {
  const data = (['FY', 'SY', 'TY', 'Final Year'] as YearKey[]).map(year => ({
    name: year,
    percentage: results[year].percentage,
    passed: results[year].passed,
    total: results[year].total,
  }))

  const hasData = data.some(d => d.percentage !== null)

  if (!hasData) {
    return (
      <div className="h-[250px] flex items-center justify-center border border-dashed border-border rounded-md">
        <p className="text-sm text-muted-foreground">No result data available</p>
      </div>
    )
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
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
            cursor={{ fill: 'hsl(220, 14%, 96%)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                if (d.percentage === null) return null
                return (
                  <div className="bg-card rounded-2xl border border-black/5 shadow-md px-3 py-2 rounded shadow-sm border border-border">
                    <p className="text-[12px] font-semibold text-foreground mb-1">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Pass Rate: <span className="font-semibold text-foreground">{d.percentage}%</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {d.passed} / {d.total} assessments passed
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="percentage" radius={[4, 4, 0, 0]} maxBarSize={50}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.percentage !== null ? YEAR_COLORS[entry.name as YearKey] : 'transparent'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
