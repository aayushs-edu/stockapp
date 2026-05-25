// components/layout/main-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { BarChart3, MoreHorizontal, Menu, X } from 'lucide-react'

const primaryRoutes = [
  { href: '/',              label: 'Dashboard' },
  { href: '/transactions',  label: 'Trades'     },
  { href: '/summary-book',  label: 'Summary'    },
  { href: '/add-stock',     label: 'Add'        },
  { href: '/modify',        label: 'Edit'       },
  { href: '/accounts',      label: 'Accounts'   },
]

const moreRoutes = [
  { href: '/holdings',    label: 'Holdings'  },
  { href: '/profit-loss', label: 'P&L'       },
  { href: '/summary',     label: 'Portfolio' },
]

const allRoutes = [...primaryRoutes, ...moreRoutes]

export function MainNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isMoreActive = moreRoutes.some(r => pathname === r.href)

  return (
    <nav className="flex items-center justify-between w-full">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">StockApp</span>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center gap-1">
        {primaryRoutes.map((route) => {
          const isActive = pathname === route.href
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {route.label}
            </Link>
          )
        })}

        {/* More dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen(v => !v)}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors',
              isMoreActive
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-popover border rounded-md shadow-md z-50 py-1">
              {moreRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'block px-3 py-1.5 text-sm transition-colors',
                    pathname === route.href
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {route.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(v => !v)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/20"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden absolute top-full left-0 right-0 z-50 bg-background border-b shadow-md">
            <div className="grid grid-cols-2 gap-1 p-3">
              {allRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm transition-colors',
                    pathname === route.href
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {route.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}
