// app/(dashboard)/holdings/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, Download, TrendingDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAccounts } from '@/components/providers/accounts-provider'

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
  originalQuantity?: number // Track original quantity for partial transactions
}

type AccountSummary = {
  userid: string
  name: string
  buyQty: number
  sellQty: number
  netQty: number
  avgBuyPrice: number
  totalBuyValue: number
  totalBrokerage: number
  transactions: Transaction[]
  remainingTransactions?: Transaction[]
}

type StockSummary = {
  stock: string
  totalBuyQty: number
  totalSellQty: number
  totalNetQty: number
  avgBuyPrice: number
  totalBuyValue: number
  totalBrokerage: number
  accounts: AccountSummary[]
}

export default function HoldingsPage() {
  const { accounts, activeAccounts, loading: accountsLoading } = useAccounts()
  const [data, setData] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [accountFilter, setAccountFilter] = useState<string>('')
  const [expandedStocks, setExpandedStocks] = useState<Set<string>>(new Set())
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!accountFilter && activeAccounts.length > 0) {
      setAccountFilter('active-accounts')
    }
  }, [activeAccounts, accountFilter])

  useEffect(() => {
    if (accountFilter) {
      fetchData()
    }
  }, [accountFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/stocks?mode=all`)
      
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

  // FIFO calculation for remaining shares with rounding error mitigation
  const calculateRemainingTransactions = (buyTransactions: Transaction[], totalSoldQty: number): Transaction[] => {
    if (totalSoldQty <= 0) return buyTransactions.map(tx => ({ ...tx, originalQuantity: tx.quantity }))
    
    const sortedBuyTransactions = [...buyTransactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // Use higher precision for calculations
    let remainingSoldQty = Math.round(totalSoldQty * 100) / 100
    const remainingTransactions: Transaction[] = []
    
    for (const buyTx of sortedBuyTransactions) {
      const buyQty = Math.round(buyTx.quantity * 100) / 100
      
      if (remainingSoldQty <= 0) {
        remainingTransactions.push({
          ...buyTx,
          originalQuantity: buyTx.quantity
        })
      } else if (remainingSoldQty >= buyQty) {
        remainingSoldQty = Math.round((remainingSoldQty - buyQty) * 100) / 100
      } else {
        const remainingQty = Math.round((buyQty - remainingSoldQty) * 100) / 100
        remainingTransactions.push({
          ...buyTx,
          quantity: remainingQty,
          originalQuantity: buyTx.quantity
        })
        remainingSoldQty = 0
      }
    }
    
    return remainingTransactions
  }

  // Process data into hierarchical structure - ONLY HOLDINGS
  const stockSummaries = useMemo(() => {
    const summaryMap = new Map<string, StockSummary>()
    
    // Group transactions by stock and account
    data.forEach(transaction => {
      let stockSummary = summaryMap.get(transaction.stock)
      if (!stockSummary) {
        stockSummary = {
          stock: transaction.stock,
          totalBuyQty: 0,
          totalSellQty: 0,
          totalNetQty: 0,
          avgBuyPrice: 0,
          totalBuyValue: 0,
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
          totalBuyValue: 0,
          totalBrokerage: 0,
          transactions: []
        }
        stockSummary.accounts.push(accountSummary)
      }

      // Add transaction to account
      accountSummary.transactions.push(transaction)

      // Update account summary with rounding
      if (transaction.action === 'Buy') {
        accountSummary.buyQty = Math.round((accountSummary.buyQty + transaction.quantity) * 100) / 100
        accountSummary.totalBuyValue = Math.round((accountSummary.totalBuyValue + transaction.tradeValue) * 100) / 100
      } else {
        accountSummary.sellQty = Math.round((accountSummary.sellQty + transaction.quantity) * 100) / 100
      }
      accountSummary.totalBrokerage = Math.round((accountSummary.totalBrokerage + transaction.brokerage) * 100) / 100
      accountSummary.netQty = Math.round((accountSummary.buyQty - accountSummary.sellQty) * 100) / 100
      accountSummary.avgBuyPrice = accountSummary.buyQty > 0 ? Math.round((accountSummary.totalBuyValue / accountSummary.buyQty) * 100) / 100 : 0
    })

    // Calculate remaining transactions for each account
    summaryMap.forEach((stockSummary) => {
      stockSummary.accounts.forEach(account => {
        const buyTransactions = account.transactions.filter(t => t.action === 'Buy')
        account.remainingTransactions = calculateRemainingTransactions(buyTransactions, account.sellQty)
      })
    })

    // Filter out accounts with no remaining shares
    summaryMap.forEach((stockSummary) => {
      stockSummary.accounts = stockSummary.accounts.filter(account => account.netQty > 0)
    })

    // Calculate stock-level summaries and filter stocks with no holdings
    const holdingStocks = new Map<string, StockSummary>()
    
    summaryMap.forEach((stockSummary, stockName) => {
      if (stockSummary.accounts.length > 0) {
        stockSummary.accounts.forEach(account => {
          stockSummary.totalBuyQty = Math.round((stockSummary.totalBuyQty + account.buyQty) * 100) / 100
          stockSummary.totalSellQty = Math.round((stockSummary.totalSellQty + account.sellQty) * 100) / 100
          stockSummary.totalBuyValue = Math.round((stockSummary.totalBuyValue + account.totalBuyValue) * 100) / 100
          stockSummary.totalBrokerage = Math.round((stockSummary.totalBrokerage + account.totalBrokerage) * 100) / 100
        })
        stockSummary.totalNetQty = Math.round((stockSummary.totalBuyQty - stockSummary.totalSellQty) * 100) / 100
        stockSummary.avgBuyPrice = stockSummary.totalBuyQty > 0 ? Math.round((stockSummary.totalBuyValue / stockSummary.totalBuyQty) * 100) / 100 : 0

        // Sort transactions within each account by date descending
        stockSummary.accounts.forEach(account => {
          account.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        })
        
        holdingStocks.set(stockName, stockSummary)
      }
    })

    // Convert to array and sort
    let summaries = Array.from(holdingStocks.values())
    
    // Filter based on account filter
    if (accountFilter && accountFilter !== 'all-accounts' && accountFilter !== 'active-accounts') {
      summaries = summaries.filter(stock => 
        stock.accounts.some(account => account.userid === accountFilter)
      ).map(stock => ({
        ...stock,
        accounts: stock.accounts.filter(account => account.userid === accountFilter)
      }))
      
      // Recalculate stock-level summaries for the filtered account
      summaries = summaries.map(stock => {
        const totalBuyQty = stock.accounts.reduce((sum, acc) => sum + acc.buyQty, 0)
        const totalSellQty = stock.accounts.reduce((sum, acc) => sum + acc.sellQty, 0)
        const totalBuyValue = stock.accounts.reduce((sum, acc) => sum + acc.totalBuyValue, 0)
        const totalBrokerage = stock.accounts.reduce((sum, acc) => sum + acc.totalBrokerage, 0)
        
        return {
          ...stock,
          totalBuyQty,
          totalSellQty,
          totalNetQty: totalBuyQty - totalSellQty,
          totalBuyValue,
          totalBrokerage,
          avgBuyPrice: totalBuyQty > 0 ? totalBuyValue / totalBuyQty : 0
        }
      })
    } else if (accountFilter === 'active-accounts') {
      const activeAccountIds = new Set(activeAccounts.map(acc => acc.userid))
      summaries = summaries.filter(stock => 
        stock.accounts.some(account => activeAccountIds.has(account.userid))
      ).map(stock => ({
        ...stock,
        accounts: stock.accounts.filter(account => activeAccountIds.has(account.userid))
      }))
      
      // Recalculate stock-level summaries for active accounts only
      summaries = summaries.map(stock => {
        const totalBuyQty = stock.accounts.reduce((sum, acc) => sum + acc.buyQty, 0)
        const totalSellQty = stock.accounts.reduce((sum, acc) => sum + acc.sellQty, 0)
        const totalBuyValue = stock.accounts.reduce((sum, acc) => sum + acc.totalBuyValue, 0)
        const totalBrokerage = stock.accounts.reduce((sum, acc) => sum + acc.totalBrokerage, 0)
        
        return {
          ...stock,
          totalBuyQty,
          totalSellQty,
          totalNetQty: totalBuyQty - totalSellQty,
          totalBuyValue,
          totalBrokerage,
          avgBuyPrice: totalBuyQty > 0 ? totalBuyValue / totalBuyQty : 0
        }
      })
    }
    
    return summaries.sort((a, b) => a.stock.localeCompare(b.stock))
  }, [data, accountFilter, activeAccounts])

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
    const headers = ['Stock', 'Account', 'Account Name', 'Remaining Shares', 'Avg Buy Price', 'Current Investment', 'Purchase Date', 'Purchase Price']
    csvRows.push(headers.join(','))

    stockSummaries.forEach(stock => {
      stock.accounts.forEach(account => {
        if (account.remainingTransactions) {
          account.remainingTransactions.forEach(transaction => {
            const row = [
              stock.stock,
              account.userid,
              account.name,
              transaction.quantity,
              account.avgBuyPrice.toFixed(2),
              (transaction.quantity * transaction.price).toFixed(2),
              format(new Date(transaction.date), 'dd-MMM-yy'),
              transaction.price.toFixed(2)
            ]
            csvRows.push(row.join(','))
          })
        }
      })
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `holdings_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const calculateOverallSummary = () => {
    let currentInvestment = 0
    let totalShares = 0
    let uniqueStocks = stockSummaries.length

    stockSummaries.forEach(stock => {
      currentInvestment += stock.totalNetQty * stock.avgBuyPrice
      totalShares += stock.totalNetQty
    })

    return {
      currentInvestment,
      totalShares,
      uniqueStocks
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

  // Helper to format quantity: no decimals if whole, else 2 decimals
  const formatQuantity = (qty: number) => {
    return Number.isInteger(qty) ? qty.toString() : qty.toFixed(2)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Current Holdings
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
                ? `Showing holdings from all ${accounts.length} accounts`
                : accountFilter === 'active-accounts'
                ? `Showing holdings from ${activeAccounts.length} active accounts`
                : `Holdings for ${activeAccounts.find(acc => acc.userid === accountFilter)?.name || accountFilter}`
              }
            </p>
          )}
        </div>
        <Button onClick={exportToCSV} disabled={!accountFilter || stockSummaries.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      {accountFilter && stockSummaries.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Current Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(summary.currentInvestment)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Shares Held</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalShares.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Unique Stocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.uniqueStocks}</div>
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
          <div className="w-full md:w-64">
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
          </div>
        </CardContent>
      </Card>

      {!accountFilter ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>Please select an account to view holdings</p>
              <p className="text-sm mt-2">You can choose individual accounts or aggregate views</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Holdings Table */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Stock / Account</TableHead>
                  <TableHead className="text-right">Shares (Held/Bought)</TableHead>
                  <TableHead className="text-right">Avg Buy Price</TableHead>
                  <TableHead className="text-right">Current Investment</TableHead>
                  <TableHead className="text-right">Total Brokerage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : stockSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No holdings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  stockSummaries.map((stock) => (
                    <>
                      {/* Stock Summary Row */}
                      <TableRow 
                        key={stock.stock}
                        className="font-semibold bg-muted/50 hover:bg-muted cursor-pointer"
                        onClick={() => toggleStockExpansion(stock.stock)}
                      >
                        <TableCell>
                          {expandedStocks.has(stock.stock) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">{stock.stock}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-blue-700 dark:text-blue-300">
                            {formatQuantity(stock.totalNetQty)}
                          </span>
                          <span className="text-muted-foreground mx-1">/</span>
                          <span className="text-muted-foreground">
                            {formatQuantity(stock.totalBuyQty)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(stock.avgBuyPrice)}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-600">
                          {formatCurrency(stock.totalNetQty * stock.avgBuyPrice)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(stock.totalBrokerage)}</TableCell>
                      </TableRow>

                      {/* Account Rows */}
                      {expandedStocks.has(stock.stock) && stock.accounts.map((account) => {
                        const accountKey = `${stock.stock}-${account.userid}`
                        const isAccountExpanded = expandedAccounts.has(accountKey)
                        
                        return (
                          <>
                            <TableRow 
                              key={accountKey}
                              className="hover:bg-muted/30 cursor-pointer"
                              onClick={() => toggleAccountExpansion(stock.stock, account.userid)}
                            >
                              <TableCell className="pl-8">
                                {isAccountExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </TableCell>
                              <TableCell className="pl-8">
                                <div className="flex items-center gap-2">
                                  <span>{account.userid}</span>
                                  <span className="text-sm text-muted-foreground">({account.name})</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-blue-700 dark:text-blue-300">
                                  {formatQuantity(account.netQty)}
                                </span>
                                <span className="text-muted-foreground mx-1">/</span>
                                <span className="text-muted-foreground text-sm">
                                  {formatQuantity(account.buyQty)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(account.avgBuyPrice)}</TableCell>
                              <TableCell className="text-right text-amber-600">
                                {formatCurrency(account.netQty * account.avgBuyPrice)}
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(account.totalBrokerage)}</TableCell>
                            </TableRow>

                            {/* Remaining Shares Details */}
                            {isAccountExpanded && account.remainingTransactions && (
                              <TableRow>
                                <TableCell colSpan={6} className="p-0">
                                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4">
                                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">
                                      Remaining Shares Distribution (FIFO):
                                    </h4>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-20">ID</TableHead>
                                          <TableHead>Purchase Date</TableHead>
                                          <TableHead className="text-right">Quantity (Held/Bought)</TableHead>
                                          <TableHead className="text-right">Purchase Price</TableHead>
                                          <TableHead className="text-right">Cost Basis</TableHead>
                                          <TableHead>Remarks</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {account.remainingTransactions.map((tx, idx) => {
                                          const isPartial = tx.originalQuantity && tx.quantity < tx.originalQuantity
                                          return (
                                            <TableRow key={`${tx.id}-${idx}`} className={isPartial ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                                              <TableCell className="font-mono text-xs">
                                                #{tx.id}
                                              </TableCell>
                                              <TableCell>{format(new Date(tx.date), 'dd-MMM-yy')}</TableCell>
                                              <TableCell className="text-right">
                                                <span className="font-semibold text-blue-700 dark:text-blue-300">
                                                  {formatQuantity(tx.quantity)}
                                                </span>
                                                {tx.originalQuantity && (
                                                  <>
                                                    <span className="text-muted-foreground mx-1">/</span>
                                                    <span className="text-muted-foreground text-sm">
                                                      {formatQuantity(tx.originalQuantity)}
                                                    </span>
                                                  </>
                                                )}
                                                {isPartial && (
                                                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                                    (partial)
                                                  </span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {formatCurrency(tx.price)}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {formatCurrency(tx.quantity * tx.price)}
                                              </TableCell>
                                              <TableCell className="text-sm text-muted-foreground">
                                                {tx.remarks || '-'}
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