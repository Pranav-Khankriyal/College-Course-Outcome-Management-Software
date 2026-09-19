'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronRight } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

export function Header({ breadcrumbs }: { breadcrumbs?: { label: string; href?: string }[] }) {
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!session?.user) return null

  const role = (session.user as { role?: string }).role || 'FACULTY'
  const name = session.user.name || 'User'
  const email = session.user.email || ''
  const initials = name.trim().split(/\s+/).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const roleColors: Record<string, { bg: string; text: string }> = {
    ADMIN: { bg: 'hsl(270 60% 55% / 0.12)', text: 'hsl(270 80% 60%)' },
    HOD:   { bg: 'hsl(210 80% 50% / 0.12)', text: 'hsl(210 90% 55%)' },
    FACULTY: { bg: 'hsl(142 60% 40% / 0.12)', text: 'hsl(142 70% 42%)' },
  }
  const badge = roleColors[role] || roleColors['FACULTY']

  const avatarBg: Record<string, string> = {
    ADMIN: 'hsl(270, 60%, 52%)',
    HOD:   'hsl(210, 80%, 48%)',
    FACULTY: 'hsl(142, 60%, 38%)',
  }
  const avBg = avatarBg[role] || avatarBg['FACULTY']

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="px-4 md:px-6 h-11 flex items-center justify-between gap-4">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 ml-10 md:ml-0 min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-1 text-sm min-w-0">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />}
                  <span className={`${
                    i === breadcrumbs.length - 1
                      ? 'font-semibold text-foreground text-[13px]'
                      : 'text-muted-foreground text-[13px]'
                  } truncate`}>
                    {crumb.label}
                  </span>
                </span>
              ))}
            </nav>
          ) : (
            <p className="text-[13px] font-semibold text-foreground truncate">
              Welcome, {name}
            </p>
          )}
        </div>

        {/* Right: Account avatar + dropdown */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white transition-opacity duration-150 hover:opacity-85 select-none"
            style={{ backgroundColor: avBg }}
            title={name}
          >
            {initials}
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-60 bg-card rounded-md overflow-hidden z-[200]"
              style={{
                border: '1px solid hsl(220, 14%, 87%)',
                boxShadow: '0 8px 24px rgba(14,21,38,0.12), 0 2px 8px rgba(14,21,38,0.06)',
              }}
            >
              {/* User identity block */}
              <div className="px-4 py-3.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0 select-none"
                    style={{ backgroundColor: avBg }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground leading-snug truncate">{name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{email}</p>
                  </div>
                </div>
                <div className="mt-2.5">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {role}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="py-1">
                <button
                  onClick={() => { setDropdownOpen(false); signOut({ callbackUrl: '/login' }) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors duration-150"
                  style={{ color: 'hsl(0, 72%, 51%)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(0 72% 51% / 0.06)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
