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
    // Get all unique stock names
    const uniqueStocks = await prisma.stock.findMany({
      select: {
        stock: true
      },
      distinct: ['stock'],
      orderBy: {
        stock: 'asc'
      }
    })

    const stockNames = uniqueStocks.map(s => s.stock)
    return NextResponse.json(stockNames)
  } catch (error) {
    console.error('Error fetching unique stocks:', error)
    return NextResponse.json({ error: 'Failed to fetch unique stocks' }, { status: 500 })
  }
}