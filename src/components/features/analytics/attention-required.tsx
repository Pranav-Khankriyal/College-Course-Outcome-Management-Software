'use client'

import { useState } from 'react'
import { AnalyticsData } from '@/app/actions/analytics'
import { AlertCircle, CheckCircle2, Info, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

export function AttentionRequired({ items }: { items: AnalyticsData['attentionRequired'] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (items.length === 0) return null

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertCircle className="w-4 h-4 text-destructive" />
      case 'medium': return <AlertCircle className="w-4 h-4 text-amber-500" />
      case 'low': 
      case 'ALL_CLEAR':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      default: return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getBg = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/5 border-destructive/10'
      case 'medium': return 'bg-amber-500/5 border-amber-500/10'
      case 'low': 
      case 'ALL_CLEAR':
        return 'bg-emerald-500/5 border-emerald-500/10'
      default: return 'bg-blue-500/5 border-blue-500/10'
    }
  }

  const INITIAL_COUNT = 3
  const visibleItems = isExpanded ? items : items.slice(0, INITIAL_COUNT)
  const hasMore = items.length > INITIAL_COUNT

  return (
    <div className="space-y-2.5">
      {visibleItems.map((item, idx) => (
        <div 
          key={idx} 
          className={`px-4 py-3.5 rounded-xl border flex items-start gap-3 ${getBg(item.type === 'ALL_CLEAR' ? 'ALL_CLEAR' : item.severity)}`}
        >
          <div className="mt-0.5">{getIcon(item.type === 'ALL_CLEAR' ? 'ALL_CLEAR' : item.severity)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground leading-snug">
              {item.message}
            </p>
            {item.link && (
              <Link 
                href={item.link}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline mt-1.5"
              >
                Take action <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      ))}

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-2 py-2.5 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>Show {items.length - INITIAL_COUNT} More <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  )
}
