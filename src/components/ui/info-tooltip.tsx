'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Info, X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface InfoTooltipProps {
  /** The help text to display in the popover */
  content: string
  /** Optional size override for the icon (default 15) */
  size?: number
}

export function InfoTooltip({ content, size = 15 }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverWidth = 320
    const popoverHeight = 160 // estimated max

    let top = rect.bottom + 8
    let left = rect.left + rect.width / 2 - popoverWidth / 2

    // Keep within viewport horizontally
    if (left < 12) left = 12
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12
    }

    // If below viewport, show above
    if (top + popoverHeight > window.innerHeight - 12) {
      top = rect.top - popoverHeight - 8
    }

    setPosition({ top, left })
  }, [])

  useEffect(() => {
    if (!isOpen) return

    calculatePosition()

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      ) return
      setIsOpen(false)
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    const handleScroll = () => calculatePosition()

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', calculatePosition)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', calculatePosition)
    }
  }, [isOpen, calculatePosition])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="inline-flex items-center justify-center rounded-full transition-colors duration-150 hover:bg-primary/10 text-muted-foreground hover:text-primary flex-shrink-0"
        style={{ width: size + 8, height: size + 8 }}
        aria-label="More information"
        title="More information"
      >
        <Info style={{ width: size, height: size }} />
      </button>

      {isOpen && position && typeof window !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className="animate-in fade-in zoom-in-95 duration-150"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 9999,
            width: 320,
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          <div
            className="bg-card border border-black/10 rounded-xl shadow-xl p-4"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-primary/10 rounded-md">
                  <Info className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[12px] font-bold text-foreground uppercase tracking-wider">Info</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-0.5 rounded hover:bg-black/5 text-muted-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground mt-2">
              {content}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
