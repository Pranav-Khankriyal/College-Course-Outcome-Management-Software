'use client'

import { AnalyticsData, YearKey } from '@/app/actions/analytics'
import { YEAR_COLORS } from './academic-year-legend'
import { ResultPerformanceChart } from './result-performance-chart'
import { CoAttainmentTable } from './co-attainment-table'
import { SubjectPerformance } from './subject-performance'
import { AttentionRequired } from './attention-required'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

function AssessmentProgress({ data }: { data: AnalyticsData }) {
  const years: YearKey[] = ['FY', 'SY', 'TY', 'Final Year']
  return (
    <div className="space-y-4">
      {years.map(year => {
        const prog = data.assessmentProgress[year]
        if (prog.total === 0) return null
        return (
          <div key={year} className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold" style={{ color: YEAR_COLORS[year] }}>{year}</span>
              <span className="text-muted-foreground font-medium">{prog.completed} / {prog.total} subjects</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${prog.percentage || 0}%`,
                  backgroundColor: YEAR_COLORS[year]
                }}
              />
            </div>
          </div>
        )
      })}
      {years.every(y => data.assessmentProgress[y].total === 0) && (
        <p className="text-[12px] text-muted-foreground text-center py-4">No subjects configured</p>
      )}
    </div>
  )
}

export function DepartmentDashboard({ data, title, subtitle }: { data: AnalyticsData; title: string; subtitle: string }) {

  const acronym = title.split(/[\s&]+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 4)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-card rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="px-8 py-7 flex items-center justify-between bg-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-md">
              {acronym}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 bg-secondary/10 border-t border-black/5">
          <div className="px-8 py-5 border-r border-b sm:border-b-0 border-black/5">
            <p className="text-3xl font-semibold text-foreground tracking-tight">{data.overview.studentCount}</p>
            <p className="text-[12px] text-muted-foreground font-medium mt-1">Total Students</p>
          </div>
          <div className="px-8 py-5 border-b sm:border-r sm:border-b-0 border-black/5">
            <p className="text-3xl font-semibold text-foreground tracking-tight">{data.overview.facultyCount}</p>
            <p className="text-[12px] text-muted-foreground font-medium mt-1">Total Faculty</p>
          </div>
          <div className="px-8 py-5 border-r border-black/5">
            <p className="text-3xl font-semibold text-foreground tracking-tight">{data.overview.sectionCount}</p>
            <p className="text-[12px] text-muted-foreground font-medium mt-1">Sections</p>
          </div>
          <div className="px-8 py-5">
            <p className="text-3xl font-semibold text-foreground tracking-tight">{data.overview.subjectCount}</p>
            <p className="text-[12px] text-muted-foreground font-medium mt-1">Subjects</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Main Column (Charts) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Result Row */}
          <div className="bg-card rounded-2xl border border-black/5 shadow-sm p-6">
            <h3 className="text-[14px] font-semibold text-foreground mb-4 tracking-tight uppercase text-muted-foreground">Result Performance</h3>
            <ResultPerformanceChart results={data.results} />
          </div>

          {/* Assessment Progress */}
          <div className="bg-card rounded-2xl border border-black/5 shadow-sm p-6">
            <h3 className="text-[14px] font-semibold text-foreground mb-4 tracking-tight uppercase text-muted-foreground">Assessment Upload Progress</h3>
            <AssessmentProgress data={data} />
          </div>

          {/* CO Attainment */}
          <div className="bg-card rounded-2xl border border-black/5 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-foreground tracking-tight uppercase text-muted-foreground">CO Attainment Matrix</h3>
            </div>
            <CoAttainmentTable coAttainment={data.coAttainment} />
          </div>

          {/* Year-wise Subject Performance */}
          <div className="bg-card rounded-2xl border border-black/5 shadow-sm p-6">
            <h3 className="text-[14px] font-semibold text-foreground mb-4 tracking-tight uppercase text-muted-foreground">Subject Performance</h3>
            <SubjectPerformance subjectPerformance={data.subjectPerformance} />
          </div>

        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-6">

          {/* Attention Required */}
          <div className="bg-card rounded-2xl border border-black/5 shadow-sm p-6 sticky top-28">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-foreground tracking-tight uppercase text-muted-foreground">Attention Required</h3>
              {data.attentionRequired.every(i => i.type === 'ALL_CLEAR') && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <AttentionRequired items={data.attentionRequired} />
          </div>

        </div>
      </div>
    </motion.div>
  )
}
