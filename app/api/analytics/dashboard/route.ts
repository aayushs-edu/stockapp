// app/api/analytics/dashboard/route.ts
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
    // Get portfolio value over time - fetch all data
    const transactions = await prisma.stock.findMany({
      orderBy: { date: 'asc' },
      select: {
        date: true,
        action: true,
        quantity: true,
        price: true,
        tradeValue: true,
        brokerage: true,
        stock: true,
      }
    })

    // Calculate portfolio value progression
    const portfolioHistory: any[] = []
    const holdings = new Map<string, number>()
    let cumulativeInvestment = 0
    let cumulativeReturns = 0

    transactions.forEach((t) => {
      if (t.action === 'Buy') {
        holdings.set(t.stock, (holdings.get(t.stock) || 0) + t.quantity)
        cumulativeInvestment += t.tradeValue + t.brokerage
      } else {
        holdings.set(t.stock, (holdings.get(t.stock) || 0) - t.quantity)
        cumulativeReturns += t.tradeValue - t.brokerage
      }

      const totalHoldings = Array.from(holdings.entries()).reduce((sum, [_, qty]) => sum + qty, 0)
      
      portfolioHistory.push({
        date: t.date.toISOString().split('T')[0],
        investment: cumulativeInvestment,
        returns: cumulativeReturns,
        netValue: cumulativeReturns - cumulativeInvestment,
        holdingsCount: totalHoldings
      })
    })

    // Get current holdings
    const currentHoldings = await prisma.stock.groupBy({
      by: ['stock'],
      _sum: {
        quantity: true,
        tradeValue: true,
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
      },
      where: {
        action: 'Sell'
      }
    })

    const sellMap = new Map(sellData.map(s => [s.stock, s._sum]))

    const holdingsBreakdown = currentHoldings.map(h => {
      const sold = sellMap.get(h.stock)
      const remainingQty = (h._sum.quantity || 0) - (sold?.quantity || 0)
      const avgBuyPrice = (h._sum.tradeValue || 0) / (h._sum.quantity || 1)
      
      return {
        stock: h.stock,
        quantity: remainingQty,
        value: remainingQty * avgBuyPrice,
        avgPrice: avgBuyPrice
      }
    }).filter(h => h.quantity > 0)

    // Monthly performance
    const monthlyPerformance = await prisma.stock.groupBy({
      by: ['action'],
      _sum: {
        tradeValue: true,
        brokerage: true,
      },
      where: {
        date: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
        }
      }
    })

    // Trade frequency by day
    const tradeFrequency = await prisma.stock.groupBy({
      by: ['date'],
      _count: true,
      orderBy: { date: 'desc' },
      take: 90
    })

    // Top gainers/losers
    const stockPerformance = await prisma.$queryRaw`
      SELECT 
        stock,
        SUM(CASE WHEN action = 'Buy' THEN quantity ELSE 0 END) as "buyQty",
        SUM(CASE WHEN action = 'Sell' THEN quantity ELSE 0 END) as "sellQty",
        SUM(CASE WHEN action = 'Buy' THEN trade_value + brokerage ELSE 0 END) as "totalBuy",
        SUM(CASE WHEN action = 'Sell' THEN trade_value - brokerage ELSE 0 END) as "totalSell"
      FROM stockdata
      GROUP BY stock
      HAVING SUM(CASE WHEN action = 'Sell' THEN quantity ELSE 0 END) > 0
    ` as any[]

    const performanceData = stockPerformance.map(s => ({
      stock: s.stock,
      profitLoss: Number(s.totalSell) - Number(s.totalBuy),
      roi: ((Number(s.totalSell) - Number(s.totalBuy)) / Number(s.totalBuy)) * 100
    })).sort((a, b) => b.profitLoss - a.profitLoss)

    return NextResponse.json({
      portfolioHistory, // Send all history data
      holdingsBreakdown,
      monthlyPerformance,
      tradeFrequency: tradeFrequency.map(t => ({
        date: t.date.toISOString().split('T')[0],
        count: t._count
      })),
      topPerformers: performanceData.slice(0, 5),
      worstPerformers: performanceData.slice(-5).reverse()
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}