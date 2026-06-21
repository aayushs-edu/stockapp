// app/(dashboard)/summary-book/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight, Download, TrendingUp, TrendingDown, Loader2, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker'
import { useAccounts } from '@/components/providers/accounts-provider'
import { useUiMode } from '@/lib/ui-mode'
import { SecondPageClassic } from '@/components/classic/second-page-classic'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'

type Transaction = {
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
  account: {
    userid: string
    name: string
  }
}

type AccountSummary = {
  userid: string
  name: string
  buyQty: number
  sellQty: number
  netQty: number
  avgBuyPrice: number
  avgSellPrice: number
  totalBuyValue: number
  totalSellValue: number
  totalBrokerage: number
  transactions: Transaction[]
  remainingTransactions?: Transaction[]
  intradayQtyById?: Map<number, number>
}

type StockSummary = {
  stock: string
  totalBuyQty: number
  totalSellQty: number
  totalNetQty: number
  avgBuyPrice: number
  avgSellPrice: number
  totalBuyValue: number
  totalSellValue: number
  totalBrokerage: number
  accounts: AccountSummary[]
}

// Helper component for P/L/I display
const PLIDisplay = ({ value, type }: { value: number, type: 'profit' | 'loss' | 'investment' }) => {
  const getColorClass = () => {
    switch (type) {
      case 'profit': return 'text-emerald-600 dark:text-emerald-400'
      case 'loss': return 'text-red-600 dark:text-red-400'
      case 'investment': return 'text-amber-600 dark:text-amber-400'
    }
  }

  const getPrefix = () => {
    switch (type) {
      case 'profit': return '+'
      case 'loss': return '-'
      case 'investment': return ''
    }
  }

  return (
    <span className={getColorClass()}>
      {getPrefix()}{formatCurrency(Math.abs(value))}
    </span>
  )
}

export default function SummaryBookPage() {
  const { mode } = useUiMode()
  if (mode === 'classic') return <SecondPageClassic />
  return <SummaryBookModern />
}

