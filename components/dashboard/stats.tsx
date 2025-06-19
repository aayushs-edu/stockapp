import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/db'
import { cn, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'

export async function DashboardStats() {
  const [totalBuy, totalSell, totalAccounts, recentTransactions] = await Promise.all([
    prisma.stock.aggregate({
      where: { action: 'Buy' },
      _sum: { tradeValue: true, brokerage: true }
    }),
    prisma.stock.aggregate({
      where: { action: 'Sell' },
      _sum: { tradeValue: true, brokerage: true }
    }),
    prisma.account.count(),
    prisma.stock.count({
      where: {
        date: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      }
    })
  ])

  const buyTotal = (totalBuy._sum.tradeValue || 0) + (totalBuy._sum.brokerage || 0)
  const sellTotal = (totalSell._sum.tradeValue || 0) - (totalSell._sum.brokerage || 0)
  const netProfit = sellTotal - buyTotal

  const stats = [
    {
      title: 'Total Investment',
      value: formatCurrency(buyTotal),
      icon: DollarSign,
      description: 'Total amount invested',
      trend: 'neutral'
    },
    {
      title: 'Total Returns',
      value: formatCurrency(sellTotal),
      icon: TrendingUp,
      description: 'Total amount from sales',
      trend: 'up'
    },
    {
      title: 'Net Profit/Loss',
      value: formatCurrency(netProfit),
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      description: netProfit >= 0 ? 'Profit' : 'Loss',
      trend: netProfit >= 0 ? 'up' : 'down'
    },
    {
      title: 'Recent Activity',
      value: recentTransactions.toString(),
      icon: Activity,
      description: 'Transactions in last 30 days',
      trend: 'neutral'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={cn(
                "h-4 w-4",
                stat.trend === 'up' && "text-green-600",
                stat.trend === 'down' && "text-red-600",
                stat.trend === 'neutral' && "text-muted-foreground"
              )} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}