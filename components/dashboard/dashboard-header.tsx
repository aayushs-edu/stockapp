// components/dashboard/dashboard-header.tsx
'use client'

import { useLanguage } from '@/contexts/language-context'

export function DashboardHeader() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {t.dashboard.title}
        </h1>
        <p className="text-muted-foreground">
          {t.dashboard.subtitle}
        </p>
      </div>
      <div className="text-sm text-muted-foreground">
        {t.dashboard.lastUpdated}: {new Date().toLocaleString()}
      </div>
    </div>
  )
}