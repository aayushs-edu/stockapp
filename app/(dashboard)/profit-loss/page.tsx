// app/(dashboard)/profit-loss/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, Download, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
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
}

type MatchedBuy = {
  id: number
  date: string
  quantity: number
  price: number
  matchedQuantity: number
  tradeValue: number
  brokerage: number
  source: string | null
  remarks: string | null
}

type SellWithMatches = {
  sell: Transaction
  matchedBuys: MatchedBuy[]
  totalCostBasis: number
  profitLoss: number
  profitLossPercent: number
}

type AccountPnL = {
  userid: string
  name: string
  totalSellQty: number
  totalSellValue: number
  totalCostBasis: number
  totalPnL: number
  totalPnLPercent: number
  sellsWithMatches: SellWithMatches[]
}

type StockPnL = {
  stock: string
  totalSellQty: number
  totalSellValue: number
  totalCostBasis: number
  totalPnL: number
  totalPnLPercent: number
  accounts: AccountPnL[]
}

// Helper component for P/L display
const PLDisplay = ({ value, percent, showPercent = true }: { value: number, percent?: number, showPercent?: boolean }) => {
  const isProfit = value >= 0
  const colorClass = isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  
  return (
    <div className={cn("text-right", colorClass)}>
      <div className="font-semibold">
        {isProfit ? '+' : '-'}{formatCurrency(Math.abs(value))}
      </div>
      {showPercent && percent !== undefined && (
        <div className="text-xs">
          {isProfit ? '+' : ''}{percent.toFixed(2)}%
        </div>
      )}
    </div>
  )
}

