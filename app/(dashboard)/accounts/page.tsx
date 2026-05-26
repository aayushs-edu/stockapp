// app/(dashboard)/accounts/page.tsx
'use client'

import { useUiMode } from '@/lib/ui-mode'
import { AccountsClassic } from '@/components/classic/accounts-classic'
import { AccountsModern } from '@/components/dashboard/accounts-modern'

export default function AccountsPage() {
  const { mode } = useUiMode()
  if (mode === 'classic') return <AccountsClassic />
  return <AccountsModern />
}
