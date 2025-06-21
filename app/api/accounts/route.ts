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
    // Get all accounts (including inactive ones for the accounts page)
    const accounts = await prisma.account.findMany({
      orderBy: { userid: 'asc' }
    })

    // Get transaction counts for each account
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const transactionCount = await prisma.stock.count({
          where: { userid: account.userid }
        })

        // Get buy/sell summary
        const buyStats = await prisma.stock.aggregate({
          where: {
            userid: account.userid,
            action: 'Buy'
          },
          _sum: {
            quantity: true,
            tradeValue: true,
            brokerage: true
          },
          _count: true
        })

        const sellStats = await prisma.stock.aggregate({
          where: {
            userid: account.userid,
            action: 'Sell'
          },
          _sum: {
            quantity: true,
            tradeValue: true,
            brokerage: true
          },
          _count: true
        })

        // Calculate current positions
        const stockPositions = await prisma.stock.groupBy({
          by: ['stock'],
          where: {
            userid: account.userid,
            action: 'Buy'
          },
          _sum: {
            quantity: true,
            tradeValue: true
          }
        })

        const sellPositions = await prisma.stock.groupBy({
          by: ['stock'],
          where: {
            userid: account.userid,
            action: 'Sell'
          },
          _sum: {
            quantity: true
          }
        })

        const sellMap = new Map(sellPositions.map(s => [s.stock, s._sum.quantity || 0]))
        
        const activeStocks = stockPositions.filter(pos => {
          const buyQty = pos._sum.quantity || 0
          const sellQty = sellMap.get(pos.stock) || 0
          return buyQty > sellQty
        }).length

        const totalInvestment = (buyStats._sum.tradeValue || 0) + (buyStats._sum.brokerage || 0)
        const totalReturns = (sellStats._sum.tradeValue || 0) - (sellStats._sum.brokerage || 0)
        const netPnL = totalReturns - (buyStats._sum.tradeValue || 0)

        return {
          ...account,
          stats: {
            totalTransactions: transactionCount,
            buyTransactions: buyStats._count,
            sellTransactions: sellStats._count,
            totalInvestment,
            totalReturns,
            netPnL,
            activeStocks,
            totalStocks: stockPositions.length
          }
        }
      })
    )

    return NextResponse.json(accountsWithStats)
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
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

    // Try to create account with auto-increment
    try {
      const account = await prisma.account.create({
        data: {
          userid: upperCaseUserId,
          name: body.name.trim(),
          active: body.active !== undefined ? body.active : true, // Default to true
        },
        select: {
          id: true,
          userid: true,
          name: true,
          active: true,
        }
      })

      return NextResponse.json(account)
    } catch (createError: any) {
      // If auto-increment fails, try with manual ID as last resort
      if (createError.code === 'P2002' && createError.meta?.target?.includes('id')) {
        console.error('Auto-increment failed, attempting manual ID assignment')
        
        // Get the highest existing ID
        const maxIdRecord = await prisma.account.findFirst({
          orderBy: { id: 'desc' },
          select: { id: true }
        })
        
        const nextId = (maxIdRecord?.id || 0) + 1
        
        // Try creating with explicit ID
        const account = await prisma.account.create({
          data: {
            id: nextId,
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
      }
      
      throw createError
    }
  } catch (error: any) {
    console.error('Failed to create account:', error)
    
    // Handle different Prisma errors
    if (error.code === 'P2002') {
      // Check which field caused the unique constraint violation
      if (error.meta?.target?.includes('userid')) {
        return NextResponse.json({ error: 'Account ID already exists' }, { status: 400 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to create account. Please try again.' 
    }, { status: 500 })
  }
}