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
    const accounts = await prisma.account.findMany({
      orderBy: { userid: 'asc' }
    })
    return NextResponse.json(accounts)
  } catch (error) {
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
    const account = await prisma.account.create({
      data: {
        userid: body.userid.toUpperCase(),
        name: body.name,
      },
    })

    return NextResponse.json(account)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Account ID already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}