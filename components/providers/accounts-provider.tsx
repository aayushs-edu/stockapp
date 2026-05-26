// components/providers/accounts-provider.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface Account {
  userid: string
  name: string
  active: boolean
}

export interface StockTransaction {
  id: number
  userid: string
  date: string
  stock: string
  action: string
  source: string | null
  quantity: number
  price: number
  tradeValue: number
  brokerage: number
  orderRef: string | null
  remarks: string | null
  isin: string | null
  account: {
    userid: string
    name: string
  }
}

export interface FullAccount {
  id: number
  userid: string
  name: string
  active: boolean
}

interface AccountsContextType {
  accounts: Account[]
  activeAccounts: Account[]
  allAccounts: FullAccount[]
  loading: boolean
  error: string | null
  refreshAccounts: () => Promise<void>
  selectedAccount: string
  setSelectedAccount: (account: string) => void
  stocks: StockTransaction[]
  stocksLoading: boolean
  refreshStocks: () => Promise<void>
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined)

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccountState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedAccount') ?? ''
    }
    return ''
  })

  const setSelectedAccount = (account: string) => {
    setSelectedAccountState(account)
    if (typeof window !== 'undefined') {
      if (account) {
        localStorage.setItem('selectedAccount', account)
      } else {
        localStorage.removeItem('selectedAccount')
      }
    }
  }
  const [stocks, setStocks] = useState<StockTransaction[]>([])
  const [stocksLoading, setStocksLoading] = useState(true)
  const [allAccounts, setAllAccounts] = useState<FullAccount[]>([])

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

  const fetchStocks = async () => {
    try {
      const response = await fetch('/api/stocks?mode=all')
      if (!response.ok) {
        setStocks([])
        return
      }
      const result = await response.json()
      setStocks(Array.isArray(result) ? result : [])
    } catch {
      setStocks([])
    } finally {
      setStocksLoading(false)
    }
  }

  const fetchAllAccounts = async () => {
    try {
      const response = await fetch('/api/accounts/list')
      if (!response.ok) return
      const result = await response.json()
      setAllAccounts(Array.isArray(result) ? result : [])
    } catch {
      setAllAccounts([])
    }
  }

  const refreshAccounts = async () => {
    setLoading(true)
    await Promise.all([fetchAccounts(), fetchAllAccounts()])
  }

  const refreshStocks = async () => {
    setStocksLoading(true)
    await fetchStocks()
  }

  useEffect(() => {
    if (status === 'authenticated') {
      setLoading(true)
      setStocksLoading(true)
      fetchAccounts()
      fetchStocks()
      fetchAllAccounts()
    } else if (status === 'unauthenticated') {
      setAccounts([])
      setStocks([])
      setAllAccounts([])
      setLoading(false)
      setStocksLoading(false)
    }
  }, [status])

  const activeAccounts = accounts.filter(account => account.active)

  const value: AccountsContextType = {
    accounts,
    activeAccounts,
    allAccounts,
    loading,
    error,
    refreshAccounts,
    selectedAccount,
    setSelectedAccount,
    stocks,
    stocksLoading,
    refreshStocks,
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
