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
  Edit
} from 'lucide-react'

const routes = [
  {
    href: '/',
    label: 'Dashboard',
    icon: Home
  },
  {
    href: '/transactions',
    label: 'View Trade Book',
    icon: FileText
  },
  {
    href: '/add-stock',
    label: 'Add Stock',
    icon: PlusCircle
  },
  {
    href: '/modify',
    label: 'Modify Records',
    icon: Edit
  },
  {
    href: '/accounts',
    label: 'Accounts',
    icon: Users
  },
  {
    href: '/profit-loss',
    label: 'Profit/Loss',
    icon: TrendingUp
  },
  {
    href: '/summary',
    label: 'Summary',
    icon: BarChart3
  }
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-6">
      <Link href="/" className="flex items-center space-x-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <span className="font-bold text-xl">StockApp</span>
      </Link>
      <div className="hidden md:flex items-center space-x-4 text-sm">
        {routes.map((route) => {
          const Icon = route.icon
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'flex items-center space-x-1 transition-colors hover:text-primary',
                pathname === route.href
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{route.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}