// components/layout/main-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  FileText,
  Home,
  PlusCircle,
  Users,
  Edit,
  PieChart,
  TrendingUp,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const routes = [
  {
    href: '/',
    label: 'Dashboard',
    icon: Home,
    description: 'Overview & analytics'
  },
  {
    href: '/transactions',
    label: 'Trades',
    icon: FileText,
    description: 'View all trades'
  },
  {
    href: '/summary-book',
    label: 'Summary',
    icon: FileText,
    description: 'Consolidated view'
  },
  {
    href: '/add-stock',
    label: 'Add',
    icon: PlusCircle,
    description: 'New transaction'
  },
  {
    href: '/modify',
    label: 'Edit',
    icon: Edit,
    description: 'Edit records'
  },
  {
    href: '/accounts',
    label: 'Accounts',
    icon: Users,
    description: 'Manage accounts'
  },
  {
    href: '/profit-loss',
    label: 'P&L',
    icon: TrendingUp,
    description: 'Profit & loss'
  },
  {
    href: '/summary',
    label: 'Portfolio',
    icon: PieChart,
    description: 'Portfolio overview'
  }
]

export function MainNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="flex items-center justify-between w-full">
      {/* Logo - More Compact */}
      <Link href="/" className="flex items-center space-x-2 group">
        <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          StockApp
        </span>
      </Link>
      
      {/* Desktop Navigation - Compact Pills */}
      <div className="hidden lg:flex items-center space-x-1 bg-muted/30 rounded-full p-1">
        {routes.map((route) => {
          const Icon = route.icon
          const isActive = pathname === route.href
          
          return (
            <Link
              key={route.href}
              href={route.href}
              className="group relative"
            >
              <div
                className={cn(
                  'flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all duration-200 text-xs font-medium',
                  'hover:bg-background hover:shadow-sm',
                  isActive
                    ? 'bg-background text-primary shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn(
                  "h-3.5 w-3.5 transition-transform group-hover:scale-110",
                  isActive && "text-primary"
                )} />
                <span className="hidden xl:inline">{route.label}</span>
              </div>
              
              {/* Compact Tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 xl:hidden">
                {route.label}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover rotate-45" />
              </div>
            </Link>
          )
        })}
      </div>
      
      {/* Mobile Menu Button */}
      <div className="lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2"
        >
          {mobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="lg:hidden fixed inset-0 z-40 bg-black/20"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu */}
          <div className="lg:hidden absolute top-full left-0 right-0 z-50 bg-background border-b shadow-lg">
            <div className="grid grid-cols-2 gap-1 p-3">
              {routes.map((route) => {
                const Icon = route.icon
                const isActive = pathname === route.href
                
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{route.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}