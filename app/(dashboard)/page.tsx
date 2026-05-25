// app/(dashboard)/page.tsx
'use client'

import { DashboardStats } from '@/components/dashboard/stats'
import { AllStocksTable } from '@/components/dashboard/all-stocks-table'
import { useRedirectClassic } from '@/components/classic/use-redirect-classic'

export default function DashboardPage() {
  const redirecting = useRedirectClassic('/transactions')
  if (redirecting) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Portfolio overview</p>
      </div>

      <AllStocksTable />
      <DashboardStats />
    </div>
  )
}
