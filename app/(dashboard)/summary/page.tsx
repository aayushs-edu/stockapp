// app/(dashboard)/summary/page.tsx
'use client'

import { useUiMode } from '@/lib/ui-mode'
import { SummaryClassic } from '@/components/classic/summary-classic'
import { SummaryModern } from '@/components/dashboard/summary-modern'

export default function SummaryPage() {
  const { mode } = useUiMode()
  if (mode === 'classic') return <SummaryClassic />
  return <SummaryModern />
}
