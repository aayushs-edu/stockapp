// app/(dashboard)/transactions/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { TransactionsClassic } from '@/components/classic/transactions-classic'
import { TransactionsModern } from '@/components/dashboard/transactions-modern'

export default function TransactionsPage() {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (session?.user?.uiMode === 'classic') return <TransactionsClassic />
  return <TransactionsModern />
}
