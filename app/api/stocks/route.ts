import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const userid = searchParams.get('userid')
    const action = searchParams.get('action')
    const stock = searchParams.get('stock')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const mode = searchParams.get('mode') || 'paginated' // 'paginated' or 'all'

    const where: any = {}
    if (userid && userid !== 'all') where.userid = userid
    if (action && action !== 'all') where.action = action
    if (stock) where.stock = stock
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }

    // For backward compatibility, if mode is 'all', return all records
    if (mode === 'all') {
      const stocks = await prisma.stock.findMany({
        where,
        orderBy: [
          { date: 'desc' },
          { id: 'desc' }
        ]
      })
      
      // Fetch account information separately - Fix: Use Array.from() instead of spread operator
      const uniqueUserIds = new Set(stocks.map(s => s.userid))
      const accountIds = Array.from(uniqueUserIds)
      const accounts = await prisma.account.findMany({
        where: { userid: { in: accountIds } }
      })
      
      // Map accounts by userid for quick lookup
      const accountMap = new Map(accounts.map(acc => [acc.userid, acc]))
      
      // Add account info to each stock
      const stocksWithAccount = stocks.map(stock => ({
        ...stock,
        account: accountMap.get(stock.userid) || { userid: stock.userid, name: stock.userid }
      }))
      
      return NextResponse.json(stocksWithAccount)
    }

    // Count total records for pagination
    const totalCount = await prisma.stock.count({ where })

    // Calculate pagination
    const skip = (page - 1) * limit
    const totalPages = Math.ceil(totalCount / limit)

    // Fetch paginated data
    const stocks = await prisma.stock.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { id: 'desc' }
      ],
      skip,
      take: limit
    })
    
    // Fetch account information separately - Fix: Use Array.from() instead of spread operator
    const uniqueUserIds = new Set(stocks.map(s => s.userid))
    const accountIds = Array.from(uniqueUserIds)
    const accounts = await prisma.account.findMany({
      where: { userid: { in: accountIds } }
    })
    
    // Map accounts by userid for quick lookup
    const accountMap = new Map(accounts.map(acc => [acc.userid, acc]))
    
    // Add account info to each stock
    const stocksWithAccount = stocks.map(stock => ({
      ...stock,
      account: accountMap.get(stock.userid) || { userid: stock.userid, name: stock.userid }
    }))

    return NextResponse.json({
      data: stocksWithAccount,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages
      }
    })
  } catch (error) {
    console.error('Error fetching stocks:', error)
    return NextResponse.json({ error: 'Failed to fetch stocks' }, { status: 500 })
  }
}

async function createStockWithRetry(data: any, maxRetries = 5): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use a transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Get the maximum ID within the transaction for isolation
        const maxIdRecord = await tx.stock.findFirst({
          orderBy: { id: 'desc' },
          select: { id: true }
        })
        
        const nextId = (maxIdRecord?.id || 0) + 1
        
        // Create the record with the calculated ID
        const stock = await tx.stock.create({
          data: {
            id: nextId,
            ...data
          },
        })
        
        return stock
      }, {
        isolationLevel: 'Serializable', // Highest isolation level to prevent race conditions
        timeout: 10000, // 10 second timeout
      })
      
      return result
    } catch (error: any) {
      console.log(`Create attempt ${attempt} failed:`, error.code, error.message)
      
      // Check if it's a unique constraint violation on ID
      if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
        if (attempt < maxRetries) {
          // Add exponential backoff with jitter to reduce thundering herd
          const baseDelay = Math.pow(2, attempt - 1) * 100 // 100ms, 200ms, 400ms, 800ms
          const jitter = Math.random() * 100 // 0-100ms random jitter
          const delay = baseDelay + jitter
          
          console.log(`ID collision detected, retrying in ${delay.toFixed(0)}ms... (attempt ${attempt}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        } else {
          console.log('Max retries exceeded, falling back to database auto-increment')
          // Final fallback: let database handle ID generation
          const stock = await prisma.stock.create({
            data: {
              // Don't specify ID, let database auto-increment
              userid: data.userid,
              date: data.date,
              stock: data.stock,
              action: data.action,
              source: data.source,
              quantity: data.quantity,
              price: data.price,
              tradeValue: data.tradeValue,
              brokerage: data.brokerage,
              remarks: data.remarks,
              orderRef: data.orderRef,
            },
          })
          return stock
        }
      } else if (error.code === 'P2034') {
        // Transaction timeout or serialization failure
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 200 + Math.random() * 200
          console.log(`Transaction conflict detected, retrying in ${delay.toFixed(0)}ms... (attempt ${attempt}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
      
      // For other errors or if we've exhausted retries, throw the error
      throw error
    }
  }
  
  throw new Error('Failed to create stock after maximum retries')
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    const stockData = {
      userid: body.userid,
      date: new Date(body.date),
      stock: body.stock,
      action: body.action,
      source: body.source || null,
      quantity: body.quantity,
      price: body.price,
      tradeValue: body.tradeValue,
      brokerage: body.brokerage,
      remarks: body.remarks || null,
      orderRef: body.orderRef || null,
    }
    
    const stock = await createStockWithRetry(stockData)
    return NextResponse.json(stock)
    
  } catch (error: any) {
    console.error('Error creating stock:', error)
    
    // Provide more specific error messages
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'A constraint violation occurred. Please try again.' 
      }, { status: 409 })
    } else if (error.code === 'P2034') {
      return NextResponse.json({ 
        error: 'The operation timed out due to high concurrency. Please try again.' 
      }, { status: 503 })
    }
    
    return NextResponse.json({ error: 'Failed to create stock' }, { status: 500 })
  }
}