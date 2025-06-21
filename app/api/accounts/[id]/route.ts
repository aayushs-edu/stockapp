import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 })
    }

    const body = await request.json()
    
    // Validate input
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check if account exists
    const existingAccount = await prisma.account.findUnique({
      where: { id }
    })

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Update account
    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        name: body.name.trim(),
        active: body.active !== undefined ? body.active : existingAccount.active,
      },
    })

    return NextResponse.json(updatedAccount)
  } catch (error: any) {
    console.error('Failed to update account:', error)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 })
    }

    // Check if account exists
    const existingAccount = await prisma.account.findUnique({
      where: { id }
    })

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check if account has any transactions
    const transactionCount = await prisma.stock.count({
      where: { userid: existingAccount.userid }
    })

    if (transactionCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete account. This account has ${transactionCount} transaction(s). Please delete all transactions first.` 
      }, { status: 400 })
    }

    // Delete account
    await prisma.account.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (error: any) {
    console.error('Failed to delete account:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}