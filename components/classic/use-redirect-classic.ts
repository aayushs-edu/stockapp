'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUiMode } from '@/lib/ui-mode'

export function useRedirectClassic(to: string = '/transactions') {
  const { mode } = useUiMode()
  const router = useRouter()
  useEffect(() => {
    if (mode === 'classic') {
      router.replace(to)
    }
  }, [mode, router, to])
  return mode === 'classic'
}
