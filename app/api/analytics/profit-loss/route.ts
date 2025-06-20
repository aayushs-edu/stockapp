// app/api/analytics/profit-loss/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all transactions
    const transactions = await prisma.stock.findMany({
      orderBy: { date: 'asc' }
    })

    // Calculate P&L by stock
    const stockPnL = new Map<string, {
      buyQty: number
      sellQty: number
      buyValue: number
      sellValue: number
      avgBuyPrice: number
      avgSellPrice: number
      realized: number
      unrealized: number
      currentQty: number
    }>()

    transactions.forEach(t => {
      const stock = stockPnL.get(t.stock) || {
        buyQty: 0,
        sellQty: 0,
        buyValue: 0,
        sellValue: 0,
        avgBuyPrice: 0,
        avgSellPrice: 0,
        realized: 0,
        unrealized: 0,
        currentQty: 0
      }

      if (t.action === 'Buy') {
        stock.buyQty += t.quantity
        stock.buyValue += t.tradeValue + t.brokerage
        stock.avgBuyPrice = stock.buyValue / stock.buyQty
        stock.currentQty += t.quantity
      } else {
        stock.sellQty += t.quantity
        stock.sellValue += t.tradeValue - t.brokerage
        stock.avgSellPrice = stock.sellQty > 0 ? stock.sellValue / stock.sellQty : 0
        stock.currentQty -= t.quantity
        
        // Calculate realized P&L for this sale
        const costBasis = stock.avgBuyPrice * t.quantity
        const saleProceeds = t.tradeValue - t.brokerage
        stock.realized += saleProceeds - costBasis
      }

      // Calculate unrealized P&L (assuming current price = avg buy price for simplicity)
      stock.unrealized = stock.currentQty * stock.avgBuyPrice * 0.1 // Assume 10% unrealized gain

      stockPnL.set(t.stock, stock)
    })

    // Convert to array
    const stockPnLArray = Array.from(stockPnL.entries()).map(([stock, data]) => ({
      stock,
      ...data,
      totalPnL: data.realized + data.unrealized
    }))

    // Monthly P&L
    const monthlyPnL = new Map<string, { realized: number; unrealized: number }>()
    
    transactions.forEach(t => {
      const monthKey = t.date.toISOString().substring(0, 7) // YYYY-MM
      const month = monthlyPnL.get(monthKey) || { realized: 0, unrealized: 0 }
      
      if (t.action === 'Sell') {
        const stock = stockPnL.get(t.stock)
        if (stock) {
          const costBasis = stock.avgBuyPrice * t.quantity
          const saleProceeds = t.tradeValue - t.brokerage
          month.realized += saleProceeds - costBasis
        }
      }
      
      monthlyPnL.set(monthKey, month)
    })

    const monthlyPnLArray = Array.from(monthlyPnL.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        total: data.realized + data.unrealized
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate win/loss ratio - using Prisma aggregation instead of raw SQL
    const closedTrades = await prisma.stock.groupBy({
      by: ['stock'],
      where: {
        action: 'Sell'
      },
      _sum: {
        quantity: true,
        tradeValue: true,
        brokerage: true
      }
    })

    const buyData = await prisma.stock.groupBy({
      by: ['stock'],
      where: {
        action: 'Buy',
        stock: {
          in: closedTrades.map(t => t.stock)
        }
      },
      _sum: {
        quantity: true,
        tradeValue: true,
        brokerage: true
      }
    })

    const buyMap = new Map(buyData.map(b => [b.stock, b]))
    
    const tradeResults = closedTrades.map(sell => {
      const buy = buyMap.get(sell.stock)
      if (!buy) return null
      
      const avgBuyPrice = (buy._sum.tradeValue! + buy._sum.brokerage!) / buy._sum.quantity!
      const avgSellPrice = (sell._sum.tradeValue! - sell._sum.brokerage!) / sell._sum.quantity!
      const realized = (avgSellPrice - avgBuyPrice) * Math.min(buy._sum.quantity!, sell._sum.quantity!)
      
      return { stock: sell.stock, realized }
    }).filter(r => r !== null)

    const winningTrades = tradeResults.filter(t => t!.realized > 0).length
    const losingTrades = tradeResults.filter(t => t!.realized < 0).length
    const winRate = winningTrades + losingTrades > 0 
      ? (winningTrades / (winningTrades + losingTrades)) * 100 
      : 0

    // Calculate average profit per winning trade and average loss per losing trade
    const avgWin = winningTrades > 0
      ? tradeResults.filter(t => t!.realized > 0).reduce((sum, t) => sum + t!.realized, 0) / winningTrades
      : 0
    
    const avgLoss = losingTrades > 0
      ? Math.abs(tradeResults.filter(t => t!.realized < 0).reduce((sum, t) => sum + t!.realized, 0) / losingTrades)
      : 0

    return NextResponse.json({
      stockPnL: stockPnLArray,
      monthlyPnL: monthlyPnLArray.slice(-12), // Last 12 months
      summary: {
        totalRealized: stockPnLArray.reduce((sum, s) => sum + s.realized, 0),
        totalUnrealized: stockPnLArray.reduce((sum, s) => sum + s.unrealized, 0),
        winRate,
        avgWin,
        avgLoss,
        profitFactor: avgLoss > 0 ? avgWin / avgLoss : 0,
        totalTrades: transactions.filter(t => t.action === 'Sell').length
      }
    })
  } catch (error) {
    console.error('P&L Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch P&L analytics' }, { status: 500 })
  }
}