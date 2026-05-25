// app/(dashboard)/layout.tsx
'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { MainNav } from '@/components/layout/main-nav'
import { UserNav } from '@/components/layout/user-nav'
import { ClassicShell } from '@/components/classic/primitives'
import { ClassicNav } from '@/components/classic/classic-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    redirect('/login')
  }

  if (session.user?.uiMode === 'classic') {
    return (
      <ClassicShell>
        <ClassicNav />
        <main>{children}</main>
      </ClassicShell>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-12 items-center justify-between">
          <MainNav />
          <div className="flex items-center">
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-1 container py-4">
        {children}
      </main>
    </div>
  )
}
