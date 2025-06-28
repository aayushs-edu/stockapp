// app/(dashboard)/profit-loss/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Download, TrendingUp, TrendingDown, Loader2, Calendar, Clock } from 'lucide-react'
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

type FlattenedPnLRow = {
  stock: string
  account: string
  accountName: string
  sellId: number
  sellDate: string
  sellQty: number
  sellPrice: number
  sellValue: number
  buyId: number
  buyDate: string
  buyQty: number
  buyPrice: number
  matchedQty: number
  costBasis: number
  pnl: number
  pnlPercent: number
  holdingDays: number
  isLongTerm: boolean
  isIntraday: boolean
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

// Helper function to calculate holding period in days
const calculateHoldingPeriod = (buyDate: string, sellDate: string): number => {
  const buy = new Date(buyDate)
  const sell = new Date(sellDate)
  const diffTime = Math.abs(sell.getTime() - buy.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
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

  // Match sells with buys using FIFO/LIFO logic and flatten the structure
  const flattenedPnLData = useMemo(() => {
    const rows: FlattenedPnLRow[] = []
    
    // Filter data by year first
    let filteredData = data
    if (yearFilter && yearFilter !== 'all') {
      const year = parseInt(yearFilter)
      filteredData = filteredData.filter(t => new Date(t.date).getFullYear() === year)
    }
    
    // Apply account filter
    let accountsToProcess: string[] = []
    if (accountFilter === 'all-accounts') {
      accountsToProcess = Array.from(new Set(filteredData.map(t => t.userid)))
    } else if (accountFilter === 'active-accounts') {
      const activeAccountIds = new Set(activeAccounts.map(acc => acc.userid))
      accountsToProcess = Array.from(new Set(filteredData.map(t => t.userid))).filter(id => activeAccountIds.has(id))
    } else if (accountFilter) {
      accountsToProcess = [accountFilter]
    }
    
    // Process each account and stock combination
    accountsToProcess.forEach(userid => {
      const accountData = accounts.find(a => a.userid === userid)
      const accountTransactions = filteredData.filter(t => t.userid === userid)
      
      // Group by stock
      const stockGroups = new Map<string, Transaction[]>()
      accountTransactions.forEach(t => {
        if (!stockGroups.has(t.stock)) {
          stockGroups.set(t.stock, [])
        }
        stockGroups.get(t.stock)!.push(t)
      })
      
      // Process each stock
      stockGroups.forEach((transactions, stock) => {
        // Apply stock filter
        if (stockFilter && stock !== stockFilter) return
        
        // Sort transactions by date
        const sortedTransactions = [...transactions].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        
        const sells = sortedTransactions.filter(t => t.action === 'Sell')
        const buys = sortedTransactions.filter(t => t.action === 'Buy')
        
        const remainingBuys = buys.map(buy => ({
          ...buy,
          remainingQty: buy.quantity
        }))
        
        for (const sell of sells) {
          const sellDate = new Date(sell.date)
          let remainingSellQty = sell.quantity
          
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
              const sellValue = matchQty * sell.price - (sell.brokerage * matchQty / sell.quantity)
              const pnl = sellValue - costBasis
              const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0
              const holdingDays = calculateHoldingPeriod(buy.date, sell.date)
              
              rows.push({
                stock,
                account: userid,
                accountName: accountData?.name || userid,
                sellId: sell.id,
                sellDate: sell.date,
                sellQty: sell.quantity,
                sellPrice: sell.price,
                sellValue,
                buyId: buy.id,
                buyDate: buy.date,
                buyQty: buy.quantity,
                buyPrice: buy.price,
                matchedQty: matchQty,
                costBasis,
                pnl,
                pnlPercent,
                holdingDays,
                isLongTerm: holdingDays >= 365,
                isIntraday: true
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
                const sellValue = matchQty * sell.price - (sell.brokerage * matchQty / sell.quantity)
                const pnl = sellValue - costBasis
                const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0
                const holdingDays = calculateHoldingPeriod(buy.date, sell.date)
                
                rows.push({
                  stock,
                  account: userid,
                  accountName: accountData?.name || userid,
                  sellId: sell.id,
                  sellDate: sell.date,
                  sellQty: sell.quantity,
                  sellPrice: sell.price,
                  sellValue,
                  buyId: buy.id,
                  buyDate: buy.date,
                  buyQty: buy.quantity,
                  buyPrice: buy.price,
                  matchedQty: matchQty,
                  costBasis,
                  pnl,
                  pnlPercent,
                  holdingDays,
                  isLongTerm: holdingDays >= 365,
                  isIntraday: false
                })
                
                buy.remainingQty -= matchQty
                remainingSellQty -= matchQty
              }
            }
          }
        }
      })
    })
    
    // Sort by sell date descending, then by stock
    return rows.sort((a, b) => {
      const dateCompare = new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()
      if (dateCompare !== 0) return dateCompare
      return a.stock.localeCompare(b.stock)
    })
  }, [data, accountFilter, stockFilter, yearFilter, accounts, activeAccounts])

  const exportToCSV = () => {
    const csvRows = []
    const headers = ['Stock', 'Account', 'Account Name', 'Sell Date', 'Sell Qty', 'Sell Price', 'Sell Value', 'Buy Date', 'Buy Qty', 'Buy Price', 'Matched Qty', 'Cost Basis', 'P/L', 'P/L %', 'Holding Days', 'Term', 'Type']
    csvRows.push(headers.join(','))

    flattenedPnLData.forEach(row => {
      const csvRow = [
        row.stock,
        row.account,
        row.accountName,
        format(new Date(row.sellDate), 'dd-MMM-yy'),
        row.sellQty,
        row.sellPrice,
        row.sellValue.toFixed(2),
        format(new Date(row.buyDate), 'dd-MMM-yy'),
        row.buyQty,
        row.buyPrice,
        row.matchedQty,
        row.costBasis.toFixed(2),
        row.pnl.toFixed(2),
        row.pnlPercent.toFixed(2),
        row.holdingDays,
        row.isLongTerm ? 'Long Term' : 'Short Term',
        row.isIntraday ? 'Intraday' : 'Delivery'
      ]
      csvRows.push(csvRow.join(','))
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
    let uniqueStocksSet = new Set<string>()
    let profitableStocks = new Set<string>()
    let lossStocks = new Set<string>()
    let longTermPnL = 0
    let shortTermPnL = 0
    let intradayPnL = 0

    // Group by stock to calculate stock-level metrics
    const stockPnLMap = new Map<string, number>()
    
    flattenedPnLData.forEach(row => {
      totalSellValue += row.sellValue
      totalCostBasis += row.costBasis
      totalPnL += row.pnl
      uniqueStocksSet.add(row.stock)
      
      // Accumulate P&L by stock
      const currentPnL = stockPnLMap.get(row.stock) || 0
      stockPnLMap.set(row.stock, currentPnL + row.pnl)
      
      // Track term-based P&L
      if (row.isIntraday) {
        intradayPnL += row.pnl
      } else if (row.isLongTerm) {
        longTermPnL += row.pnl
      } else {
        shortTermPnL += row.pnl
      }
    })
    
    // Determine profitable vs loss-making stocks
    stockPnLMap.forEach((pnl, stock) => {
      if (pnl > 0) {
        profitableStocks.add(stock)
      } else if (pnl < 0) {
        lossStocks.add(stock)
      }
    })

    const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0

    return {
      totalSellValue,
      totalCostBasis,
      totalPnL,
      totalPnLPercent,
      uniqueStocks: uniqueStocksSet.size,
      profitableStocks: profitableStocks.size,
      lossStocks: lossStocks.size,
      longTermPnL,
      shortTermPnL,
      intradayPnL,
      totalTransactions: flattenedPnLData.length
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
        <Button onClick={exportToCSV} disabled={!accountFilter || flattenedPnLData.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      {accountFilter && flattenedPnLData.length > 0 && (
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
                <div className="text-lg font-bold">{summary.uniqueStocks}</div>
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
          
          {/* Term-based P&L Summary */}
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs">Long Term Gains</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className={cn("text-lg font-bold", summary.longTermPnL >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {summary.longTermPnL >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.longTermPnL))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs">Short Term Gains</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className={cn("text-lg font-bold", summary.shortTermPnL >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {summary.shortTermPnL >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.shortTermPnL))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs">Intraday P&L</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className={cn("text-lg font-bold", summary.intradayPnL >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {summary.intradayPnL >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.intradayPnL))}
                </div>
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
                <TableRow className="h-8">
                  <TableHead className="w-24 px-2 text-xs">Stock</TableHead>
                  <TableHead className="w-16 px-2 text-center text-xs">Sell ID</TableHead>
                  <TableHead className="w-24 px-2 text-xs">Sell Date</TableHead>
                  <TableHead className="w-16 px-2 text-right text-xs">Sell Qty</TableHead>
                  <TableHead className="w-20 px-2 text-right text-xs">Sell Price</TableHead>
                  <TableHead className="w-16 px-2 text-center text-xs">Buy ID</TableHead>
                  <TableHead className="w-24 px-2 text-xs">Buy Date</TableHead>
                  <TableHead className="w-16 px-2 text-right text-xs">Match Qty</TableHead>
                  <TableHead className="w-20 px-2 text-right text-xs">Buy Price</TableHead>
                  <TableHead className="w-16 px-2 text-xs">Type</TableHead>
                  <TableHead className="w-16 px-2 text-xs">Term</TableHead>
                  <TableHead className="w-24 px-2 text-right text-xs">Cost Basis</TableHead>
                  <TableHead className="w-24 px-2 text-right text-xs">Sell Value</TableHead>
                  <TableHead className="w-24 px-2 text-right text-xs bg-green-50 dark:bg-green-950/20">
                    <span className="text-green-700 dark:text-green-300 font-semibold">P/L</span>
                  </TableHead>
                  <TableHead className="w-20 px-2 text-right text-xs">P/L %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={16} className="h-16 text-center text-xs">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : flattenedPnLData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="h-16 text-center text-xs">
                      No closed positions found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  flattenedPnLData.map((row, index) => (
                    <TableRow 
                      key={`${row.sellId}-${row.buyId}-${index}`}
                      className={cn(
                        "h-7 text-xs",
                        row.isIntraday && "bg-blue-50 dark:bg-blue-950/20"
                      )}
                    >
                      <TableCell className="font-semibold py-1 px-2">{row.stock}</TableCell>
                      <TableCell className="text-center font-mono text-xs py-1 px-2">#{row.sellId}</TableCell>
                      <TableCell className="py-1 text-xs px-2">{format(new Date(row.sellDate), 'dd-MMM-yy')}</TableCell>
                      <TableCell className="text-right py-1 text-xs px-2">{row.sellQty}</TableCell>
                      <TableCell className="text-right py-1 text-xs px-2">{formatCurrency(row.sellPrice)}</TableCell>
                      <TableCell className="text-center font-mono text-xs py-1 px-2">#{row.buyId}</TableCell>
                      <TableCell className="py-1 text-xs px-2">{format(new Date(row.buyDate), 'dd-MMM-yy')}</TableCell>
                      <TableCell className="text-right py-1 text-xs font-medium px-2">{row.matchedQty}</TableCell>
                      <TableCell className="text-right py-1 text-xs px-2">{formatCurrency(row.buyPrice)}</TableCell>
                      <TableCell className="py-1 px-2">{row.isIntraday ? (<Badge variant="outline" className="text-xs">Intraday</Badge>) : (<span className="text-xs text-muted-foreground">Delivery</span>)}</TableCell>
                      <TableCell className="py-1 px-2">{row.isLongTerm ? (<Badge className={cn("text-xs flex items-center gap-1","bg-purple-100 text-purple-800 hover:bg-purple-200","dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30")}> <Calendar className="h-3 w-3" /> LTG </Badge>) : (<Badge className={cn("text-xs flex items-center gap-1","bg-orange-100 text-orange-800 hover:bg-orange-200","dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/30")}> <Clock className="h-3 w-3" /> STG </Badge>)}</TableCell>
                      <TableCell className="text-right py-1 text-xs px-2">{formatCurrency(row.costBasis)}</TableCell>
                      <TableCell className="text-right py-1 text-xs px-2">{formatCurrency(row.sellValue)}</TableCell>
                      <TableCell className={cn("text-right py-1 font-medium bg-green-50 dark:bg-green-950/20 px-2", row.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{row.pnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(row.pnl))}</TableCell>
                      <TableCell className={cn("text-right py-1 text-xs font-medium px-2", row.pnlPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{row.pnlPercent >= 0 ? '+' : ''}{row.pnlPercent.toFixed(2)}%</TableCell>
                    </TableRow>
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