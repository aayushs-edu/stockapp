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

    const where: any = {}
    if (userid) where.userid = userid
    if (action) where.action = action
    if (stock) where.stock = { contains: stock }

    const stocks = await prisma.stock.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { id: 'desc' }
      ],
    })

    return NextResponse.json(stocks)
  } catch (error) {
    console.error('Error fetching stocks:', error)
    return NextResponse.json({ error: 'Failed to fetch stocks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const stock = await prisma.stock.create({
      data: {
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
      },
    })

    return NextResponse.json(stock)
  } catch (error) {
    console.error('Error creating stock:', error)
    return NextResponse.json({ error: 'Failed to create stock' }, { status: 500 })
  }
}