// app/(dashboard)/accounts/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { AccountsClassic } from '@/components/classic/accounts-classic'
import { AccountsModern } from '@/components/dashboard/accounts-modern'

export default function AccountsPage() {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (session?.user?.uiMode === 'classic') return <AccountsClassic />
  return <AccountsModern />
}
