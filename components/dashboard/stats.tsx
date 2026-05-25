// components/dashboard/stats.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Activity, Wallet } from 'lucide-react'
import { useAccounts } from '@/components/providers/accounts-provider'

export function DashboardStats() {
  const { stocks, allAccounts } = useAccounts()

  const computed = useMemo(() => {
    const buyTxns = stocks.filter(s => s.action === 'Buy')
    const sellTxns = stocks.filter(s => s.action === 'Sell')

    const buyTotal = buyTxns.reduce((sum, s) => sum + s.tradeValue + s.brokerage, 0)
    const sellTotal = sellTxns.reduce((sum, s) => sum + s.tradeValue - s.brokerage, 0)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentTransactions = stocks.filter(s => new Date(s.date) >= thirtyDaysAgo).length

    // Group by stock to calculate positions
    const stockMap = new Map<string, { buyQty: number; sellQty: number; totalBuyValue: number; totalSellValue: number }>()
    stocks.forEach(s => {
      let entry = stockMap.get(s.stock)
      if (!entry) { entry = { buyQty: 0, sellQty: 0, totalBuyValue: 0, totalSellValue: 0 }; stockMap.set(s.stock, entry) }
      if (s.action === 'Buy') { entry.buyQty += s.quantity; entry.totalBuyValue += s.tradeValue }
      else { entry.sellQty += s.quantity; entry.totalSellValue += s.tradeValue }
    })

    let realizedPnL = 0
    let currentInvestment = 0
    stockMap.forEach(pos => {
      const avgBuyPrice = pos.buyQty > 0 ? pos.totalBuyValue / pos.buyQty : 0
      const remaining = pos.buyQty - pos.sellQty
      if (remaining > 0) currentInvestment += remaining * avgBuyPrice
      if (pos.sellQty > 0) realizedPnL += pos.totalSellValue - avgBuyPrice * pos.sellQty
    })

    return { buyTotal, recentTransactions, realizedPnL, currentInvestment, totalStocks: stockMap.size }
  }, [stocks])

  const stats = [
    {
      title: 'Current Investment',
      value: formatCurrency(computed.currentInvestment),
      icon: Wallet,
      description: 'Active positions',
      valueClass: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Total Deployed',
      value: formatCurrency(computed.buyTotal),
      icon: DollarSign,
      description: 'Total capital invested',
      valueClass: '',
    },
    {
      title: 'Realized P/L',
      value: (computed.realizedPnL >= 0 ? '+' : '-') + formatCurrency(Math.abs(computed.realizedPnL)),
      icon: computed.realizedPnL >= 0 ? TrendingUp : TrendingDown,
      description: computed.realizedPnL >= 0 ? 'Profit from closed positions' : 'Loss from closed positions',
      valueClass: computed.realizedPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
    },
    {
      title: 'Trading Activity',
      value: computed.recentTransactions.toString(),
      icon: Activity,
      description: `${computed.totalStocks} unique stocks traded`,
      valueClass: '',
    },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className={cn("text-xl font-semibold tabular-nums", stat.valueClass)}>
                {stat.value}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
