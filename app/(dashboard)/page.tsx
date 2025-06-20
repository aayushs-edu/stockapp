// app/(dashboard)/page.tsx
import { Suspense } from 'react'
import { DashboardStats } from '@/components/dashboard/stats'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { StockOverview } from '@/components/dashboard/stock-overview'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <DashboardHeader />
      
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