export default function ProfitLossPage() {
  const { accounts, activeAccounts, loading: accountsLoading } = useAccounts()
  const [data, setData] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [accountFilter, setAccountFilter] = useState<string>('')
  const [stockFilter, setStockFilter] = useState<string>('')
  const [stockSearchOpen, setStockSearchOpen] = useState(false)
  const [stockSearchValue, setStockSearchValue] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [expandedStocks, setExpandedStocks] = useState<Set<string>>(new Set())
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  // Get unique stocks for autocomplete
  const uniqueStocks = useMemo(() => {
    const stocks = new Set(data.filter(t => t.action === 'Sell').map(t => t.stock))
    return Array.from(stocks).sort()
  }, [data])
  
  // Get unique years from data
  const uniqueYears = useMemo(() => {
    const years = new Set(data.filter(t => t.action === 'Sell').map(t => new Date(t.date).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [data])

  useEffect(() => {
    if (accountFilter) {
      fetchData()
    }
  }, [accountFilter])

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

  // Match sells with buys using FIFO/LIFO logic
  const matchSellsWithBuys = (transactions: Transaction[]): SellWithMatches[] => {
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const sells = sortedTransactions.filter(t => t.action === 'Sell')
    const buys = sortedTransactions.filter(t => t.action === 'Buy')
    
    const sellsWithMatches: SellWithMatches[] = []
    const remainingBuys = buys.map(buy => ({
      ...buy,
      remainingQty: buy.quantity
    }))

    for (const sell of sells) {
      const sellDate = new Date(sell.date)
      const matchedBuys: MatchedBuy[] = []
      let remainingSellQty = sell.quantity
      let totalCostBasis = 0

      // Check if this is an intraday sell (LIFO)
      const intradayBuys = remainingBuys.filter(buy => 
        new Date(buy.date).toDateString() === sellDate.toDateString() && 
        buy.remainingQty > 0
      ).reverse() // Reverse for LIFO

      // First, match with intraday buys (LIFO)
      for (const buy of intradayBuys) {
        if (remainingSellQty <= 0) break
        
        const matchQty = Math.min(remainingSellQty, buy.remainingQty)
        if (matchQty > 0) {
          const costBasis = matchQty * buy.price + (buy.brokerage * matchQty / buy.quantity)
          totalCostBasis += costBasis
          
          matchedBuys.push({
            id: buy.id,
            date: buy.date,
            quantity: buy.quantity,
            price: buy.price,
            matchedQuantity: matchQty,
            tradeValue: buy.tradeValue,
            brokerage: buy.brokerage,
            source: buy.source,
            remarks: buy.remarks
          })
          
          buy.remainingQty -= matchQty
          remainingSellQty -= matchQty
        }
      }

      // Then, match with older buys (FIFO) if any quantity remains
      if (remainingSellQty > 0) {
        const olderBuys = remainingBuys.filter(buy => 
          new Date(buy.date) < sellDate && 
          buy.remainingQty > 0
        )

        for (const buy of olderBuys) {
          if (remainingSellQty <= 0) break
          
          const matchQty = Math.min(remainingSellQty, buy.remainingQty)
          if (matchQty > 0) {
            const costBasis = matchQty * buy.price + (buy.brokerage * matchQty / buy.quantity)
            totalCostBasis += costBasis
            
            matchedBuys.push({
              id: buy.id,
              date: buy.date,
              quantity: buy.quantity,
              price: buy.price,
              matchedQuantity: matchQty,
              tradeValue: buy.tradeValue,
              brokerage: buy.brokerage,
              source: buy.source,
              remarks: buy.remarks
            })
            
            buy.remainingQty -= matchQty
            remainingSellQty -= matchQty
          }
        }
      }

      const sellValue = sell.tradeValue - sell.brokerage
      const profitLoss = sellValue - totalCostBasis
      const profitLossPercent = totalCostBasis > 0 ? (profitLoss / totalCostBasis) * 100 : 0

      sellsWithMatches.push({
        sell,
        matchedBuys,
        totalCostBasis,
        profitLoss,
        profitLossPercent
      })
    }

    return sellsWithMatches
  }

  // Process data into hierarchical structure
  const stockPnLData = useMemo(() => {
    const pnlMap = new Map<string, StockPnL>()
    
    // Filter data by year first
    let filteredData = data
    if (yearFilter && yearFilter !== 'all') {
      const year = parseInt(yearFilter)
      filteredData = filteredData.filter(t => new Date(t.date).getFullYear() === year)
    }
    
    // Group transactions by stock and account
    filteredData.forEach(transaction => {
      if (transaction.action !== 'Sell') return // Only process sells for P&L
      
      let stockPnL = pnlMap.get(transaction.stock)
      if (!stockPnL) {
        stockPnL = {
          stock: transaction.stock,
          totalSellQty: 0,
          totalSellValue: 0,
          totalCostBasis: 0,
          totalPnL: 0,
          totalPnLPercent: 0,
          accounts: []
        }
        pnlMap.set(transaction.stock, stockPnL)
      }
    })

    // Process each stock
    pnlMap.forEach((stockPnL, stock) => {
      // Get all transactions for this stock
      const stockTransactions = filteredData.filter(t => t.stock === stock)
      
      // Group by account
      const accountGroups = new Map<string, Transaction[]>()
      stockTransactions.forEach(t => {
        const key = t.userid
        if (!accountGroups.has(key)) {
          accountGroups.set(key, [])
        }
        accountGroups.get(key)!.push(t)
      })

      // Process each account
      accountGroups.forEach((transactions, userid) => {
        const account = accounts.find(a => a.userid === userid)
        const sellsWithMatches = matchSellsWithBuys(transactions)
        
        if (sellsWithMatches.length > 0) {
          const accountPnL: AccountPnL = {
            userid,
            name: account?.name || userid,
            totalSellQty: sellsWithMatches.reduce((sum, s) => sum + s.sell.quantity, 0),
            totalSellValue: sellsWithMatches.reduce((sum, s) => sum + s.sell.tradeValue - s.sell.brokerage, 0),
            totalCostBasis: sellsWithMatches.reduce((sum, s) => sum + s.totalCostBasis, 0),
            totalPnL: sellsWithMatches.reduce((sum, s) => sum + s.profitLoss, 0),
            totalPnLPercent: 0,
            sellsWithMatches: sellsWithMatches.sort((a, b) => 
              new Date(b.sell.date).getTime() - new Date(a.sell.date).getTime()
            )
          }
          
          accountPnL.totalPnLPercent = accountPnL.totalCostBasis > 0 
            ? (accountPnL.totalPnL / accountPnL.totalCostBasis) * 100 
            : 0

          stockPnL.accounts.push(accountPnL)
          
          // Update stock totals
          stockPnL.totalSellQty += accountPnL.totalSellQty
          stockPnL.totalSellValue += accountPnL.totalSellValue
          stockPnL.totalCostBasis += accountPnL.totalCostBasis
          stockPnL.totalPnL += accountPnL.totalPnL
        }
      })

      stockPnL.totalPnLPercent = stockPnL.totalCostBasis > 0 
        ? (stockPnL.totalPnL / stockPnL.totalCostBasis) * 100 
        : 0
    })

    // Convert to array and filter
    let summaries = Array.from(pnlMap.values()).filter(stock => stock.accounts.length > 0)
    
    // Apply filters
    if (accountFilter && accountFilter !== 'all-accounts' && accountFilter !== 'active-accounts') {
      summaries = summaries.map(stock => ({
        ...stock,
        accounts: stock.accounts.filter(account => account.userid === accountFilter)
      })).filter(stock => stock.accounts.length > 0)
      
      // Recalculate stock totals
      summaries = summaries.map(stock => {
        const totalSellQty = stock.accounts.reduce((sum, acc) => sum + acc.totalSellQty, 0)
        const totalSellValue = stock.accounts.reduce((sum, acc) => sum + acc.totalSellValue, 0)
        const totalCostBasis = stock.accounts.reduce((sum, acc) => sum + acc.totalCostBasis, 0)
        const totalPnL = stock.accounts.reduce((sum, acc) => sum + acc.totalPnL, 0)
        
        return {
          ...stock,
          totalSellQty,
          totalSellValue,
          totalCostBasis,
          totalPnL,
          totalPnLPercent: totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0
        }
      })
    } else if (accountFilter === 'active-accounts') {
      const activeAccountIds = new Set(activeAccounts.map(acc => acc.userid))
      summaries = summaries.map(stock => ({
        ...stock,
        accounts: stock.accounts.filter(account => activeAccountIds.has(account.userid))
      })).filter(stock => stock.accounts.length > 0)
      
      // Recalculate stock totals
      summaries = summaries.map(stock => {
        const totalSellQty = stock.accounts.reduce((sum, acc) => sum + acc.totalSellQty, 0)
        const totalSellValue = stock.accounts.reduce((sum, acc) => sum + acc.totalSellValue, 0)
        const totalCostBasis = stock.accounts.reduce((sum, acc) => sum + acc.totalCostBasis, 0)
        const totalPnL = stock.accounts.reduce((sum, acc) => sum + acc.totalPnL, 0)
        
        return {
          ...stock,
          totalSellQty,
          totalSellValue,
          totalCostBasis,
          totalPnL,
          totalPnLPercent: totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0
        }
      })
    }
    
    // Apply stock filter
    if (stockFilter) {
      summaries = summaries.filter(stock => stock.stock === stockFilter)
    }
    
    return summaries.sort((a, b) => b.totalPnL - a.totalPnL)
  }, [data, accountFilter, stockFilter, yearFilter, accounts, activeAccounts])

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
    const headers = ['Stock', 'Account', 'Sell Date', 'Sell Qty', 'Sell Price', 'Sell Value', 'Buy Date', 'Buy Qty', 'Buy Price', 'Matched Qty', 'Cost Basis', 'P/L', 'P/L %']
    csvRows.push(headers.join(','))

    stockPnLData.forEach(stock => {
      stock.accounts.forEach(account => {
        account.sellsWithMatches.forEach(sellMatch => {
          sellMatch.matchedBuys.forEach(buy => {
            const row = [
              stock.stock,
              account.userid,
              format(new Date(sellMatch.sell.date), 'dd-MMM-yy'),
              sellMatch.sell.quantity,
              sellMatch.sell.price,
              sellMatch.sell.tradeValue - sellMatch.sell.brokerage,
              format(new Date(buy.date), 'dd-MMM-yy'),
              buy.quantity,
              buy.price,
              buy.matchedQuantity,
              buy.matchedQuantity * buy.price,
              sellMatch.profitLoss,
              sellMatch.profitLossPercent.toFixed(2)
            ]
            csvRows.push(row.join(','))
          })
        })
      })
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const yearSuffix = yearFilter && yearFilter !== 'all' ? `_${yearFilter}` : ''
    a.download = `profit_loss${yearSuffix}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const calculateOverallSummary = () => {
    let totalSellValue = 0
    let totalCostBasis = 0
    let totalPnL = 0
    let totalSellQty = 0
    let profitableStocks = 0
    let lossStocks = 0

    stockPnLData.forEach(stock => {
      totalSellValue += stock.totalSellValue
      totalCostBasis += stock.totalCostBasis
      totalPnL += stock.totalPnL
      totalSellQty += stock.totalSellQty
      
      if (stock.totalPnL > 0) {
        profitableStocks++
      } else if (stock.totalPnL < 0) {
        lossStocks++
      }
    })

    const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0

    return {
      totalSellValue,
      totalCostBasis,
      totalPnL,
      totalPnLPercent,
      totalSellQty,
      profitableStocks,
      lossStocks
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
            Profit & Loss Analysis
            {accountFilter && (
              <span className="text-muted-foreground"> for </span>
            )}
            {getAccountDisplayText() && (
              <span className="text-primary">{getAccountDisplayText()}</span>
            )}
          </h1>
          {accountFilter && (
            <p className="text-sm text-muted-foreground mt-1">
              Detailed breakdown of realized gains and losses with FIFO/LIFO matching
              {yearFilter && yearFilter !== 'all' && ` for year ${yearFilter}`}
            </p>
          )}
        </div>
        <Button onClick={exportToCSV} disabled={!accountFilter || stockPnLData.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      {accountFilter && stockPnLData.length > 0 && (
        <>
          {yearFilter && yearFilter !== 'all' && (
            <h3 className="text-lg font-semibold">
              Summary for {yearFilter}
            </h3>
          )}
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Total Sell Value</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{formatCurrency(summary.totalSellValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Total Cost Basis</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{formatCurrency(summary.totalCostBasis)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Realized P/L</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <PLDisplay value={summary.totalPnL} percent={summary.totalPnLPercent} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Stocks Traded</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold">{stockPnLData.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Profitable</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold text-green-600">{summary.profitableStocks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Loss Making</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-lg font-bold text-red-600">{summary.lossStocks}</div>
            </CardContent>
          </Card>
          </div>
        </>
      )}
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Account Dropdown */}
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

            {/* Year Filter */}
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Clear Filters Button */}
          {(accountFilter || stockFilter || (yearFilter && yearFilter !== 'all')) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAccountFilter('')
                  setStockFilter('')
                  setYearFilter('all')
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
              <p>Please select an account to view profit & loss analysis</p>
              <p className="text-sm mt-2">You can choose individual accounts or aggregate views</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* P&L Table */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="h-10">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Stock / Account</TableHead>
                  <TableHead className="text-right">Sell Qty</TableHead>
                  <TableHead className="text-right">Sell Value</TableHead>
                  <TableHead className="text-right">Cost Basis</TableHead>
                  <TableHead className="text-right bg-green-50 dark:bg-green-950/20">
                    <span className="text-green-700 dark:text-green-300 font-semibold">Realized P/L</span>
                  </TableHead>
                  <TableHead className="text-right">P/L %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : stockPnLData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No closed positions found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  stockPnLData.map((stock) => (
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
                        <TableCell className="text-right py-1">{stock.totalSellQty.toFixed(2)}</TableCell>
                        <TableCell className="text-right py-1">{formatCurrency(stock.totalSellValue)}</TableCell>
                        <TableCell className="text-right py-1">{formatCurrency(stock.totalCostBasis)}</TableCell>
                        <TableCell className="text-right py-1 bg-green-50 dark:bg-green-950/20">
                          <PLDisplay value={stock.totalPnL} percent={stock.totalPnLPercent} />
                        </TableCell>
                        <TableCell className="text-right py-1">
                          <Badge variant={stock.totalPnL >= 0 ? 'default' : 'destructive'}>
                            {stock.totalPnLPercent >= 0 ? '+' : ''}{stock.totalPnLPercent.toFixed(2)}%
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
                              <TableCell className="text-right py-1">{account.totalSellQty.toFixed(2)}</TableCell>
                              <TableCell className="text-right py-1">{formatCurrency(account.totalSellValue)}</TableCell>
                              <TableCell className="text-right py-1">{formatCurrency(account.totalCostBasis)}</TableCell>
                              <TableCell className="text-right py-1 bg-green-50 dark:bg-green-950/20">
                                <PLDisplay value={account.totalPnL} percent={account.totalPnLPercent} />
                              </TableCell>
                              <TableCell className="text-right py-1">
                                <Badge variant={account.totalPnL >= 0 ? 'default' : 'destructive'} className="text-xs">
                                  {account.totalPnLPercent >= 0 ? '+' : ''}{account.totalPnLPercent.toFixed(2)}%
                                </Badge>
                              </TableCell>
                            </TableRow>

                            {/* Level 3: Sell Transactions with Matched Buys */}
                            {isAccountExpanded && (
                              <TableRow>
                                <TableCell colSpan={7} className="p-0">
                                  <div className="bg-muted/20 p-4">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="h-8">
                                          <TableHead className="w-16 py-1">Sell ID</TableHead>
                                          <TableHead className="py-1">Sell Date</TableHead>
                                          <TableHead className="text-right py-1">Sell Qty</TableHead>
                                          <TableHead className="text-right py-1">Sell Price</TableHead>
                                          <TableHead className="w-16 py-1">Buy ID</TableHead>
                                          <TableHead className="py-1">Buy Date</TableHead>
                                          <TableHead className="text-right py-1">Match Qty</TableHead>
                                          <TableHead className="text-right py-1">Buy Price</TableHead>
                                          <TableHead className="py-1">Method</TableHead>
                                          <TableHead className="text-right py-1">Cost Basis</TableHead>
                                          <TableHead className="text-right py-1">Sell Value</TableHead>
                                          <TableHead className="text-right py-1">P/L</TableHead>
                                          <TableHead className="text-right py-1">P/L %</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {account.sellsWithMatches.map((sellMatch) => {
                                          const sellValue = sellMatch.sell.tradeValue - sellMatch.sell.brokerage
                                          const sellValuePerShare = sellValue / sellMatch.sell.quantity
                                          
                                          return sellMatch.matchedBuys.map((buy, buyIdx) => {
                                            const isIntradayBuy = new Date(buy.date).toDateString() === new Date(sellMatch.sell.date).toDateString()
                                            const buyAmount = buy.matchedQuantity * buy.price
                                            const buyBrokerage = (buy.brokerage * buy.matchedQuantity / buy.quantity)
                                            const costBasis = buyAmount + buyBrokerage
                                            const matchedSellValue = buy.matchedQuantity * sellValuePerShare
                                            const matchPnL = matchedSellValue - costBasis
                                            const matchPnLPercent = costBasis > 0 ? (matchPnL / costBasis) * 100 : 0
                                            
                                            return (
                                              <TableRow 
                                                key={`${sellMatch.sell.id}-buy-${buy.id}-${buyIdx}`} 
                                                className={cn(
                                                  "h-8 hover:bg-muted/30",
                                                  isIntradayBuy && "bg-blue-50 dark:bg-blue-950/20",
                                                  buyIdx === 0 && "border-t-2"
                                                )}
                                              >
                                                <TableCell className="font-mono text-xs py-1">
                                                  #{sellMatch.sell.id}
                                                </TableCell>
                                                <TableCell className="py-1 text-xs">
                                                  {format(new Date(sellMatch.sell.date), 'dd-MMM-yy')}
                                                </TableCell>
                                                <TableCell className="text-right py-1 text-xs">
                                                  {sellMatch.sell.quantity}
                                                </TableCell>
                                                <TableCell className="text-right py-1 text-xs">
                                                  {formatCurrency(sellMatch.sell.price)}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs py-1">
                                                  #{buy.id}
                                                </TableCell>
                                                <TableCell className="py-1 text-xs">
                                                  {format(new Date(buy.date), 'dd-MMM-yy')}
                                                </TableCell>
                                                <TableCell className="text-right py-1 text-xs font-medium">
                                                  {buy.matchedQuantity}
                                                </TableCell>
                                                <TableCell className="text-right py-1 text-xs">
                                                  {formatCurrency(buy.price)}
                                                </TableCell>
                                                <TableCell className="py-1">
                                                  {isIntradayBuy ? (
                                                    <Badge variant="outline" className="text-xs">LIFO</Badge>
                                                  ) : (
                                                    <Badge variant="outline" className="text-xs">FIFO</Badge>
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-right py-1 text-xs">
                                                  {formatCurrency(costBasis)}
                                                </TableCell>
                                                <TableCell className="text-right py-1 text-xs">
                                                  {formatCurrency(matchedSellValue)}
                                                </TableCell>
                                                <TableCell className={cn(
                                                  "text-right py-1 font-medium",
                                                  matchPnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                                )}>
                                                  {matchPnL >= 0 ? '+' : '-'}{formatCurrency(Math.abs(matchPnL))}
                                                </TableCell>
                                                <TableCell className={cn(
                                                  "text-right py-1 text-xs font-medium",
                                                  matchPnLPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                                )}>
                                                  {matchPnLPercent >= 0 ? '+' : ''}{matchPnLPercent.toFixed(2)}%
                                                </TableCell>
                                              </TableRow>
                                            )
                                          })
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