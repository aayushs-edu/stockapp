'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export type UiMode = 'classic' | 'modern'

const STORAGE_KEY = 'uiMode'

function readStored(): UiMode | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'classic' || v === 'modern' ? v : null
}

interface UiModeContextValue {
  mode: UiMode
  setMode: (m: UiMode) => void
  toggle: () => void
}

const UiModeContext = createContext<UiModeContextValue | null>(null)

export function UiModeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const sessionMode = (session?.user as any)?.uiMode as UiMode | undefined
  const fallback: UiMode = sessionMode ?? 'modern'

  const [mode, setModeState] = useState<UiMode>(fallback)

  useEffect(() => {
    const stored = readStored()
    if (stored) {
      setModeState(stored)
    } else {
      setModeState(fallback)
    }
  }, [fallback])

  const setMode = useCallback((m: UiMode) => {
    setModeState(m)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, m)
    }
  }, [])

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'classic' ? 'modern' : 'classic'
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next)
      }
      return next
    })
  }, [])

  return (
    <UiModeContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </UiModeContext.Provider>
  )
}

export function useUiMode(): UiModeContextValue {
  const ctx = useContext(UiModeContext)
  if (!ctx) {
    throw new Error('useUiMode must be used inside UiModeProvider')
  }
  return ctx
}
