'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Building2, UserCog, BookOpen, BarChart3,
  Users, ChevronDown, ChevronUp, GraduationCap, X, Menu, ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

type NavItem = {
  key: string
  label: string
  icon?: React.ReactNode
  href?: string
  onClick?: () => void
  children?: NavItem[]
}

function getNavItems(role: string, onNavigate?: (key: string) => void): NavItem[] {
  if (role === 'ADMIN') {
    return [
      { key: 'departments', label: 'Departments',    icon: <Building2 className="w-[15px] h-[15px]" />, onClick: () => onNavigate?.('departments') },
      { key: 'users',       label: 'Faculty & Users', icon: <UserCog   className="w-[15px] h-[15px]" />, onClick: () => onNavigate?.('users') },
      { key: 'subjects',    label: 'Subjects',        icon: <BookOpen  className="w-[15px] h-[15px]" />, onClick: () => onNavigate?.('subjects') },
    ]
  }
  if (role === 'HOD') {
    return [
      { key: 'overview',    label: 'Department',     icon: <LayoutDashboard className="w-[15px] h-[15px]" />, onClick: () => onNavigate?.('overview') },
      { key: 'faculty',     label: 'Faculty',         icon: <Users     className="w-[15px] h-[15px]" />, onClick: () => onNavigate?.('faculty') },
      { key: 'subjects',    label: 'Subjects',        icon: <BookOpen  className="w-[15px] h-[15px]" />, onClick: () => onNavigate?.('subjects') },
      { key: 'marks',       label: 'Marks',           icon: <BarChart3 className="w-[15px] h-[15px]" />, onClick: () => onNavigate?.('marks') },
      { key: 'my-subjects', label: 'My Subjects',     icon: <GraduationCap className="w-[15px] h-[15px]" />, onClick: () => onNavigate?.('my-subjects') },
    ]
  }
  return [
    { key: 'subjects', label: 'My Subjects', icon: <BookOpen className="w-[15px] h-[15px]" />, href: '/faculty' },
  ]
}

// Sidebar colour tokens
const clr = {
  bg:         'hsl(0, 0%, 100%)', // White background
  border:     'hsl(220, 14%, 87%)', // Light border
  fg:         'hsl(222, 47%, 11%)', // Dark foreground
  fgDim:      'hsl(220, 14%, 46%)', // Muted foreground
  activeText: 'hsl(221, 83%, 53%)', // Primary blue
  activeBg:   'hsl(221, 83%, 53%, 0.08)', // Light blue background
  hoverBg:    'hsl(220, 14%, 96%)', // Very light gray hover
}

const rolePill: Record<string, React.CSSProperties> = {
  ADMIN:   { backgroundColor: 'hsl(270 60% 55% / 0.18)', color: 'hsl(270 80% 75%)' },
  HOD:     { backgroundColor: 'hsl(210 80% 50% / 0.18)', color: 'hsl(210 100% 72%)' },
  FACULTY: { backgroundColor: 'hsl(142 60% 40% / 0.18)', color: 'hsl(142 70% 62%)' },
}

