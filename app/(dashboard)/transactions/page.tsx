// app/(dashboard)/transactions/page.tsx
'use client'

import { useUiMode } from '@/lib/ui-mode'
import { TransactionsClassic } from '@/components/classic/transactions-classic'
import { TransactionsModern } from '@/components/dashboard/transactions-modern'

export default function TransactionsPage() {
  const { mode } = useUiMode()
  if (mode === 'classic') return <TransactionsClassic />
  return <TransactionsModern />
}
