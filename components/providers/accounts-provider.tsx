// components/providers/accounts-provider.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface Account {
  userid: string
  name: string
  active: boolean
}

interface AccountsContextType {
  accounts: Account[]
  activeAccounts: Account[]
  loading: boolean
  error: string | null
  refreshAccounts: () => Promise<void>
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined)

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = async () => {
    try {
      setError(null)
      const response = await fetch('/api/accounts/active')
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }
      
      const result = await response.json()
      if (Array.isArray(result)) {
        setAccounts(result)
      } else {
        setAccounts([])
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const refreshAccounts = async () => {
    setLoading(true)
    await fetchAccounts()
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  // Only return active accounts for dropdowns
  const activeAccounts = accounts.filter(account => account.active)

  const value: AccountsContextType = {
    accounts,
    activeAccounts,
    loading,
    error,
    refreshAccounts
  }

  return (
    <AccountsContext.Provider value={value}>
      {children}
    </AccountsContext.Provider>
  )
}

export function useAccounts() {
  const context = useContext(AccountsContext)
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountsProvider')
  }
  return context
}