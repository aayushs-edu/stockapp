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
    const accounts = await prisma.account.findMany({
      orderBy: { userid: 'asc' },
      select: { id: true, userid: true, name: true, active: true }
    })
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Failed to fetch accounts list:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}
