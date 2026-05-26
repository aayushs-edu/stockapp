'use client'

import { useUiMode } from '@/lib/ui-mode'
import { Sparkles, Terminal } from 'lucide-react'

export function UiModeToggle() {
  const { mode, toggle } = useUiMode()
  const goingTo = mode === 'classic' ? 'New' : 'Old'
  const label = mode === 'classic' ? 'New' : 'Old'
  const Icon = mode === 'classic' ? Sparkles : Terminal

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${goingTo} UI`}
      aria-label={`Switch to ${goingTo} UI`}
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-neutral-300 bg-white/95 backdrop-blur text-neutral-800 text-xs font-medium shadow-sm hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  )
}
