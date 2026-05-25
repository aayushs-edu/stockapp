// app/(dashboard)/summary/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { SummaryClassic } from '@/components/classic/summary-classic'
import { SummaryModern } from '@/components/dashboard/summary-modern'

export default function SummaryPage() {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (session?.user?.uiMode === 'classic') return <SummaryClassic />
  return <SummaryModern />
}
