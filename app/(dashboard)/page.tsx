// app/(dashboard)/page.tsx
import { DashboardStats } from '@/components/dashboard/stats'
import { AllStocksTable } from '@/components/dashboard/all-stocks-table'

export default function DashboardPage() {
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
