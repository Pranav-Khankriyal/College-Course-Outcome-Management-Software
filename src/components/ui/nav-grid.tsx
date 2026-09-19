'use client'

import { motion } from 'framer-motion'
import { Users } from 'lucide-react'

interface NavGridItem {
  label: string
  sub: string
  value: string
}

interface NavGridProps {
  title: string
  icon: React.ReactNode
  items: NavGridItem[]
  onSelect: (value: string) => void
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.22 }
  })
}

export function NavGrid({ title, icon, items, onSelect }: NavGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-primary">{icon}</span>
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <motion.button
            key={item.value}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(item.value)}
            className="glass-card rounded-md p-4 text-left group transition-shadow duration-150 hover:shadow-md"
          >
            <h3 className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
              {item.label}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
              <Users className="w-3 h-3 opacity-70" />
              {item.sub}
            </p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
