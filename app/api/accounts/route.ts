import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all accounts first
    const accounts = await prisma.account.findMany({
      orderBy: { userid: 'asc' }
    })

    // Get all transactions for all accounts at once
    const allTransactions = await prisma.stock.findMany({
      orderBy: [{ userid: 'asc' }, { stock: 'asc' }, { date: 'asc' }]
    })

    // Group transactions by userid
    const transactionsByUser = new Map<string, typeof allTransactions>()
    allTransactions.forEach(transaction => {
      const userId = transaction.userid
      if (!transactionsByUser.has(userId)) {
        transactionsByUser.set(userId, [])
      }
      transactionsByUser.get(userId)!.push(transaction)
    })

    // Calculate stats for each account using the same logic as summary book
    const accountsWithStats = accounts.map(account => {
      const userTransactions = transactionsByUser.get(account.userid) || []
      
      if (userTransactions.length === 0) {
        return {
          ...account,
          stats: {
            totalTransactions: 0,
            buyTransactions: 0,
            sellTransactions: 0,
            totalInvestment: 0,
            totalReturns: 0,
            realizedPnL: 0,
            currentInvestment: 0,
            activeStocks: 0,
            totalStocks: 0
          }
        }
      }

      // Group transactions by stock for this user (same as summary book logic)
      const stockSummaries = new Map<string, {
        stock: string
        buyQty: number
        sellQty: number
        netQty: number
        totalBuyValue: number
        totalSellValue: number
        totalBrokerage: number
        avgBuyPrice: number
        avgSellPrice: number
        transactions: typeof userTransactions
      }>()

      // Process each transaction (same logic as summary book)
      userTransactions.forEach(transaction => {
        let stockSummary = stockSummaries.get(transaction.stock)
        if (!stockSummary) {
          stockSummary = {
            stock: transaction.stock,
            buyQty: 0,
            sellQty: 0,
            netQty: 0,
            totalBuyValue: 0,
            totalSellValue: 0,
            totalBrokerage: 0,
            avgBuyPrice: 0,
            avgSellPrice: 0,
            transactions: []
          }
          stockSummaries.set(transaction.stock, stockSummary)
        }

        // Add transaction
        stockSummary.transactions.push(transaction)
        stockSummary.totalBrokerage += transaction.brokerage

        // Update quantities and values based on action
        if (transaction.action === 'Buy') {
          stockSummary.buyQty += transaction.quantity
          stockSummary.totalBuyValue += transaction.tradeValue
        } else {
          stockSummary.sellQty += transaction.quantity
          stockSummary.totalSellValue += transaction.tradeValue
        }

        // Calculate derived values
        stockSummary.netQty = stockSummary.buyQty - stockSummary.sellQty
        stockSummary.avgBuyPrice = stockSummary.buyQty > 0 ? stockSummary.totalBuyValue / stockSummary.buyQty : 0
        stockSummary.avgSellPrice = stockSummary.sellQty > 0 ? stockSummary.totalSellValue / stockSummary.sellQty : 0
      })

      // Calculate account-level metrics (matching summary book logic)
      let totalBuyValue = 0
      let totalSellValue = 0
      let totalBrokerage = 0
      let currentInvestment = 0
      let realizedPnL = 0
      let activeStocks = 0
      let buyTransactions = 0
      let sellTransactions = 0

      Array.from(stockSummaries.values()).forEach(stock => {
        totalBuyValue += stock.totalBuyValue
        totalSellValue += stock.totalSellValue
        totalBrokerage += stock.totalBrokerage
        
        // Count transactions
        buyTransactions += stock.transactions.filter(t => t.action === 'Buy').length
        sellTransactions += stock.transactions.filter(t => t.action === 'Sell').length
        
        if (stock.netQty > 0) {
          // Stock is still held - count as active and calculate current investment
          activeStocks++
          // Current investment = remaining shares * avg buy price (same as summary book)
          currentInvestment += stock.netQty * stock.avgBuyPrice
        }
        
        if (stock.sellQty > 0) {
          // Some shares were sold - calculate realized P/L (same as summary book)
          // Realized P/L = sell value - (avg buy price * sold quantity)
          realizedPnL += stock.totalSellValue - (stock.avgBuyPrice * stock.sellQty)
        }
      })

      // Final calculations matching summary book
      const totalInvestment = totalBuyValue + totalBrokerage // Total amount invested including brokerage
      const totalReturns = totalSellValue - (userTransactions.filter(t => t.action === 'Sell').reduce((sum, t) => sum + t.brokerage, 0)) // Net returns after brokerage

      return {
        ...account,
        stats: {
          totalTransactions: userTransactions.length,
          buyTransactions,
          sellTransactions,
          totalInvestment: Math.round(totalInvestment * 100) / 100,
          totalReturns: Math.round(totalReturns * 100) / 100,
          realizedPnL: Math.round(realizedPnL * 100) / 100,
          currentInvestment: Math.round(currentInvestment * 100) / 100,
          activeStocks,
          totalStocks: stockSummaries.size
        }
      }
    })

    return NextResponse.json(accountsWithStats)
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    
    // Fallback: return accounts without stats
    try {
      const accounts = await prisma.account.findMany({
        orderBy: { userid: 'asc' }
      })
      
      const accountsWithEmptyStats = accounts.map(account => ({
        ...account,
        stats: {
          totalTransactions: 0,
          buyTransactions: 0,
          sellTransactions: 0,
          totalInvestment: 0,
          totalReturns: 0,
          realizedPnL: 0,
          currentInvestment: 0,
          activeStocks: 0,
          totalStocks: 0
        }
      }))
      
      return NextResponse.json(accountsWithEmptyStats)
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Validate input
    if (!body.userid || !body.name) {
      return NextResponse.json({ error: 'User ID and Name are required' }, { status: 400 })
    }

    const upperCaseUserId = body.userid.toUpperCase()

    // Check if account already exists
    const existingAccount = await prisma.account.findUnique({
      where: { userid: upperCaseUserId }
    })

    if (existingAccount) {
      return NextResponse.json({ error: 'Account ID already exists' }, { status: 400 })
    }

    // Create account
    const account = await prisma.account.create({
      data: {
        userid: upperCaseUserId,
        name: body.name.trim(),
        active: body.active !== undefined ? body.active : true,
      },
      select: {
        id: true,
        userid: true,
        name: true,
        active: true,
      }
    })

    return NextResponse.json(account)
  } catch (error: any) {
    console.error('Failed to create account:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Account ID already exists' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create account. Please try again.' 
    }, { status: 500 })
  }
}