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
    // Get only active accounts for dropdowns
    const activeAccounts = await prisma.account.findMany({
      where: { active: true },
      orderBy: { userid: 'asc' },
      select: {
        userid: true,
        name: true,
        active: true,
      }
    })

    return NextResponse.json(activeAccounts)
  } catch (error) {
    console.error('Failed to fetch active accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch active accounts' }, { status: 500 })
  }
}