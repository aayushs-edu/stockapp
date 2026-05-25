'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function useRedirectClassic(to: string = '/transactions') {
  const { data: session, status } = useSession()
  const router = useRouter()
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.uiMode === 'classic') {
      router.replace(to)
    }
  }, [status, session, router, to])
  return session?.user?.uiMode === 'classic'
}