export function Sidebar({
  role,
  activeTab,
  onTabChange,
  userName,
  userRole,
  customItems,
}: {
  role: string
  activeTab: string
  onTabChange: (tab: string) => void
  userName: string
  userRole: string
  customItems?: NavItem[]
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})
  const pathname = usePathname()
  const items = customItems || getNavItems(role, onTabChange)

  const toggleExpand = (key: string) =>
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Nav item ──────────────────────────────────────────────────────────
  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive    = item.href ? pathname === item.href : activeTab === item.key
    const isExpanded  = !!expandedKeys[item.key]
    const hasChildren = !!(item.children?.length)

    const baseStyle: React.CSSProperties = {
      display:        'flex',
      alignItems:     'center',
      gap:            collapsed ? 0 : '0.625rem',
      justifyContent: collapsed ? 'center' : 'space-between',
      padding:        collapsed ? '0.5rem' : '0.4375rem 0.625rem',
      borderRadius:   '4px',
      fontSize:       '0.8125rem',
      fontWeight:     500,
      transition:     'background-color 120ms ease, color 120ms ease',
      cursor:         'pointer',
      width:          '100%',
      textAlign:      'left',
      border:         'none',
      background:     'none',
      color:          isActive ? clr.activeText : clr.fg,
      borderLeft:     isActive ? `2px solid hsl(221, 83%, 53%)` : '2px solid transparent',
      paddingLeft:    isActive && !collapsed ? 'calc(0.625rem - 2px)' : undefined,
      ...(isActive ? { backgroundColor: clr.activeBg } : {}),
    }

    // What happens when the user clicks this item
    const handleClick = () => {
      if (hasChildren && !collapsed) {
        // Only expand/collapse tree when sidebar is open
        toggleExpand(item.key)
      } else if (item.onClick) {
        // collapsed OR leaf: execute the navigation action
        item.onClick()
      }
    }

    const content = (
      <>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
          <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.75 }}>{item.icon}</span>
          {!collapsed && (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          )}
        </span>
        {!collapsed && hasChildren && (
          <span style={{ flexShrink: 0, opacity: 0.5 }}>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </span>
        )}
      </>
    )

    const hoverHandlers = {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = clr.hoverBg
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = ''
      },
    }

    if (item.href) {
      return <Link href={item.href} style={baseStyle} {...hoverHandlers}>{content}</Link>
    }
    return (
      <button onClick={handleClick} style={baseStyle} {...hoverHandlers}>
        {content}
      </button>
    )
  }

  // ── Child nav item ────────────────────────────────────────────────────
  const ChildLink = ({ child }: { child: NavItem }) => {
    const isActive       = child.href ? pathname === child.href : activeTab === child.key
    const isExpanded     = !!expandedKeys[child.key]
    const hasGrandchildren = !!(child.children?.length)

    const style: React.CSSProperties = {
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0.375rem 0.5rem',
      borderRadius:   '3px',
      fontSize:       '0.75rem',
      fontWeight:     500,
      transition:     'background-color 120ms ease, color 120ms ease',
      cursor:         'pointer',
      width:          '100%',
      textAlign:      'left',
      border:         'none',
      background:     'none',
      color:          isActive ? clr.activeText : clr.fg,
      ...(isActive ? { backgroundColor: clr.activeBg } : {}),
    }

    const hoverHandlers = {
      onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = clr.hoverBg
      },
      onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = ''
      },
    }

    return (
      <div>
        <button
          onClick={hasGrandchildren ? () => toggleExpand(child.key) : child.onClick}
          style={style}
          {...hoverHandlers}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {child.label}
          </span>
          {hasGrandchildren && (
            <span style={{ opacity: 0.5, flexShrink: 0 }}>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          )}
        </button>

        {hasGrandchildren && isExpanded && (
          <div style={{
            paddingLeft: '0.75rem',
            marginTop:   '0.125rem',
            display:     'flex',
            flexDirection: 'column',
            gap:         '0.125rem',
          }}>
            {child.children?.map(gc => {
              const isGcActive = gc.href ? pathname === gc.href : activeTab === gc.key
              return (
                <button
                  key={gc.key}
                  onClick={gc.onClick}
                  style={{
                    display:    'block',
                    padding:    '0.3125rem 0.5rem',
                    borderRadius: '3px',
                    fontSize:   '0.6875rem',
                    fontWeight: 500,
                    textAlign:  'left',
                    width:      '100%',
                    border:     'none',
                    background: isGcActive ? clr.activeBg : 'none',
                    color:      isGcActive ? clr.activeText : clr.fgDim,
                    transition: 'background-color 120ms ease, color 120ms ease',
                    cursor:     'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!isGcActive) (e.currentTarget as HTMLElement).style.backgroundColor = clr.hoverBg
                  }}
                  onMouseLeave={e => {
                    if (!isGcActive) (e.currentTarget as HTMLElement).style.backgroundColor = ''
                  }}
                >
                  {gc.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Sidebar inner content ─────────────────────────────────────────────
  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Brand / User ─────────────────────────────────────── */}
      <div style={{
        padding:       collapsed ? '0.875rem 0.5rem 0.625rem' : '0.875rem 1rem 0.625rem',
        borderBottom:  `1px solid ${clr.border}`,
        display:       'flex',
        alignItems:    'center',
        gap:           '0.75rem',
        overflow:      'hidden',
      }}>
        <div style={{ flexShrink: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image src="/bv-logo.png" alt="BV Logo" width={32} height={32} className="object-contain" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ overflow: 'hidden', minWidth: 0 }}
          >
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'hsl(222, 47%, 11%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              {userName}
            </p>
            <span style={{
              display:         'inline-block',
              marginTop:       '0.125rem',
              fontSize:        '0.625rem',
              fontWeight:      600,
              letterSpacing:   '0.06em',
              textTransform:   'uppercase',
              padding:         '0.0625rem 0.375rem',
              borderRadius:    '3px',
              ...(rolePill[userRole] || rolePill['FACULTY']),
            }}>
              {userRole}
            </span>
          </motion.div>
        )}
      </div>

      {/* ── Hamburger / collapse toggle ───────────────────────── */}
      <div
        className="hidden md:flex"
        style={{
          padding:      '0.375rem 0.5rem',
          borderBottom: `1px solid ${clr.border}`,
          justifyContent: collapsed ? 'center' : 'flex-end',
        }}
      >
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '0.375rem',
            borderRadius:   '4px',
            background:     'none',
            border:         'none',
            cursor:         'pointer',
            color:          clr.fgDim,
            transition:     'background-color 120ms ease, color 120ms ease',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = clr.hoverBg
            ;(e.currentTarget as HTMLElement).style.color = clr.fg
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
            ;(e.currentTarget as HTMLElement).style.color = clr.fgDim
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav style={{
        flex:          1,
        padding:       '0.5rem 0.375rem',
        overflowY:     'auto',
        display:       'flex',
        flexDirection: 'column',
        gap:           '0.125rem',
      }}>
        {!collapsed && (
          <p style={{
            fontSize:      '0.625rem',
            fontWeight:    600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color:         clr.fgDim,
            padding:       '0 0.375rem',
            marginBottom:  '0.375rem',
            marginTop:     '0.125rem',
          }}>
            Navigation
          </p>
        )}

        {items.map(item => (
          <div key={item.key}>
            <NavLink item={item} />
            {/* Accordion children — only visible when expanded */}
            {item.children && item.children.length > 0 && !collapsed && (
              <AnimatePresence>
                {expandedKeys[item.key] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      paddingLeft: '1.25rem',
                      paddingTop:  '0.125rem',
                      display:     'flex',
                      flexDirection: 'column',
                      gap:         '0.125rem',
                    }}>
                      {item.children.map(child => <ChildLink key={child.key} child={child} />)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        ))}
      </nav>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        style={{ backgroundColor: clr.bg, border: `1px solid ${clr.border}` }}
        className="fixed top-3 left-3 z-[60] p-2 rounded md:hidden"
      >
        <Menu className="w-4 h-4" style={{ color: clr.fg }} />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] md:hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              style={{ width: 240, height: '100%', backgroundColor: clr.bg, borderRight: `1px solid ${clr.border}` }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                style={{ position: 'absolute', top: 12, right: 12, color: clr.fgDim, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X className="w-4 h-4" />
              </button>
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 56 : 232 }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        style={{ backgroundColor: clr.bg, borderRight: `1px solid ${clr.border}` }}
        className="hidden md:flex flex-col h-screen sticky top-0 shrink-0 overflow-hidden z-40"
      >
        {sidebarContent}
      </motion.aside>
    </>
  )
}
