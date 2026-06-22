'use client'

import { useUiMode } from '@/lib/ui-mode'

export function UiModeToggle({ inline = false }: { inline?: boolean } = {}) {
  const { mode, toggle } = useUiMode()
  const goingTo = mode === 'classic' ? 'New' : 'Old'
  const label = mode === 'classic' ? 'New' : 'Old'

  const positionClass = inline
    ? ''
    : 'fixed top-2 left-1/2 -translate-x-1/2 z-[60]'

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${goingTo} UI`}
      aria-label={`Switch to ${goingTo} UI`}
      className={`${positionClass} inline-flex items-center px-2 py-0.5 rounded-md border border-border bg-background text-foreground text-xs font-medium hover:bg-muted transition-colors`}
    >
      {label}
    </button>
  )
}
