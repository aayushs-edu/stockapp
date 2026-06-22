// app/(dashboard)/layout.tsx
'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { MainNav } from '@/components/layout/main-nav'
import { UserNav } from '@/components/layout/user-nav'
import { UiModeToggle } from '@/components/layout/ui-mode-toggle'
import { ClassicShell } from '@/components/classic/primitives'
import { ClassicNav } from '@/components/classic/classic-nav'
import { useUiMode } from '@/lib/ui-mode'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const { mode } = useUiMode()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    redirect('/login')
  }

  const brand = (
    <div className="flex items-center gap-3 shrink-0">
      <Link href="/" className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">StockApp</span>
      </Link>
      <UiModeToggle inline />
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-12 items-center justify-between gap-4">
          {brand}
          {mode === 'classic' ? null : (
            <div className="flex flex-1 items-center justify-end gap-2">
              <MainNav />
              <UserNav />
            </div>
          )}
        </div>
      </header>
      {mode === 'classic' ? (
        <ClassicShell>
          <ClassicNav />
          <main>{children}</main>
        </ClassicShell>
      ) : (
        <main className="flex-1 container py-4">
          {children}
        </main>
      )}
    </div>
  )
}
