// app/(dashboard)/profit-loss/page.tsx
'use client'

import { useUiMode } from '@/lib/ui-mode'
import { ProfitLossClassic } from '@/components/classic/profit-loss-classic'
import { ProfitLossModern } from '@/components/dashboard/profit-loss-modern'

export default function ProfitLossPage() {
  const { mode } = useUiMode()
  if (mode === 'classic') return <ProfitLossClassic />
  return <ProfitLossModern />
}
