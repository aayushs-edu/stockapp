// app/(dashboard)/add-stock/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { AddStockClassic } from '@/components/classic/add-stock-classic'
import { AddStockModern } from '@/components/dashboard/add-stock-modern'

export default function AddStockPage() {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (session?.user?.uiMode === 'classic') return <AddStockClassic />
  return <AddStockModern />
}
