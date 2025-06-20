// components/dashboard/stats.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/db'
import { cn, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Activity, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'

export async function DashboardStats() {
  const [totalBuy, totalSell, totalAccounts, recentTransactions, stockPositions] = await Promise.all([
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
    }),
    // Get position status for each stock
    prisma.stock.groupBy({
      by: ['stock'],
      _sum: {
        quantity: true,
        tradeValue: true,
        brokerage: true
      },
      where: { action: 'Buy' }
    })
  ])

  // Get sell data for position calculation
  const sellData = await prisma.stock.groupBy({
    by: ['stock'],
    _sum: {
      quantity: true,
      tradeValue: true,
      brokerage: true
    },
    where: { action: 'Sell' }
  })

  const sellMap = new Map(sellData.map(s => [s.stock, s._sum]))
  
  // Calculate realized P&L and current investment
  let realizedPnL = 0
  let currentInvestment = 0
  let totalStocks = 0
  
  stockPositions.forEach(buyPosition => {
    const soldPosition = sellMap.get(buyPosition.stock)
    const buyQty = buyPosition._sum.quantity || 0
    const sellQty = soldPosition?.quantity || 0
    const remainingQty = buyQty - sellQty
    
    if (remainingQty <= 0) {
      // Position is closed - calculate realized P&L
      const buyValue = (buyPosition._sum.tradeValue || 0) + (buyPosition._sum.brokerage || 0)
      const sellValue = (soldPosition?.tradeValue || 0) - (soldPosition?.brokerage || 0)
      const avgBuyPrice = buyQty > 0 ? (buyPosition._sum.tradeValue || 0) / buyQty : 0
      realizedPnL += sellValue - (avgBuyPrice * sellQty)
    } else {
      // Position is active - count as investment
      const avgPrice = buyQty > 0 ? (buyPosition._sum.tradeValue || 0) / buyQty : 0
      currentInvestment += remainingQty * avgPrice
    }
    totalStocks++
  })

  const buyTotal = (totalBuy._sum.tradeValue || 0) + (totalBuy._sum.brokerage || 0)
  const sellTotal = (totalSell._sum.tradeValue || 0) - (totalSell._sum.brokerage || 0)
  const netCashFlow = sellTotal - buyTotal

  const stats = [
    {
      title: 'Current Investment',
      value: formatCurrency(currentInvestment),
      icon: Wallet,
      description: 'Active positions value',
      trend: 'neutral',
      gradient: 'from-amber-500 to-amber-600',
      bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20'
    },
    {
      title: 'Total Deployed',
      value: formatCurrency(buyTotal),
      icon: DollarSign,
      description: 'Total capital invested',
      trend: 'neutral',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'
    },
    {
      title: 'Realized P&L',
      value: formatCurrency(Math.abs(realizedPnL)),
      icon: realizedPnL >= 0 ? TrendingUp : TrendingDown,
      description: `${realizedPnL >= 0 ? 'Profit' : 'Loss'} from closed positions`,
      trend: realizedPnL >= 0 ? 'up' : 'down',
      gradient: realizedPnL >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600',
      bgGradient: realizedPnL >= 0 
        ? 'from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20' 
        : 'from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20'
    },
    {
      title: 'Trading Activity',
      value: recentTransactions.toString(),
      icon: Activity,
      description: `${totalStocks} unique stocks`,
      trend: 'neutral',
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card 
            key={index} 
            className={cn(
              "relative overflow-hidden transition-all hover:shadow-lg",
              "bg-gradient-to-br",
              stat.bgGradient
            )}
          >
            <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
              <div className={cn(
                "w-full h-full rounded-full opacity-10 bg-gradient-to-br blur-2xl",
                stat.gradient
              )} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={cn(
                "p-2 rounded-lg bg-gradient-to-br",
                stat.gradient
              )}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={cn(
                "text-xs mt-1 flex items-center gap-1",
                stat.trend === 'up' && "text-emerald-600 dark:text-emerald-400",
                stat.trend === 'down' && "text-red-600 dark:text-red-400",
                stat.trend === 'neutral' && "text-muted-foreground"
              )}>
                {stat.trend !== 'neutral' && (
                  stat.trend === 'up' ? 
                    <ArrowUpRight className="h-3 w-3" /> : 
                    <ArrowDownRight className="h-3 w-3" />
                )}
                {stat.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}