// app/api/analytics/summary/route.ts
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
    // Get all stocks and their transactions
    const allTransactions = await prisma.stock.findMany({
      orderBy: { date: 'asc' }
    })

    // Calculate portfolio metrics
    const stockMetrics = new Map<string, {
      firstBuyDate: Date
      lastActivityDate: Date
      totalBuyQty: number
      totalSellQty: number
      totalBuyValue: number
      totalSellValue: number
      currentQty: number
      avgBuyPrice: number
      holdingPeriodDays: number
      transactionCount: number
    }>()

    allTransactions.forEach(t => {
      const metrics = stockMetrics.get(t.stock) || {
        firstBuyDate: t.date,
        lastActivityDate: t.date,
        totalBuyQty: 0,
        totalSellQty: 0,
        totalBuyValue: 0,
        totalSellValue: 0,
        currentQty: 0,
        avgBuyPrice: 0,
        holdingPeriodDays: 0,
        transactionCount: 0
      }

      metrics.lastActivityDate = t.date
      metrics.transactionCount++

      if (t.action === 'Buy') {
        if (metrics.totalBuyQty === 0) {
          metrics.firstBuyDate = t.date
        }
        metrics.totalBuyQty += t.quantity
        metrics.totalBuyValue += t.tradeValue + t.brokerage
        metrics.currentQty += t.quantity
      } else {
        metrics.totalSellQty += t.quantity
        metrics.totalSellValue += t.tradeValue - t.brokerage
        metrics.currentQty -= t.quantity
      }

      metrics.avgBuyPrice = metrics.totalBuyQty > 0 ? metrics.totalBuyValue / metrics.totalBuyQty : 0
      metrics.holdingPeriodDays = Math.floor((metrics.lastActivityDate.getTime() - metrics.firstBuyDate.getTime()) / (1000 * 60 * 60 * 24))

      stockMetrics.set(t.stock, metrics)
    })

    // Convert to array and calculate additional metrics
    const stockSummary = Array.from(stockMetrics.entries()).map(([stock, metrics]) => ({
      stock,
      ...metrics,
      status: metrics.currentQty > 0 ? 'Active' : 'Closed',
      realizedPnL: metrics.totalSellValue - (metrics.avgBuyPrice * metrics.totalSellQty),
      roi: metrics.totalSellQty > 0 
        ? ((metrics.totalSellValue - (metrics.avgBuyPrice * metrics.totalSellQty)) / (metrics.avgBuyPrice * metrics.totalSellQty)) * 100
        : 0
    }))

    // Calculate sector allocation (mock data - you'd need real sector mapping)
    const sectorAllocation = [
      { sector: 'Technology', value: 35, count: 5 },
      { sector: 'Finance', value: 25, count: 3 },
      { sector: 'Healthcare', value: 20, count: 4 },
      { sector: 'Energy', value: 10, count: 2 },
      { sector: 'Consumer', value: 10, count: 2 }
    ]

    // Calculate yearly performance
    const yearlyPerformance = new Map<number, { 
      year: number
      buyValue: number
      sellValue: number
      transactionCount: number
      pnl: number
    }>()

    allTransactions.forEach(t => {
      const year = t.date.getFullYear()
      const yearData = yearlyPerformance.get(year) || {
        year,
        buyValue: 0,
        sellValue: 0,
        transactionCount: 0,
        pnl: 0
      }

      yearData.transactionCount++
      if (t.action === 'Buy') {
        yearData.buyValue += t.tradeValue + t.brokerage
      } else {
        yearData.sellValue += t.tradeValue - t.brokerage
      }
      yearData.pnl = yearData.sellValue - yearData.buyValue

      yearlyPerformance.set(year, yearData)
    })

    const yearlyData = Array.from(yearlyPerformance.values()).sort((a, b) => a.year - b.year)

    // Trading frequency analysis
    const dayOfWeekFrequency = new Array(7).fill(0)
    const monthlyFrequency = new Array(12).fill(0)
    
    allTransactions.forEach(t => {
      dayOfWeekFrequency[t.date.getDay()]++
      monthlyFrequency[t.date.getMonth()]++
    })

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const tradingPatterns = {
      byDayOfWeek: dayNames.map((day, i) => ({ day, count: dayOfWeekFrequency[i] })),
      byMonth: monthNames.map((month, i) => ({ month, count: monthlyFrequency[i] }))
    }

    // Portfolio diversity score (0-100)
    const uniqueStocks = stockSummary.filter(s => s.currentQty > 0).length
    const diversityScore = Math.min(uniqueStocks * 10, 100)

    return NextResponse.json({
      stockSummary,
      sectorAllocation,
      yearlyPerformance: yearlyData,
      tradingPatterns,
      portfolioMetrics: {
        totalStocks: stockSummary.length,
        activePositions: stockSummary.filter(s => s.status === 'Active').length,
        closedPositions: stockSummary.filter(s => s.status === 'Closed').length,
        avgHoldingPeriod: stockSummary.reduce((sum, s) => sum + s.holdingPeriodDays, 0) / stockSummary.length,
        diversityScore,
        totalTransactions: allTransactions.length
      }
    })
  } catch (error) {
    console.error('Summary analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch summary analytics' }, { status: 500 })
  }
}