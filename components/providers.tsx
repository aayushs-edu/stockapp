// components/providers.tsx
'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/toaster'
import { AccountsProvider } from '@/components/providers/accounts-provider'
import { UiModeProvider } from '@/lib/ui-mode'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UiModeProvider>
        <AccountsProvider>
          {children}
          <Toaster />
        </AccountsProvider>
      </UiModeProvider>
    </SessionProvider>
  )
}