function SummaryBookModern() {
  const searchParams = useSearchParams()
  const stockFromUrl = searchParams.get('stock')
  
  const { accounts, activeAccounts, loading: accountsLoading, selectedAccount, setSelectedAccount, stocks, stocksLoading, refreshStocks } = useAccounts()
  const { toast } = useToast()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditDialogOpen(true)
  }

  const handleDeleteTransaction = (transaction: Transaction) => {
    setDeletingTransaction(transaction)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteTransaction = async () => {
    if (!deletingTransaction) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/stocks/${deletingTransaction.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete transaction')
      }
      toast({ title: 'Transaction deleted', description: `ID ${deletingTransaction.id} removed.` })
      setDeleteDialogOpen(false)
      setDeletingTransaction(null)
      refreshStocks()
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message || 'Unknown error', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }
  const data = stocks as Transaction[]
  const loading = stocksLoading
  const accountFilter = selectedAccount
  const setAccountFilter = setSelectedAccount
  const [stockFilter, setStockFilter] = useState<string>(stockFromUrl || '')
  const [holdingFilter, setHoldingFilter] = useState<string>('all')
  const [stockSearchOpen, setStockSearchOpen] = useState(false)
  const [stockSearchValue, setStockSearchValue] = useState('')
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [expandedStocks, setExpandedStocks] = useState<Set<string>>(new Set())
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  // Get unique stocks for autocomplete
  const uniqueStocks = useMemo(() => {
    const stocks = new Set(data.map(t => t.stock))
    return Array.from(stocks).sort()
  }, [data])

  // Immediate auto-selection when stock comes from URL
  useEffect(() => {
    if (stockFromUrl && !accountFilter) {
      setAccountFilter('all-accounts')
    }
  }, [stockFromUrl, accountFilter])

  // Auto-expand if stock filter is set from URL
  useEffect(() => {
    if (stockFromUrl && data.length > 0) {
      setExpandedStocks(new Set([stockFromUrl]))
    }
  }, [stockFromUrl, data])

  // FIFO calculation for remaining shares. Same-day buys and sells (by IST
  // calendar date) are netted against each other first — that residual is
  // intraday and never reaches holdings. Leftover same-day buys flow into
  // the regular FIFO pool as holdings; leftover same-day sells consume
  // older inventory.

  // Data is entered in India; key by IST calendar date (UTC+5:30) so a
  // buy/sell pair entered on the same Indian day are grouped together
  // regardless of how the timestamps land in the viewer's timezone.
  const istDateKey = (d: string) => {
    const ms = new Date(d).getTime() + 5.5 * 60 * 60 * 1000
    const ist = new Date(ms)
    return `${ist.getUTCFullYear()}-${ist.getUTCMonth()}-${ist.getUTCDate()}`
  }

  const calculateRemainingTransactions = (
    buyTransactions: Transaction[],
    sellTransactions: Transaction[]
  ): { remaining: Transaction[]; intradayQtyById: Map<number, number> } => {
    const byDateAsc = (a: Transaction, b: Transaction) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()

    const intradayQtyById = new Map<number, number>()
    const addIntraday = (id: number, qty: number) => {
      if (qty <= 0) return
      intradayQtyById.set(id, (intradayQtyById.get(id) ?? 0) + qty)
    }

    // Group by IST date so we can detect same-day pairs.
    const buysByDate = new Map<string, Transaction[]>()
    buyTransactions.forEach(t => {
      const k = istDateKey(t.date)
      if (!buysByDate.has(k)) buysByDate.set(k, [])
      buysByDate.get(k)!.push(t)
    })
    const sellsByDate = new Map<string, Transaction[]>()
    sellTransactions.forEach(t => {
      const k = istDateKey(t.date)
      if (!sellsByDate.has(k)) sellsByDate.set(k, [])
      sellsByDate.get(k)!.push(t)
    })

    const regularBuys: Transaction[] = []
    const regularSells: Transaction[] = []

    // Carves `intradayQty` off the front of `txs` (the matched portion is
    // recorded per-tx in `intradayQtyById` and dropped from holdings); the
    // remainder is pushed into `regularBucket`.
    const carve = (txs: Transaction[], intradayQty: number, regularBucket: Transaction[]) => {
      let remaining = intradayQty
      for (const tx of txs) {
        if (remaining <= 0) {
          regularBucket.push(tx)
        } else if (remaining >= tx.quantity) {
          addIntraday(tx.id, tx.quantity)
          remaining -= tx.quantity
        } else {
          addIntraday(tx.id, remaining)
          regularBucket.push({ ...tx, quantity: tx.quantity - remaining })
          remaining = 0
        }
      }
    }

    // Within a day: first pair off exact-quantity buy/sell matches (so a
    // buy 25 + sell 25 round-trip on the same day is recognised even if
    // there's another unrelated sell that day). Then greedy-carve the
    // remainder by smallest qty first.
    const byQtyAsc = (a: Transaction, b: Transaction) => a.quantity - b.quantity
    const qtyEq = (a: number, b: number) => Math.abs(a - b) < 1e-9

    const allDates = new Set<string>([...buysByDate.keys(), ...sellsByDate.keys()])
    allDates.forEach(date => {
      const buys = [...(buysByDate.get(date) ?? [])]
      const sells = [...(sellsByDate.get(date) ?? [])]
      const usedBuys = new Set<number>()
      const usedSells = new Set<number>()
      for (let i = 0; i < buys.length; i++) {
        for (let j = 0; j < sells.length; j++) {
          if (usedSells.has(j)) continue
          if (qtyEq(buys[i].quantity, sells[j].quantity)) {
            addIntraday(buys[i].id, buys[i].quantity)
            addIntraday(sells[j].id, sells[j].quantity)
            usedBuys.add(i)
            usedSells.add(j)
            break
          }
        }
      }
      const restBuys = buys.filter((_, i) => !usedBuys.has(i)).sort(byQtyAsc)
      const restSells = sells.filter((_, j) => !usedSells.has(j)).sort(byQtyAsc)
      const buyQty = restBuys.reduce((s, t) => s + t.quantity, 0)
      const sellQty = restSells.reduce((s, t) => s + t.quantity, 0)
      const intradayQty = Math.min(buyQty, sellQty)
      carve(restBuys, intradayQty, regularBuys)
      carve(restSells, intradayQty, regularSells)
    })

    // Regular FIFO pool: leftover buys consumed by leftover sells, oldest first.
    const sortedBuys = [...regularBuys].sort(byDateAsc)
    let remainingSoldQty = regularSells.reduce((s, t) => s + t.quantity, 0)

    const result: Transaction[] = []
    for (const buy of sortedBuys) {
      if (remainingSoldQty <= 0) {
        result.push(buy)
      } else if (remainingSoldQty >= buy.quantity) {
        remainingSoldQty -= buy.quantity
      } else {
        result.push({ ...buy, quantity: buy.quantity - remainingSoldQty })
        remainingSoldQty = 0
      }
    }
    return { remaining: result, intradayQtyById }
  }

  // Process data into hierarchical structure
  const stockSummaries = useMemo(() => {
    const summaryMap = new Map<string, StockSummary>()
    
    // Filter data by date range first
    let filteredData = data
    if (dateFrom) {
      filteredData = filteredData.filter(t => new Date(t.date) >= dateFrom)
    }
    if (dateTo) {
      filteredData = filteredData.filter(t => new Date(t.date) <= dateTo)
    }
    
    // Group transactions by stock and account
    filteredData.forEach(transaction => {
      let stockSummary = summaryMap.get(transaction.stock)
      if (!stockSummary) {
        stockSummary = {
          stock: transaction.stock,
          totalBuyQty: 0,
          totalSellQty: 0,
          totalNetQty: 0,
          avgBuyPrice: 0,
          avgSellPrice: 0,
          totalBuyValue: 0,
          totalSellValue: 0,
          totalBrokerage: 0,
          accounts: []
        }
        summaryMap.set(transaction.stock, stockSummary)
      }

      // Find or create account summary
      let accountSummary = stockSummary.accounts.find(a => a.userid === transaction.userid)
      if (!accountSummary) {
        accountSummary = {
          userid: transaction.userid,
          name: transaction.account?.name || transaction.userid,
          buyQty: 0,
          sellQty: 0,
          netQty: 0,
          avgBuyPrice: 0,
          avgSellPrice: 0,
          totalBuyValue: 0,
          totalSellValue: 0,
          totalBrokerage: 0,
          transactions: []
        }
        stockSummary.accounts.push(accountSummary)
      }

      // Add transaction to account
      accountSummary.transactions.push(transaction)

      // Update account summary
      if (transaction.action === 'Buy') {
        accountSummary.buyQty += transaction.quantity
        accountSummary.totalBuyValue += transaction.tradeValue
      } else {
        accountSummary.sellQty += transaction.quantity
        accountSummary.totalSellValue += transaction.tradeValue
      }
      accountSummary.totalBrokerage += transaction.brokerage
      accountSummary.netQty = accountSummary.buyQty - accountSummary.sellQty
      accountSummary.avgBuyPrice = accountSummary.buyQty > 0 ? accountSummary.totalBuyValue / accountSummary.buyQty : 0
      accountSummary.avgSellPrice = accountSummary.sellQty > 0 ? accountSummary.totalSellValue / accountSummary.sellQty : 0
    })

    // Calculate remaining transactions for each account
    summaryMap.forEach((stockSummary) => {
      stockSummary.accounts.forEach(account => {
        const buyTransactions = account.transactions.filter(t => t.action === 'Buy')
        const sellTransactions = account.transactions.filter(t => t.action !== 'Buy')
        const { remaining, intradayQtyById } = calculateRemainingTransactions(buyTransactions, sellTransactions)
        account.remainingTransactions = remaining
        account.intradayQtyById = intradayQtyById
      })
    })

    // Calculate stock-level summaries
    summaryMap.forEach((stockSummary) => {
      stockSummary.accounts.forEach(account => {
        stockSummary.totalBuyQty += account.buyQty
        stockSummary.totalSellQty += account.sellQty
        stockSummary.totalBuyValue += account.totalBuyValue
        stockSummary.totalSellValue += account.totalSellValue
        stockSummary.totalBrokerage += account.totalBrokerage
      })
      stockSummary.totalNetQty = stockSummary.totalBuyQty - stockSummary.totalSellQty
      stockSummary.avgBuyPrice = stockSummary.totalBuyQty > 0 ? stockSummary.totalBuyValue / stockSummary.totalBuyQty : 0
      stockSummary.avgSellPrice = stockSummary.totalSellQty > 0 ? stockSummary.totalSellValue / stockSummary.totalSellQty : 0

      // Sort transactions within each account by date descending
      stockSummary.accounts.forEach(account => {
        account.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      })
    })

    // Convert to array and sort
    let summaries = Array.from(summaryMap.values())
    
    // Filter based on account filter and stock filter
    let filteredSummaries = summaries
    
    // If a specific account is selected, only show stocks that account has traded
    if (accountFilter && accountFilter !== 'all-accounts' && accountFilter !== 'active-accounts') {
      filteredSummaries = summaries.filter(stock => 
        stock.accounts.some(account => account.userid === accountFilter)
      ).map(stock => ({
        ...stock,
        // Filter accounts to only show the selected account
        accounts: stock.accounts.filter(account => account.userid === accountFilter)
      }))
      
      // Recalculate stock-level summaries for the filtered account
      filteredSummaries = filteredSummaries.map(stock => {
        const totalBuyQty = stock.accounts.reduce((sum, acc) => sum + acc.buyQty, 0)
        const totalSellQty = stock.accounts.reduce((sum, acc) => sum + acc.sellQty, 0)
        const totalBuyValue = stock.accounts.reduce((sum, acc) => sum + acc.totalBuyValue, 0)
        const totalSellValue = stock.accounts.reduce((sum, acc) => sum + acc.totalSellValue, 0)
        const totalBrokerage = stock.accounts.reduce((sum, acc) => sum + acc.totalBrokerage, 0)
        
        return {
          ...stock,
          totalBuyQty,
          totalSellQty,
          totalNetQty: totalBuyQty - totalSellQty,
          totalBuyValue,
          totalSellValue,
          totalBrokerage,
          avgBuyPrice: totalBuyQty > 0 ? totalBuyValue / totalBuyQty : 0,
          avgSellPrice: totalSellQty > 0 ? totalSellValue / totalSellQty : 0
        }
      })
    } else if (accountFilter === 'active-accounts') {
      // Filter to only show active accounts
      const activeAccountIds = new Set(activeAccounts.map(acc => acc.userid))
      filteredSummaries = summaries.filter(stock => 
        stock.accounts.some(account => activeAccountIds.has(account.userid))
      ).map(stock => ({
        ...stock,
        // Filter accounts to only show active accounts
        accounts: stock.accounts.filter(account => activeAccountIds.has(account.userid))
      }))
      
      // Recalculate stock-level summaries for active accounts only
      filteredSummaries = filteredSummaries.map(stock => {
        const totalBuyQty = stock.accounts.reduce((sum, acc) => sum + acc.buyQty, 0)
        const totalSellQty = stock.accounts.reduce((sum, acc) => sum + acc.sellQty, 0)
        const totalBuyValue = stock.accounts.reduce((sum, acc) => sum + acc.totalBuyValue, 0)
        const totalSellValue = stock.accounts.reduce((sum, acc) => sum + acc.totalSellValue, 0)
        const totalBrokerage = stock.accounts.reduce((sum, acc) => sum + acc.totalBrokerage, 0)
        
        return {
          ...stock,
          totalBuyQty,
          totalSellQty,
          totalNetQty: totalBuyQty - totalSellQty,
          totalBuyValue,
          totalSellValue,
          totalBrokerage,
          avgBuyPrice: totalBuyQty > 0 ? totalBuyValue / totalBuyQty : 0,
          avgSellPrice: totalSellQty > 0 ? totalSellValue / totalSellQty : 0
        }
      })
    }
    // For 'all-accounts', we show all data as-is
    
    // Apply stock filter if set
    if (stockFilter) {
      filteredSummaries = filteredSummaries.filter(stock => stock.stock === stockFilter)
    }
    
    // Apply holding filter
    if (holdingFilter === 'holding') {
      filteredSummaries = filteredSummaries.filter(stock => stock.totalNetQty > 0)
    } else if (holdingFilter === 'closed') {
      filteredSummaries = filteredSummaries.filter(stock => stock.totalNetQty <= 0)
    }
    
    return filteredSummaries.sort((a, b) => a.stock.localeCompare(b.stock))
  }, [data, accountFilter, stockFilter, holdingFilter, dateFrom, dateTo, activeAccounts])

  const toggleStockExpansion = (stock: string) => {
    const newExpanded = new Set(expandedStocks)
    if (newExpanded.has(stock)) {
      newExpanded.delete(stock)
      // Also collapse all accounts under this stock
      const accountKeys = Array.from(expandedAccounts).filter(key => key.startsWith(`${stock}-`))
      accountKeys.forEach(key => expandedAccounts.delete(key))
      setExpandedAccounts(new Set(expandedAccounts))
    } else {
      newExpanded.add(stock)
    }
    setExpandedStocks(newExpanded)
  }

  const toggleAccountExpansion = (stock: string, userid: string) => {
    const key = `${stock}-${userid}`
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedAccounts(newExpanded)
  }

  const exportToCSV = () => {
    const csvRows = []
    const headers = ['Stock', 'Account', 'Account Name', 'Date', 'Action', 'Quantity', 'Price', 'Trade Value', 'Brokerage', 'Net Value', 'Order Ref', 'Remarks']
    csvRows.push(headers.join(','))

    stockSummaries.forEach(stock => {
      stock.accounts.forEach(account => {
        account.transactions.forEach(transaction => {
          const netValue = transaction.action === 'Buy' 
            ? transaction.tradeValue + transaction.brokerage 
            : transaction.tradeValue - transaction.brokerage
          
          const row = [
            transaction.stock,
            transaction.userid,
            account.name,
            format(new Date(transaction.date), 'dd/MM/yyyy'),
            transaction.action,
            transaction.quantity,
            transaction.price,
            transaction.tradeValue,
            transaction.brokerage,
            netValue,
            transaction.orderRef || '',
            transaction.remarks || ''
          ]
          csvRows.push(row.join(','))
        })
      })
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `summary_book_${format(new Date(), 'dd-MM-yyyy')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const calculateOverallSummary = () => {
    let totalBuyValue = 0
    let totalSellValue = 0
    let totalBrokerage = 0
    let uniqueStocks = stockSummaries.length
    let activePositions = 0
    let currentInvestment = 0
    let realizedPnL = 0

    stockSummaries.forEach(stock => {
      totalBuyValue += stock.totalBuyValue
      totalSellValue += stock.totalSellValue
      totalBrokerage += stock.totalBrokerage
      
      if (stock.totalNetQty > 0) {
        activePositions++
        currentInvestment += stock.totalNetQty * stock.avgBuyPrice
      }
      
      if (stock.totalSellQty > 0) {
        realizedPnL += stock.totalSellValue - (stock.avgBuyPrice * stock.totalSellQty)
      }
    })

    return {
      totalBuyValue,
      totalSellValue,
      totalBrokerage,
      currentInvestment,
      realizedPnL,
      uniqueStocks,
      activePositions
    }
  }

  const summary = calculateOverallSummary()

  // Helper function to get account display text
  const getAccountDisplayText = () => {
    if (!accountFilter) return null
    
    if (accountFilter === 'all-accounts') {
      return 'all accounts'
    } else if (accountFilter === 'active-accounts') {
      return 'active accounts'
    } else {
      return accountFilter
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Summary Book
            {accountFilter && (
              <span className="text-muted-foreground"> for </span>
            )}
            {getAccountDisplayText() && (
              <span className="text-primary">{getAccountDisplayText()}</span>
            )}
          </h1>
          {accountFilter && (
            <p className="text-sm text-muted-foreground mt-1">
              {accountFilter === 'all-accounts' 
                ? `Consolidated view from all ${accounts.length} accounts (active and inactive)`
                : accountFilter === 'active-accounts'
                ? `Consolidated view from ${activeAccounts.length} active accounts`
                : `Detailed breakdown for ${activeAccounts.find(acc => acc.userid === accountFilter)?.name || accountFilter}`
              }
            </p>
          )}
        </div>
        <Button onClick={exportToCSV} disabled={!accountFilter || stockSummaries.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Compact Summary Stats */}
      {accountFilter && stockSummaries.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Total Investment</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{formatCurrency(summary.totalBuyValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Total Returns</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{formatCurrency(summary.totalSellValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Current Investment</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold text-amber-600">
                {formatCurrency(summary.currentInvestment)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Realized P/L</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">
                <PLIDisplay 
                  value={summary.realizedPnL} 
                  type={summary.realizedPnL >= 0 ? 'profit' : 'loss'} 
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Total Brokerage</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{formatCurrency(summary.totalBrokerage)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Active Positions</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{summary.activePositions}</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Account Dropdown - Updated to use global accounts */}
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger>
                <SelectValue placeholder={accountsLoading ? "Loading..." : "Select Account"} />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {accountsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm">Loading accounts...</span>
                  </div>
                ) : activeAccounts.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No active accounts found
                  </div>
                ) : (
                  <>
                    {/* Individual active accounts */}
                    {activeAccounts.map((account) => (
                      <SelectItem key={account.userid} value={account.userid}>
                        {account.userid} - {account.name}
                      </SelectItem>
                    ))}
                    {/* Separator and aggregate options */}
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                      Aggregate Views
                    </div>
                    <SelectItem value="active-accounts">All Active Accounts</SelectItem>
                    <SelectItem value="all-accounts">All Accounts</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            
            {/* Stock Autocomplete */}
            <Popover open={stockSearchOpen} onOpenChange={setStockSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={stockSearchOpen}
                  className="justify-between"
                >
                  {stockFilter || "Select stock..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <div className="flex flex-col">
                  <Input
                    placeholder="Search stock..."
                    value={stockSearchValue}
                    onChange={(e) => setStockSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      const term = stockSearchValue.trim()
                      if (!term) return
                      const matches = uniqueStocks.filter(s =>
                        s.toLowerCase().includes(term.toLowerCase())
                      )
                      // Prefer an exact symbol match; otherwise accept a lone candidate.
                      const chosen =
                        uniqueStocks.find(s => s.toLowerCase() === term.toLowerCase()) ??
                        (matches.length === 1 ? matches[0] : undefined)
                      if (chosen) {
                        setStockFilter(chosen)
                        setStockSearchOpen(false)
                        setStockSearchValue('')
                      }
                    }}
                    className="m-2"
                  />
                  <div className="max-h-[200px] overflow-y-auto">
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-2 py-1.5 text-sm"
                      onClick={() => {
                        setStockFilter('')
                        setStockSearchOpen(false)
                        setStockSearchValue('')
                      }}
                    >
                      All Stocks
                    </Button>
                    {uniqueStocks
                      .filter(stock => 
                        stock.toLowerCase().includes(stockSearchValue.toLowerCase())
                      )
                      .map((stock) => (
                        <Button
                          key={stock}
                          variant="ghost"
                          className="w-full justify-start px-2 py-1.5 text-sm hover:bg-accent"
                          onClick={() => {
                            setStockFilter(stock)
                            setStockSearchOpen(false)
                            setStockSearchValue('')
                          }}
                        >
                          {stock}
                        </Button>
                      ))}
                    {uniqueStocks.filter(stock => 
                      stock.toLowerCase().includes(stockSearchValue.toLowerCase())
                    ).length === 0 && (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No stock found.
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Holding Status Filter */}
            <Select value={holdingFilter} onValueChange={setHoldingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Position Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="holding">Holding Only</SelectItem>
                <SelectItem value="closed">Closed Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter with Enhanced Date Picker */}
            <div className="flex gap-2 md:col-span-2">
              <EnhancedDatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="From date"
                className="flex-1"
              />
              
              <EnhancedDatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder="To date"
                className="flex-1"
              />
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(accountFilter || stockFilter || holdingFilter !== 'all' || dateFrom || dateTo) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAccountFilter('')
                  setStockFilter('')
                  setHoldingFilter('all')
                  setDateFrom(undefined)
                  setDateTo(undefined)
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!accountFilter ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>Please select an account to view summary</p>
              <p className="text-sm mt-2">You can choose individual accounts or aggregate views</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Summary Table */
        <Card>
          <CardContent className="p-0">
            {/* Show loading state when navigating from stock grid */}
            {stockFromUrl && loading && !data.length ? (
              <div className="py-12">
                <div className="text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading data for {stockFromUrl}...</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="h-10">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Stock / Account</TableHead>
                    <TableHead className="text-right">Buy Qty</TableHead>
                    <TableHead className="text-right">Sell Qty</TableHead>
                    <TableHead className="text-right bg-blue-50 dark:bg-blue-950/20">
                      <span className="text-blue-700 dark:text-blue-300 font-semibold">Shares Remaining</span>
                    </TableHead>
                    <TableHead className="text-right">Avg Buy Price</TableHead>
                    <TableHead className="text-right">Avg Sell Price</TableHead>
                    <TableHead className="text-right">Total Buy Value</TableHead>
                    <TableHead className="text-right">Total Sell Value</TableHead>
                    <TableHead className="text-right">Brokerage</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : stockSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockSummaries.map((stock) => (
                      <>
                        {/* Level 1: Stock Summary Row */}
                        <TableRow 
                          key={stock.stock}
                          className="font-semibold bg-muted/50 hover:bg-muted cursor-pointer h-8"
                          onClick={() => toggleStockExpansion(stock.stock)}
                        >
                          <TableCell className="py-1">
                            {expandedStocks.has(stock.stock) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-semibold py-1">{stock.stock}</TableCell>
                          <TableCell className="text-right py-1">{stock.totalBuyQty.toFixed(2)}</TableCell>
                          <TableCell className="text-right py-1">{stock.totalSellQty.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold py-1 bg-blue-50 dark:bg-blue-950/20">
                            <span className="text-blue-700 dark:text-blue-300">
                              {stock.totalNetQty.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-1">{formatCurrency(stock.avgBuyPrice)}</TableCell>
                          <TableCell className="text-right py-1">
                            {stock.avgSellPrice > 0 ? formatCurrency(stock.avgSellPrice) : '-'}
                          </TableCell>
                          <TableCell className="text-right py-1">{formatCurrency(stock.totalBuyValue)}</TableCell>
                          <TableCell className="text-right py-1">{formatCurrency(stock.totalSellValue)}</TableCell>
                          <TableCell className="text-right py-1">{formatCurrency(stock.totalBrokerage)}</TableCell>
                          <TableCell className="text-right py-1">
                            <Badge variant={stock.totalNetQty > 0 ? 'default' : 'secondary'}>
                              {stock.totalNetQty > 0 ? 'Holding' : 'Closed'}
                            </Badge>
                          </TableCell>
                        </TableRow>

                        {/* Level 2: Account Summary Rows */}
                        {expandedStocks.has(stock.stock) && stock.accounts.map((account) => {
                          const accountKey = `${stock.stock}-${account.userid}`
                          const isAccountExpanded = expandedAccounts.has(accountKey)
                          
                          return (
                            <>
                              <TableRow 
                                key={accountKey}
                                className="hover:bg-muted/30 cursor-pointer h-8"
                                onClick={() => toggleAccountExpansion(stock.stock, account.userid)}
                              >
                                <TableCell className="pl-8 py-1">
                                  {isAccountExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </TableCell>
                                <TableCell className="pl-8 py-1">
                                  <div className="flex items-center gap-2">
                                    <span>{account.userid}</span>
                                    <span className="text-sm text-muted-foreground">({account.name})</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-1">{account.buyQty.toFixed(2)}</TableCell>
                                <TableCell className="text-right py-1">{account.sellQty.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium py-1 bg-blue-50 dark:bg-blue-950/20">
                                  <span className="text-blue-700 dark:text-blue-300">
                                    {account.netQty.toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right py-1">{formatCurrency(account.avgBuyPrice)}</TableCell>
                                <TableCell className="text-right py-1">
                                  {account.avgSellPrice > 0 ? formatCurrency(account.avgSellPrice) : '-'}
                                </TableCell>
                                <TableCell className="text-right py-1">{formatCurrency(account.totalBuyValue)}</TableCell>
                                <TableCell className="text-right py-1">{formatCurrency(account.totalSellValue)}</TableCell>
                                <TableCell className="text-right py-1">{formatCurrency(account.totalBrokerage)}</TableCell>
                                <TableCell className="text-right py-1">
                                  <Badge variant={account.netQty > 0 ? 'default' : 'secondary'} className="text-xs">
                                    {account.netQty > 0 ? 'Active' : 'Closed'}
                                  </Badge>
                                </TableCell>
                              </TableRow>

                              {/* Level 3: Individual Transaction Rows */}
                              {isAccountExpanded && (
                                <TableRow>
                                  <TableCell colSpan={11} className="p-0">
                                    <div className="bg-muted/20 p-4">
                                      {/* Redundant FIFO "Remaining Shares Distribution" block — commented out per request.
                                          Kept here in case we need to bring it back later. */}
                                      {/* {account.netQty > 0 && account.remainingTransactions && account.remainingTransactions.length > 0 && (
                                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                            Remaining Shares Distribution (FIFO):
                                          </h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {account.remainingTransactions.map((tx, idx) => (
                                              <div key={`${tx.id}-${idx}`} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                                                <div className="font-mono">#{tx.id}</div>
                                                <div>{format(new Date(tx.date), 'dd/MM/yyyy')}</div>
                                                <div className="font-semibold text-blue-700 dark:text-blue-300">
                                                  {tx.quantity} shares @ {formatCurrency(tx.price)}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )} */}

                                      <Table>
                                        <TableHeader>
                                          <TableRow className="h-8">
                                            <TableHead className="w-28 py-1">ID</TableHead>
                                            <TableHead className="py-1">Date</TableHead>
                                            <TableHead className="py-1">Action</TableHead>
                                            <TableHead className="py-1">Source</TableHead>
                                            <TableHead className="text-right py-1">Quantity</TableHead>
                                            <TableHead className="text-right py-1">Price</TableHead>
                                            <TableHead className="text-right py-1">Trade Value</TableHead>
                                            <TableHead className="text-right py-1">Brokerage</TableHead>
                                            <TableHead className="text-right py-1">Net Value</TableHead>
                                            <TableHead className="py-1">Remarks</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {account.transactions.map((transaction) => {
                                            const netValue = transaction.action === 'Buy' 
                                              ? transaction.tradeValue + transaction.brokerage 
                                              : transaction.tradeValue - transaction.brokerage
                                            
                                            // Check if this transaction contains remaining shares
                                            const remainingTransaction = account.remainingTransactions?.find(
                                              remainingTx => remainingTx.id === transaction.id
                                            )
                                            const isRemainingTransaction = !!remainingTransaction
                                            const isFullySold = transaction.action === 'Buy' && !isRemainingTransaction
                                            const isPartiallySold = transaction.action === 'Buy' &&
                                              remainingTransaction &&
                                              remainingTransaction.quantity < transaction.quantity
                                            const intradayQty = account.intradayQtyById?.get(transaction.id) ?? 0
                                            const isFullyIntraday = intradayQty > 0 && intradayQty >= transaction.quantity
                                            const isPartiallyIntraday = intradayQty > 0 && intradayQty < transaction.quantity
                                            
                                            return (
                                              <TableRow
                                                key={transaction.id}
                                                className={cn(
                                                  "hover:bg-muted/30 h-8",
                                                  isRemainingTransaction && transaction.action === 'Buy' &&
                                                  "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500",
                                                  (isFullySold || (transaction.action === 'Buy' && intradayQty > 0 && !isRemainingTransaction)) && "opacity-50"
                                                )}
                                              >
                                                <TableCell className="font-mono text-xs py-1">
                                                  <div className="flex items-center gap-1">
                                                    <span>#{transaction.id}</span>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6 opacity-60 hover:opacity-100"
                                                      onClick={() => handleEditTransaction(transaction)}
                                                      title="Edit transaction"
                                                    >
                                                      <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6 opacity-60 hover:opacity-100 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950"
                                                      onClick={() => handleDeleteTransaction(transaction)}
                                                      title="Delete transaction"
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                  {isRemainingTransaction && transaction.action === 'Buy' && (
                                                    <div className="text-blue-600 dark:text-blue-400 text-[10px]">
                                                      {isPartiallySold
                                                        ? `${remainingTransaction.quantity}/${transaction.quantity} LEFT`
                                                        : 'HOLDING'
                                                      }
                                                    </div>
                                                  )}
                                                  {intradayQty > 0 && (
                                                    <div className="text-amber-600 dark:text-amber-400 text-[10px]">
                                                      {isFullyIntraday
                                                        ? 'INTRADAY'
                                                        : `${intradayQty}/${transaction.quantity} INTRADAY`
                                                      }
                                                    </div>
                                                  )}
                                                  {isFullySold && intradayQty === 0 && (
                                                    <div className="text-gray-500 text-[10px]">SOLD</div>
                                                  )}
                                                </TableCell>
                                                <TableCell className="py-1">{format(new Date(transaction.date), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="py-1">
                                                  <Badge 
                                                    variant={transaction.action === 'Buy' ? 'default' : 'secondary'} 
                                                    className="text-xs"
                                                  >
                                                    {transaction.action === 'Buy' ? (
                                                      <TrendingDown className="h-3 w-3 mr-1" />
                                                    ) : (
                                                      <TrendingUp className="h-3 w-3 mr-1" />
                                                    )}
                                                    {transaction.action}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell className="py-1">{transaction.source || '-'}</TableCell>
                                                <TableCell className="text-right py-1">{transaction.quantity}</TableCell>
                                                <TableCell className="text-right py-1">{formatCurrency(transaction.price)}</TableCell>
                                                <TableCell className="text-right py-1">{formatCurrency(transaction.tradeValue)}</TableCell>
                                                <TableCell className="text-right py-1">{formatCurrency(transaction.brokerage)}</TableCell>
                                                <TableCell className={cn(
                                                  "text-right font-medium py-1",
                                                  transaction.action === 'Buy' ? "text-red-600" : "text-green-600"
                                                )}>
                                                  {transaction.action === 'Buy' ? '-' : '+'}{formatCurrency(netValue)}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[200px] truncate py-1" title={transaction.remarks || ''}>
                                                  {transaction.remarks || '-'}
                                                </TableCell>
                                              </TableRow>
                                            )
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )
                        })}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <EditTransactionDialog
        transaction={editingTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => { refreshStocks() }}
        accounts={activeAccounts}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTransaction ? (
                <>
                  This will permanently delete transaction <span className="font-mono">#{deletingTransaction.id}</span>{' '}
                  ({deletingTransaction.action} {deletingTransaction.quantity} {deletingTransaction.stock} @ {formatCurrency(deletingTransaction.price)}).
                  This action cannot be undone.
                </>
              ) : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDeleteTransaction() }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}