// app/(dashboard)/summary-book/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight, Download, TrendingUp, TrendingDown, CalendarIcon } from 'lucide-react'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

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

export default function SummaryBookPage() {
  const searchParams = useSearchParams()
  const stockFromUrl = searchParams.get('stock')
  
  const [data, setData] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<string>(stockFromUrl || '')
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
    fetchData()
  }, [])

  // Auto-expand if stock filter is set from URL
  useEffect(() => {
    if (stockFromUrl && data.length > 0) {
      setExpandedStocks(new Set([stockFromUrl]))
    }
  }, [stockFromUrl, data])

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
    const summaries = Array.from(summaryMap.values())
    
    // Filter based on global filter and stock filter
    if (globalFilter || stockFilter) {
      return summaries.filter(stock => {
        const matchesGlobal = !globalFilter || 
          stock.stock.toLowerCase().includes(globalFilter.toLowerCase()) ||
          stock.accounts.some(account => 
            account.userid.toLowerCase().includes(globalFilter.toLowerCase()) ||
            account.name.toLowerCase().includes(globalFilter.toLowerCase())
          )
        
        const matchesStock = !stockFilter || stock.stock === stockFilter
        
        return matchesGlobal && matchesStock
      })
    }
    
    return summaries.sort((a, b) => a.stock.localeCompare(b.stock))
  }, [data, globalFilter, stockFilter, dateFrom, dateTo])

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
  }

  const calculateOverallSummary = () => {
    let totalBuyValue = 0
    let totalSellValue = 0
    let totalBrokerage = 0
    let uniqueStocks = stockSummaries.length
    let activePositions = 0

    stockSummaries.forEach(stock => {
      totalBuyValue += stock.totalBuyValue
      totalSellValue += stock.totalSellValue
      totalBrokerage += stock.totalBrokerage
      if (stock.totalNetQty > 0) activePositions++
    })

    return {
      totalBuyValue,
      totalSellValue,
      totalBrokerage,
      netPnL: totalSellValue - totalBuyValue,
      uniqueStocks,
      activePositions
    }
  }

  const summary = calculateOverallSummary()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Summary Book</h1>
        <Button onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(summary.totalBuyValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(summary.totalSellValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Net P/L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-xl font-bold",
              summary.netPnL >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(summary.netPnL)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Brokerage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(summary.totalBrokerage)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Unique Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary.uniqueStocks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary.activePositions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by account..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            
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

            {/* Date Range Filter */}
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal flex-1",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal flex-1",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(globalFilter || stockFilter || dateFrom || dateTo) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGlobalFilter('')
                  setStockFilter('')
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

      {/* Summary Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Stock / Account</TableHead>
                <TableHead className="text-right">Buy Qty</TableHead>
                <TableHead className="text-right">Sell Qty</TableHead>
                <TableHead className="text-right">Shares Remaining</TableHead>
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
                      <TableCell className="text-right">{stock.totalBuyQty.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{stock.totalSellQty.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {stock.totalNetQty.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(stock.avgBuyPrice)}</TableCell>
                      <TableCell className="text-right">
                        {stock.avgSellPrice > 0 ? formatCurrency(stock.avgSellPrice) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(stock.totalBuyValue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stock.totalSellValue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stock.totalBrokerage)}</TableCell>
                      <TableCell className="text-right">
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
                            <TableCell className="text-right">{account.buyQty.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{account.sellQty.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {account.netQty.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(account.avgBuyPrice)}</TableCell>
                            <TableCell className="text-right">
                              {account.avgSellPrice > 0 ? formatCurrency(account.avgSellPrice) : '-'}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(account.totalBuyValue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(account.totalSellValue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(account.totalBrokerage)}</TableCell>
                            <TableCell className="text-right">
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
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-20">ID</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Trade Value</TableHead>
                                        <TableHead className="text-right">Brokerage</TableHead>
                                        <TableHead className="text-right">Net Value</TableHead>
                                        <TableHead>Remarks</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {account.transactions.map((transaction) => {
                                        const netValue = transaction.action === 'Buy' 
                                          ? transaction.tradeValue + transaction.brokerage 
                                          : transaction.tradeValue - transaction.brokerage
                                        
                                        return (
                                          <TableRow key={transaction.id} className="hover:bg-muted/30">
                                            <TableCell className="font-mono text-xs">#{transaction.id}</TableCell>
                                            <TableCell>{format(new Date(transaction.date), 'dd-MMM-yy')}</TableCell>
                                            <TableCell>
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
                                            <TableCell>{transaction.source || '-'}</TableCell>
                                            <TableCell className="text-right">{transaction.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(transaction.price)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(transaction.tradeValue)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(transaction.brokerage)}</TableCell>
                                            <TableCell className={cn(
                                              "text-right font-medium",
                                              transaction.action === 'Buy' ? "text-red-600" : "text-green-600"
                                            )}>
                                              {transaction.action === 'Buy' ? '-' : '+'}{formatCurrency(netValue)}
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[200px] truncate" title={transaction.remarks || ''}>
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
    </div>
  )
}