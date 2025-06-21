// components/dashboard/all-stocks-table.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'
import { AllStocksTableClient } from './all-stocks-table-client'

export async function AllStocksTable() {
  // Get all stocks data
  const stocksData = await prisma.stock.groupBy({
    by: ['stock'],
    _sum: {
      quantity: true,
      tradeValue: true,
      brokerage: true
    },
    _count: {
      _all: true
    },
    where: {
      action: 'Buy'
    }
  })

  const sellData = await prisma.stock.groupBy({
    by: ['stock'],
    _sum: {
      quantity: true,
      tradeValue: true,
      brokerage: true
    },
    where: {
      action: 'Sell'
    }
  })

  // Get last transaction date and user for each stock
  const lastTransactions = await prisma.stock.findMany({
    distinct: ['stock'],
    orderBy: {
      date: 'desc'
    },
    select: {
      stock: true,
      date: true,
      userid: true
    }
  })

  const lastTransactionMap = new Map(lastTransactions.map(t => [t.stock, { date: t.date, userid: t.userid }]))
  const sellMap = new Map(sellData.map(s => [s.stock, s._sum]))

  const stocksSummary = stocksData.map(stock => {
    const sold = sellMap.get(stock.stock)
    const buyQty = stock._sum.quantity || 0
    const sellQty = sold?.quantity || 0
    const remainingQty = buyQty - sellQty
    const buyValue = (stock._sum.tradeValue || 0) + (stock._sum.brokerage || 0)
    const sellValue = (sold?.tradeValue || 0) - (sold?.brokerage || 0)
    const avgBuyPrice = buyQty > 0 ? (stock._sum.tradeValue || 0) / buyQty : 0
    const avgSellPrice = sellQty > 0 ? (sold?.tradeValue || 0) / sellQty : 0
    const realizedPnL = sellValue - (avgBuyPrice * sellQty)
    const realizedPnLPercent = sellQty > 0 && avgBuyPrice > 0 ? ((avgSellPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0
    const currentValue = remainingQty * avgBuyPrice
    const lastTransactionData = lastTransactionMap.get(stock.stock)
    const status: "Active" | "Closed" = remainingQty > 0 ? "Active" : "Closed"
    
    return {
      stock: stock.stock,
      buyQty,
      sellQty,
      remainingQty,
      avgBuyPrice,
      avgSellPrice,
      buyValue,
      sellValue,
      realizedPnL,
      realizedPnLPercent,
      currentValue,
      totalTransactions: stock._count._all,
      lastTransaction: lastTransactionData?.date || null,
      lastUser: lastTransactionData?.userid || null,
      status
    }
  }).sort((a, b) => a.stock.localeCompare(b.stock))

  const totalCurrentValue = stocksSummary.reduce((sum, s) => sum + s.currentValue, 0)
  const totalRealizedPnL = stocksSummary.reduce((sum, s) => sum + s.realizedPnL, 0)
  const activeStocks = stocksSummary.filter(s => s.status === 'Active').length
  const closedStocks = stocksSummary.filter(s => s.status === 'Closed').length

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">All Stocks Overview</CardTitle>
          </div>
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Total:</span>{' '}
              <span className="font-semibold">{stocksSummary.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Active:</span>{' '}
              <span className="font-semibold text-green-600">{activeStocks}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Closed:</span>{' '}
              <span className="font-semibold text-gray-600">{closedStocks}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Portfolio:</span>{' '}
              <span className="font-semibold">{formatCurrency(totalCurrentValue)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Realized P&L:</span>{' '}
              <span className={cn(
                "font-semibold",
                totalRealizedPnL >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(totalRealizedPnL)}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Click on any stock to view detailed breakdown in Summary Book
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <AllStocksTableClient 
          stocks={stocksSummary}
          totalCurrentValue={totalCurrentValue}
          totalRealizedPnL={totalRealizedPnL}
          activeStocks={activeStocks}
          closedStocks={closedStocks}
        />
      </CardContent>
    </Card>
  )
}