// components/layout/main-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  FileText,
  Home,
  PlusCircle,
  Settings,
  TrendingUp,
  Users,
  Edit,
  PieChart
} from 'lucide-react'

const routes = [
  {
    href: '/',
    label: 'Dashboard',
    icon: Home,
    description: 'Overview & analytics'
  },
  {
    href: '/transactions',
    label: 'Trade Book',
    icon: FileText,
    description: 'View all trades'
  },
  {
    href: '/add-stock',
    label: 'Add Stock',
    icon: PlusCircle,
    description: 'New transaction'
  },
  {
    href: '/modify',
    label: 'Modify',
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
    label: 'P&L Analysis',
    icon: TrendingUp,
    description: 'Profit & loss'
  },
  {
    href: '/summary',
    label: 'Summary',
    icon: PieChart,
    description: 'Portfolio overview'
  }
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-6">
      <Link href="/" className="flex items-center space-x-2 group">
        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          StockApp
        </span>
      </Link>
      
      <div className="hidden lg:flex items-center space-x-1">
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
                  'flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-transform group-hover:scale-110",
                  isActive && "text-primary"
                )} />
                <span className="text-sm">{route.label}</span>
              </div>
              
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                {route.description}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover rotate-45" />
              </div>
            </Link>
          )
        })}
      </div>
      
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button className="p-2 rounded-lg hover:bg-accent">
          <BarChart3 className="h-5 w-5" />
        </button>
      </div>
    </nav>
  )
}