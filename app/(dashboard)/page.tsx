// app/(dashboard)/page.tsx
import { Suspense } from 'react'
import { DashboardStats } from '@/components/dashboard/stats'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { StockOverview } from '@/components/dashboard/stock-overview'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Trading Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor your portfolio performance and trading insights
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>
      
      {/* Stats Cards */}
      <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
        <DashboardStats />
      </Suspense>
      
      {/* Charts Section - Client Component */}
      <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
        <DashboardCharts />
      </Suspense>
      
      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock Overview */}
        <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <StockOverview />
        </Suspense>
        
        {/* Recent Transactions */}
        <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <RecentTransactions />
        </Suspense>
      </div>
    </div>
  )
}