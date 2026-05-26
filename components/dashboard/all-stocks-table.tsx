// components/dashboard/all-stocks-table.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAccounts } from '@/components/providers/accounts-provider'
import { AllStocksTableClient } from './all-stocks-table-client'

export function AllStocksTable() {
  const { stocks, stocksLoading } = useAccounts()

  const { stocksSummary, totalCurrentValue, totalRealizedPnL, activeStocks, closedStocks } = useMemo(() => {
    const buyMap = new Map<string, { buyQty: number; totalBuyValue: number; totalBrokerage: number; count: number }>()
    const sellMap = new Map<string, { sellQty: number; totalSellValue: number; totalBrokerage: number }>()
    const lastTxMap = new Map<string, { date: Date; userid: string }>()

    stocks.forEach(s => {
      const date = new Date(s.date)
      const last = lastTxMap.get(s.stock)
      if (!last || date > last.date) lastTxMap.set(s.stock, { date, userid: s.userid })

      if (s.action === 'Buy') {
        const e = buyMap.get(s.stock) ?? { buyQty: 0, totalBuyValue: 0, totalBrokerage: 0, count: 0 }
        e.buyQty += s.quantity; e.totalBuyValue += s.tradeValue; e.totalBrokerage += s.brokerage; e.count++
        buyMap.set(s.stock, e)
      } else {
        const e = sellMap.get(s.stock) ?? { sellQty: 0, totalSellValue: 0, totalBrokerage: 0 }
        e.sellQty += s.quantity; e.totalSellValue += s.tradeValue; e.totalBrokerage += s.brokerage
        sellMap.set(s.stock, e)
      }
    })

    const stocksSummary = Array.from(buyMap.entries()).map(([stock, buy]) => {
      const sell = sellMap.get(stock)
      const buyQty = buy.buyQty
      const sellQty = sell?.sellQty ?? 0
      const remainingQty = buyQty - sellQty
      const avgBuyPrice = buyQty > 0 ? buy.totalBuyValue / buyQty : 0
      const avgSellPrice = sell && sellQty > 0 ? sell.totalSellValue / sellQty : 0
      const buyValue = buy.totalBuyValue + buy.totalBrokerage
      const sellValue = (sell?.totalSellValue ?? 0) - (sell?.totalBrokerage ?? 0)
      const realizedPnL = sellValue - avgBuyPrice * sellQty
      const realizedPnLPercent = sellQty > 0 && avgBuyPrice > 0 ? ((avgSellPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0
      const currentValue = remainingQty * avgBuyPrice
      const last = lastTxMap.get(stock)

      return {
        stock,
        buyQty, sellQty, remainingQty,
        avgBuyPrice, avgSellPrice,
        buyValue, sellValue,
        realizedPnL, realizedPnLPercent,
        currentValue,
        totalTransactions: buy.count,
        lastTransaction: last?.date ?? null,
        lastUser: last?.userid ?? null,
        status: (remainingQty > 0 ? 'Active' : 'Closed') as 'Active' | 'Closed',
      }
    }).sort((a, b) => a.stock.localeCompare(b.stock))

    const totalCurrentValue = stocksSummary.reduce((s, x) => s + x.currentValue, 0)
    const totalRealizedPnL = stocksSummary.reduce((s, x) => s + x.realizedPnL, 0)
    const activeStocks = stocksSummary.filter(s => s.status === 'Active').length
    const closedStocks = stocksSummary.filter(s => s.status === 'Closed').length

    return { stocksSummary, totalCurrentValue, totalRealizedPnL, activeStocks, closedStocks }
  }, [stocks])

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <CardTitle className="text-sm font-medium">All Stocks</CardTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{stocksSummary.length} total</span>
            <span className="text-emerald-600 dark:text-emerald-400">{activeStocks} active</span>
            <span>{closedStocks} closed</span>
            <span className="font-medium text-foreground">{formatCurrency(totalCurrentValue)}</span>
            <span className={cn(
              "font-medium",
              totalRealizedPnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {totalRealizedPnL >= 0 ? '+' : ''}{formatCurrency(totalRealizedPnL)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {stocksLoading ? (
          <div className="w-full space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-8 w-[140px] rounded-md bg-muted animate-pulse" />
              <div className="h-8 w-[112px] rounded-md bg-muted animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 56 }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 w-24 shrink-0 rounded-md bg-muted animate-pulse"
                  style={{ animationDelay: `${(i % 14) * 40}ms` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <AllStocksTableClient
            stocks={stocksSummary}
            totalCurrentValue={totalCurrentValue}
            totalRealizedPnL={totalRealizedPnL}
            activeStocks={activeStocks}
            closedStocks={closedStocks}
          />
        )}
      </CardContent>
    </Card>
  )
}
