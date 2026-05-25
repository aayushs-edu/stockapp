// app/(dashboard)/profit-loss/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { ProfitLossClassic } from '@/components/classic/profit-loss-classic'
import { ProfitLossModern } from '@/components/dashboard/profit-loss-modern'

export default function ProfitLossPage() {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (session?.user?.uiMode === 'classic') return <ProfitLossClassic />
  return <ProfitLossModern />
}
