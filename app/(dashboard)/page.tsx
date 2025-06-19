import { Suspense } from 'react'
import { DashboardStats } from '@/components/dashboard/stats'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { StockOverview } from '@/components/dashboard/stock-overview'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your stock management system
        </p>
      </div>
      
      <Suspense fallback={<div>Loading stats...</div>}>
        <DashboardStats />
      </Suspense>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <Suspense fallback={<div>Loading transactions...</div>}>
            <RecentTransactions />
          </Suspense>
        </div>
        <div className="col-span-3">
          <Suspense fallback={<div>Loading overview...</div>}>
            <StockOverview />
          </Suspense>
        </div>
      </div>
    </div>
  )
}