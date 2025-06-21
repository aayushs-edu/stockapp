// app/(dashboard)/summary-book/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight, Download, TrendingUp, TrendingDown } from 'lucide-react'
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
  remainingTransactions?: Transaction[] // Added to track which transactions contain remaining shares
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

interface Account {
  userid: string
  name: string
  active: boolean
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
  const searchParams = useSearchParams()
  const stockFromUrl = searchParams.get('stock')
  
  const [data, setData] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [accountFilter, setAccountFilter] = useState<string>('')
  const [stockFilter, setStockFilter] = useState<string>(stockFromUrl || '')
  const [holdingFilter, setHoldingFilter] = useState<string>('all') // New filter for holdings
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

  useEffect(() => {
    fetchAccounts()
  }, [])

  // Check if we should auto-select "all-accounts" when stock comes from URL
  useEffect(() => {
    if (stockFromUrl && !accountFilter && accounts.length > 0) {
      setAccountFilter('all-accounts')
    }
  }, [stockFromUrl, accountFilter, accounts])

  useEffect(() => {
    if (accountFilter) {
      fetchData()
    }
  }, [accountFilter])

  // Auto-expand if stock filter is set from URL
  useEffect(() => {
    if (stockFromUrl && data.length > 0) {
      setExpandedStocks(new Set([stockFromUrl]))
    }
  }, [stockFromUrl, data])

  const fetchAccounts = async () => {
    try {
      // Fetch ALL accounts (not just active ones)
      const response = await fetch('/api/accounts')
      if (!response.ok) {
        console.error('Failed to fetch accounts:', response.status)
        setAccounts([])
        return
      }
      const result = await response.json()
      if (Array.isArray(result)) {
        // Extract just the account info without stats
        const accountsOnly = result.map(account => ({
          userid: account.userid,
          name: account.name,
          active: account.active
        }))
        setAccounts(accountsOnly)
      } else {
        setAccounts([])
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      setAccounts([])
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/stocks`)
      
      if (!response.ok) {
        console.error('Failed to fetch stocks:', response.status)
        setData([])
        return
      }
      
      const result = await response.json()
      if (Array.isArray(result)) {
        setData(result)
      } else {
        setData([])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // FIFO calculation for remaining shares
  const calculateRemainingTransactions = (buyTransactions: Transaction[], totalSoldQty: number): Transaction[] => {
    if (totalSoldQty <= 0) return buyTransactions
    
    const sortedBuyTransactions = [...buyTransactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    let remainingSoldQty = totalSoldQty
    const remainingTransactions: Transaction[] = []
    
    for (const buyTx of sortedBuyTransactions) {
      if (remainingSoldQty <= 0) {
        // All this transaction remains
        remainingTransactions.push(buyTx)
      } else if (remainingSoldQty >= buyTx.quantity) {
        // This entire transaction was sold
        remainingSoldQty -= buyTx.quantity
      } else {
        // This transaction was partially sold
        const remainingQty = buyTx.quantity - remainingSoldQty
        remainingTransactions.push({
          ...buyTx,
          quantity: remainingQty
        })
        remainingSoldQty = 0
      }
    }
    
    return remainingTransactions
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
        account.remainingTransactions = calculateRemainingTransactions(buyTransactions, account.sellQty)
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
      const activeAccountIds = new Set(accounts.filter(acc => acc.active).map(acc => acc.userid))
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
    // 'all' shows everything, so no additional filtering needed
    
    return filteredSummaries.sort((a, b) => a.stock.localeCompare(b.stock))
  }, [data, accountFilter, stockFilter, holdingFilter, dateFrom, dateTo, accounts])

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
            format(new Date(transaction.date), 'dd-MMM-yy'),
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
    a.download = `summary_book_${format(new Date(), 'yyyy-MM-dd')}.csv`
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
        // Investment = remaining shares * avg buy price
        currentInvestment += stock.totalNetQty * stock.avgBuyPrice
      }
      
      if (stock.totalSellQty > 0) {
        // Realized P/L = sell value - (avg buy price * sold quantity)
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
                ? `Consolidated view from ${accounts.filter(acc => acc.active).length} active accounts`
                : `Detailed breakdown for ${accounts.find(acc => acc.userid === accountFilter)?.name || accountFilter}`
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
            {/* Account Dropdown - Updated with all options */}
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select Account" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {/* Individual accounts */}
                {accounts.map((account) => (
                  <SelectItem key={account.userid} value={account.userid}>
                    {account.userid} - {account.name} {!account.active && '(Inactive)'}
                  </SelectItem>
                ))}
                {/* Separator and aggregate options */}
                {accounts.length > 0 && (
                  <>
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
                                    {account.netQty > 0 && account.remainingTransactions && account.remainingTransactions.length > 0 && (
                                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                          Remaining Shares Distribution (FIFO):
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                          {account.remainingTransactions.map((tx, idx) => (
                                            <div key={`${tx.id}-${idx}`} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                                              <div className="font-mono">#{tx.id}</div>
                                              <div>{format(new Date(tx.date), 'dd-MMM-yy')}</div>
                                              <div className="font-semibold text-blue-700 dark:text-blue-300">
                                                {tx.quantity} shares @ {formatCurrency(tx.price)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="h-8">
                                          <TableHead className="w-20 py-1">ID</TableHead>
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
                                          const isRemainingTransaction = account.remainingTransactions?.some(
                                            remainingTx => remainingTx.id === transaction.id
                                          )
                                          
                                          return (
                                            <TableRow 
                                              key={transaction.id} 
                                              className={cn(
                                                "hover:bg-muted/30 h-8",
                                                isRemainingTransaction && transaction.action === 'Buy' && 
                                                "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500"
                                              )}
                                            >
                                              <TableCell className="font-mono text-xs py-1">
                                                #{transaction.id}
                                                {isRemainingTransaction && transaction.action === 'Buy' && (
                                                  <div className="text-blue-600 dark:text-blue-400 text-[10px]">HOLDING</div>
                                                )}
                                              </TableCell>
                                              <TableCell className="py-1">{format(new Date(transaction.date), 'dd-MMM-yy')}</TableCell>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}