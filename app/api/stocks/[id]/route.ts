// app/api/stocks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const stock = await prisma.stock.findUnique({
      where: { id: id },
    })

    if (!stock) {
      return NextResponse.json({ error: 'Stock record not found' }, { status: 404 })
    }

    // Transform the data to match the form expectations
    const formattedStock = {
      ...stock,
      date: stock.date.toISOString(),
    }

    return NextResponse.json(formattedStock)
  } catch (error) {
    console.error('Error fetching stock:', error)
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await request.json()
    
    // Calculate trade value
    const tradeValue = body.quantity * body.price

    const stock = await prisma.stock.update({
      where: { id: id },
      data: {
        userid: body.userid,
        date: new Date(body.date),
        stock: body.stock.toUpperCase(),
        action: body.action,
        source: body.source || null,
        quantity: parseFloat(body.quantity),
        price: parseFloat(body.price),
        tradeValue: tradeValue,
        brokerage: parseFloat(body.brokerage),
        remarks: body.remarks || null,
      },
    })

    return NextResponse.json(stock)
  } catch (error) {
    console.error('Error updating stock:', error)
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    // Check if record exists
    const exists = await prisma.stock.findUnique({
      where: { id: id }
    })

    if (!exists) {
      return NextResponse.json({ error: 'Stock record not found' }, { status: 404 })
    }

    await prisma.stock.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true, message: 'Stock record deleted successfully' })
  } catch (error) {
    console.error('Error deleting stock:', error)
    return NextResponse.json({ error: 'Failed to delete stock' }, { status: 500 })
  }
}