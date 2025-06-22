// components/providers.tsx
'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/toaster'
import { AccountsProvider } from '@/components/providers/accounts-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AccountsProvider>
        {children}
        <Toaster />
      </AccountsProvider>
    </SessionProvider>
  )
}