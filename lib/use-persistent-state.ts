'use client'

import { Dispatch, SetStateAction, useEffect, useState } from 'react'

export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state])
  return [state, setState]
}

export function usePersistentDate(key: string): [Date | undefined, Dispatch<SetStateAction<Date | undefined>>] {
  const [state, setState] = useState<Date | undefined>(() => {
    if (typeof window === 'undefined') return undefined
    try {
      const raw = localStorage.getItem(key)
      if (raw === null || raw === 'null') return undefined
      const d = new Date(JSON.parse(raw))
      return isNaN(d.getTime()) ? undefined : d
    } catch {
      return undefined
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state ? state.toISOString() : null))
    } catch {}
  }, [key, state])
  return [state, setState]
}
