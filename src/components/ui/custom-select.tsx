'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (val: string) => void
  options: Option[]
}

export function CustomSelect({ value, onChange, options }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(o => o.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-black/5 hover:bg-black/10 transition-colors border-none text-[12.5px] font-medium pl-3 pr-2.5 py-1 rounded-full outline-none text-foreground"
      >
        <span>{selectedOption?.label || 'Select...'}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 min-w-[160px] bg-card border border-black/5 rounded-xl shadow-lg overflow-hidden z-[100]"
          >
            <div className="p-1 space-y-0.5 max-h-64 overflow-y-auto">
              {options.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-[12.5px] flex items-center justify-between transition-colors ${
                    value === option.value 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  {option.label}
                  {value === option.value && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-3 text-primary" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
