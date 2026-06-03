'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUiMode } from '@/lib/ui-mode'
import { SummaryClassic } from '@/components/classic/summary-classic'

export default function SummaryPage() {
  const { mode } = useUiMode()
  const router = useRouter()
  const search = useSearchParams()

  useEffect(() => {
    if (mode !== 'classic') {
      const stock = search.get('value') ?? search.get('stock') ?? ''
      router.replace(stock ? `/summary-book?stock=${encodeURIComponent(stock)}` : '/summary-book')
    }
  }, [mode, router, search])

  if (mode !== 'classic') return null
  return <SummaryClassic />
}
