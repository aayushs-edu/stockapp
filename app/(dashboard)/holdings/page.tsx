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

type FlattenedHolding = {
  accountId: string
  accountName: string
  stock: string
  buyDate: string
  quantity: number
  price: number
  tradeValue: number
  brokerage: number
  transactionId: number
  orderRef: string | null
  remarks: string | null
  source: string | null
  netValue: number
}

type AccountStockSummary = {
  accountId: string
  accountName: string
  stock: string
  totalQuantity: number
  avgPrice: number
  totalValue: number
  totalBrokerage: number
  holdings: FlattenedHolding[]
}

export default function HoldingsPage() {
  const { accounts, activeAccounts, loading: accountsLoading } = useAccounts()
  const [data, setData] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [accountFilter, setAccountFilter] = useState<string>('')
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [hasInitialized, setHasInitialized] = useState(false)

  // Remove auto-selection of active-accounts
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

  // Process data into flattened structure - ONLY HOLDINGS
  const flattenedData = useMemo(() => {
    const accountStockMap = new Map<string, AccountStockSummary>()
    const flattenedHoldings: FlattenedHolding[] = []
    // First, group transactions by account and stock
    const accountStockTransactions = new Map<string, Transaction[]>()
    
    data.forEach(transaction => {
      const key = `${transaction.userid}-${transaction.stock}`
      if (!accountStockTransactions.has(key)) {
        accountStockTransactions.set(key, [])
      }
      accountStockTransactions.get(key)!.push(transaction)
    })

    // Process each account-stock combination
    accountStockTransactions.forEach((transactions, key) => {
      const [accountId, ...stockParts] = key.split('-')
      const stock = stockParts.join('-')
      const accountName = transactions[0]?.account?.name || accountId
      
      // Calculate buy/sell quantities
      let buyQty = 0
      let sellQty = 0
      let totalBuyValue = 0
      let totalBrokerage = 0
      
      const buyTransactions = transactions.filter(t => t.action === 'Buy')
      const sellTransactions = transactions.filter(t => t.action === 'Sell')
      
      buyTransactions.forEach(t => {
        buyQty += t.quantity
        totalBuyValue += t.tradeValue
        totalBrokerage += t.brokerage
      })
      
      sellTransactions.forEach(t => {
        sellQty += t.quantity
        totalBrokerage += t.brokerage
      })
      
      const netQty = Math.round((buyQty - sellQty) * 100) / 100
      
      // Only process if there are holdings
      if (netQty > 0) {
        // Calculate remaining transactions using FIFO
        const remainingTransactions = calculateRemainingTransactions(buyTransactions, sellQty)
        
        // Create flattened holdings from remaining transactions
        remainingTransactions.forEach(tx => {
          const netValue = tx.tradeValue + tx.brokerage // For Buy transactions
          flattenedHoldings.push({
            accountId,
            accountName,
            stock,
            buyDate: tx.date,
            quantity: tx.quantity,
            price: tx.price,
            tradeValue: tx.tradeValue,
            brokerage: tx.brokerage,
            transactionId: tx.id,
            orderRef: tx.orderRef,
            remarks: tx.remarks,
            source: tx.source,
            netValue
          })
        })
        
        // Create account-stock summary
        const avgPrice = buyQty > 0 ? totalBuyValue / buyQty : 0
        const summaryKey = `${accountId}-${stock}`
        
        accountStockMap.set(summaryKey, {
          accountId,
          accountName,
          stock,
          totalQuantity: netQty,
          avgPrice: Math.round(avgPrice * 100) / 100,
          totalValue: Math.round(totalBuyValue * 100) / 100,
          totalBrokerage: Math.round(totalBrokerage * 100) / 100,
          holdings: flattenedHoldings.filter(h => h.accountId === accountId && h.stock === stock)
        })
      }
    })

    // Filter based on account filter
    let filteredHoldings = flattenedHoldings
    let filteredSummaries = Array.from(accountStockMap.values())
    
    if (accountFilter && accountFilter !== 'all-accounts' && accountFilter !== 'active-accounts') {
      filteredHoldings = flattenedHoldings.filter(h => h.accountId === accountFilter)
      filteredSummaries = filteredSummaries.filter(s => s.accountId === accountFilter)
    } else if (accountFilter === 'active-accounts') {
      const activeAccountIds = new Set(activeAccounts.map(acc => acc.userid))
      filteredHoldings = flattenedHoldings.filter(h => activeAccountIds.has(h.accountId))
      filteredSummaries = filteredSummaries.filter(s => activeAccountIds.has(s.accountId))
    }
    
    // Sort by account, stock, buy date ascending
    filteredHoldings.sort((a, b) => {
      if (a.accountId !== b.accountId) return a.accountId.localeCompare(b.accountId)
      if (a.stock !== b.stock) return a.stock.localeCompare(b.stock)
      return new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime()
    })
    
    return {
      holdings: filteredHoldings,
      summaries: filteredSummaries
    }
  }, [data, accountFilter, activeAccounts])

  // Auto-expand all account-stock combinations when data changes
  useEffect(() => {
    if (flattenedData.summaries.length > 0 && !hasInitialized) {
      const allKeys = flattenedData.summaries.map(s => `${s.accountId}-${s.stock}`)
      setExpandedAccounts(new Set(allKeys))
      setHasInitialized(true)
    }
  }, [flattenedData.summaries, hasInitialized])

  // Reset initialization when account filter changes
  useEffect(() => {
    setHasInitialized(false)
  }, [accountFilter])

  const toggleAccountExpansion = (accountId: string, stock: string) => {
    const key = `${accountId}-${stock}`
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
    const headers = ['ID', 'User ID', 'Date', 'Stock', 'Action', 'Source', 'Quantity', 'Price', 'Trade Value', 'Brokerage', 'Net Value', 'Order Ref', 'Remarks']
    csvRows.push(headers.join(','))

    flattenedData.holdings.forEach(holding => {
      const row = [
        holding.transactionId,
        holding.accountId,
        format(new Date(holding.buyDate), 'dd/MM/yyyy'),
        holding.stock,
        'Buy', // Holdings are always Buy transactions
        holding.source || '',
        holding.quantity.toFixed(2),
        holding.price.toFixed(2),
        holding.tradeValue.toFixed(2),
        holding.brokerage.toFixed(2),
        holding.netValue.toFixed(2),
        holding.orderRef || '',
        holding.remarks || ''
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `holdings_${format(new Date(), 'dd-MM-yyyy')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const calculateOverallSummary = () => {
    let currentInvestment = 0
    let totalShares = 0
    const uniqueStocks = new Set(flattenedData.holdings.map(h => h.stock)).size
    const uniqueAccounts = new Set(flattenedData.holdings.map(h => h.accountId)).size

    flattenedData.summaries.forEach(summary => {
      currentInvestment += summary.totalQuantity * summary.avgPrice
      totalShares += summary.totalQuantity
    })

    return {
      currentInvestment,
      totalShares,
      uniqueStocks,
      uniqueAccounts
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
        <Button onClick={exportToCSV} disabled={!accountFilter || flattenedData.holdings.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      {accountFilter && flattenedData.holdings.length > 0 && (
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
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Trade Value</TableHead>
                  <TableHead className="text-right">Brokerage</TableHead>
                  <TableHead className="text-right">Net Value</TableHead>
                  <TableHead>Order Ref</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : flattenedData.holdings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="h-24 text-center">
                      No holdings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Group holdings by account-stock and show summaries with details */}
                    {(() => {
                      let lastAccountId: string | null = null
                      let lastStock: string | null = null
                      
                      return flattenedData.holdings.map((holding, index) => {
                        const isNewAccountStock = holding.accountId !== lastAccountId || holding.stock !== lastStock
                        const accountStockKey = `${holding.accountId}-${holding.stock}`
                        const summary = flattenedData.summaries.find(s => s.accountId === holding.accountId && s.stock === holding.stock)
                        const isExpanded = expandedAccounts.has(accountStockKey)
                        
                        const result = []
                        
                        // Add summary row for new account-stock combination
                        if (isNewAccountStock && summary) {
                          result.push(
                            <TableRow 
                              key={`summary-${accountStockKey}`}
                              className="font-semibold bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/40 cursor-pointer border-b border-blue-200 dark:border-blue-800"
                              onClick={() => toggleAccountExpansion(holding.accountId, holding.stock)}
                            >
                              <TableCell>
                                <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/50">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell colSpan={2}>
                                <div className="flex flex-col">
                                  <span>{holding.accountId}</span>
                                  <span className="text-xs text-muted-foreground">{holding.accountName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700">
                                  {summary.holdings.length} lots
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold text-blue-900 dark:text-blue-100">{holding.stock}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="default" className="text-xs">Buy</Badge>
                              </TableCell>
                              <TableCell>-</TableCell>
                              <TableCell className="text-right font-semibold text-blue-700 dark:text-blue-300">
                                {formatQuantity(summary.totalQuantity)}
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(summary.avgPrice)}</TableCell>
                              <TableCell className="text-right font-semibold text-amber-600">
                                {formatCurrency(summary.totalValue)}
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(summary.totalBrokerage)}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">
                                {formatCurrency(summary.totalValue + summary.totalBrokerage)}
                              </TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>-</TableCell>
                            </TableRow>
                          )
                          lastAccountId = holding.accountId
                          lastStock = holding.stock
                        }
                        
                        // Add detail row if expanded
                        if (isExpanded) {
                          result.push(
                            <TableRow key={`detail-${holding.transactionId}`} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 text-sm">
                              <TableCell></TableCell>
                              <TableCell className="font-mono text-xs">#{holding.transactionId}</TableCell>
                              <TableCell>{holding.accountId}</TableCell>
                              <TableCell>{format(new Date(holding.buyDate), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{holding.stock}</TableCell>
                              <TableCell>
                                <Badge variant="default" className="text-xs">Buy</Badge>
                              </TableCell>
                              <TableCell className="text-xs">{holding.source || '-'}</TableCell>
                              <TableCell className="text-right">{formatQuantity(holding.quantity)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(holding.price)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(holding.tradeValue)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(holding.brokerage)}</TableCell>
                              <TableCell className="text-right text-red-600 font-medium">
                                -{formatCurrency(holding.netValue)}
                              </TableCell>
                              <TableCell className="text-xs">{holding.orderRef || '-'}</TableCell>
                              <TableCell className="text-xs max-w-[150px] truncate" title={holding.remarks || ''}>
                                {holding.remarks || '-'}
                              </TableCell>
                            </TableRow>
                          )
                        }
                        
                        return result
                      })
                    })()}
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}