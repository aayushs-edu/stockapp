// app/(dashboard)/add-stock/page.tsx
'use client'

import { useUiMode } from '@/lib/ui-mode'
import { AddStockClassic } from '@/components/classic/add-stock-classic'
import { AddStockModern } from '@/components/dashboard/add-stock-modern'

export default function AddStockPage() {
  const { mode } = useUiMode()
  if (mode === 'classic') return <AddStockClassic />
  return <AddStockModern />
}
