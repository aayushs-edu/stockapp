// app/(dashboard)/transactions/page.tsx
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  FilterFn,
} from '@tanstack/react-table'
import { ArrowUpDown, Download, Edit2, Loader2 } from 'lucide-react'
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
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker'
import { useAccounts } from '@/components/providers/accounts-provider'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'

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

// Custom filter function for account filtering
const accountFilter: FilterFn<Transaction> = (row, columnId, filterValue) => {
  return row.original.userid === filterValue
}

export default function TransactionsPage() {
  const { activeAccounts, loading: accountsLoading } = useAccounts()
  const [data, setData] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  
  // Add state for edit dialog
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  
  // Add state for manual filters
  const [accountFilter, setAccountFilter] = useState<string>('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('')
  const [stockSearchOpen, setStockSearchOpen] = useState(false)
  const [stockSearchValue, setStockSearchValue] = useState('')
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const pageSize = 100
  
  // AbortController for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // All available stocks (loaded separately)
  const [allStocks, setAllStocks] = useState<string[]>([])
  const [loadingStocks, setLoadingStocks] = useState(false)

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditDialogOpen(true)
  }

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 w-20">
          <span className="font-mono text-sm">{row.getValue('id')}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-60 hover:opacity-100"
            onClick={() => handleEditTransaction(row.original)}
            title="Edit transaction"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: 'userid',
      header: 'User ID',
      cell: ({ row }) => <div className="font-medium">{row.getValue('userid')}</div>,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => format(new Date(row.getValue('date')), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'stock',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Stock
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const action = row.getValue('action') as string
        return (
          <Badge variant={action === 'Buy' ? 'default' : 'secondary'}>
            {action}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => row.getValue('source') || '-',
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Quantity
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="text-right">{row.getValue('quantity')}</div>,
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue('price'))}</div>,
    },
    {
      accessorKey: 'tradeValue',
      header: 'Trade Value',
      cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue('tradeValue'))}</div>,
    },
    {
      accessorKey: 'brokerage',
      header: 'Brokerage',
      cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue('brokerage'))}</div>,
    },
    {
      id: 'netValue',
      header: 'Net Value',
      cell: ({ row }) => {
        const action = row.original.action
        const tradeValue = row.original.tradeValue
        const brokerage = row.original.brokerage
        const netValue = action === 'Buy' ? tradeValue + brokerage : tradeValue - brokerage
        return <div className="text-right font-medium">{formatCurrency(netValue)}</div>
      },
    },
    {
      accessorKey: 'orderRef',
      header: 'Order Ref',
      cell: ({ row }) => row.getValue('orderRef') || '-',
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: ({ row }) => {
        const remarks = row.getValue('remarks') as string
        return remarks ? (
          <div className="max-w-[200px] truncate" title={remarks}>
            {remarks}
          </div>
        ) : '-'
      },
    },
  ]

  // Use data directly since filtering is done server-side
  const filteredData = data

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
    setData([])
    if (accountFilter) {
      fetchData(1, true)
    }
  }, [accountFilter, actionFilter, stockFilter, dateFrom, dateTo])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])
  
  // Fetch all unique stocks on mount
  useEffect(() => {
    fetchAllStocks()
  }, [])
  
  const fetchAllStocks = async () => {
    setLoadingStocks(true)
    try {
      // Fetch with mode=all to get all stocks, but with a special flag to only return unique stocks
      const response = await fetch('/api/stocks/unique')
      if (response.ok) {
        const stocks = await response.json()
        setAllStocks(stocks.sort())
      }
    } catch (error) {
      console.error('Failed to fetch stock list:', error)
      // Fallback to empty array
      setAllStocks([])
    } finally {
      setLoadingStocks(false)
    }
  }

  const fetchData = async (page: number = 1, reset: boolean = false) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })
      
      // Add filters
      if (accountFilter && accountFilter !== 'all') params.append('userid', accountFilter)
      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter)
      if (stockFilter) params.append('stock', stockFilter)
      if (dateFrom) params.append('dateFrom', dateFrom.toISOString())
      if (dateTo) params.append('dateTo', dateTo.toISOString())
      
      const response = await fetch(`/api/stocks?${params}`, {
        signal: abortController.signal
      })
      
      if (!response.ok) {
        console.error('Failed to fetch stocks:', response.status)
        if (reset) setData([])
        return
      }
      
      const result = await response.json()
      
      if (result.data && Array.isArray(result.data)) {
        if (reset) {
          setData(result.data)
        } else {
          setData(prev => [...prev, ...result.data])
        }
        
        // Update pagination info
        setCurrentPage(result.pagination.page)
        setTotalPages(result.pagination.totalPages)
        setTotalCount(result.pagination.totalCount)
        setHasMore(result.pagination.hasMore)
      } else {
        console.error('Unexpected response format:', result)
        if (reset) setData([])
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled')
      } else {
        console.error('Failed to fetch transactions:', error)
        if (reset) setData([])
      }
    } finally {
      // Only update loading states if this request wasn't aborted
      if (abortController.signal && !abortController.signal.aborted) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  const loadMoreData = () => {
    if (hasMore && !loadingMore) {
      fetchData(currentPage + 1, false)
    }
  }

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      pagination: {
        pageSize: 100, // Changed default to 100
      },
    },
    state: {
      sorting,
      columnFilters,
    },
  })

  const exportToCSV = () => {
    const csvData = table.getFilteredRowModel().rows.map(row => row.original)
    const headers = ['ID', 'Date', 'Stock', 'Action', 'Source', 'Quantity', 'Price', 'Trade Value', 'Brokerage', 'Net Value', 'Order Ref', 'Remarks']
    const rows = csvData.map((row: Transaction) => [
      row.id,
      format(new Date(row.date), 'dd/MM/yyyy'),
      row.stock,
      row.action,
      row.source || '',
      row.quantity,
      row.price,
      row.tradeValue,
      row.brokerage,
      row.action === 'Buy' ? row.tradeValue + row.brokerage : row.tradeValue - row.brokerage,
      row.orderRef || '',
      row.remarks || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${format(new Date(), 'dd-MM-yyyy')}.csv`
    a.click()
  }

  const calculateSummary = () => {
    const summaryData = table.getFilteredRowModel().rows.map(row => row.original)
    
    if (!Array.isArray(summaryData) || summaryData.length === 0) {
      return { 
        buyTotal: 0, 
        sellTotal: 0, 
        buyQty: 0, 
        sellQty: 0,
        avgBuyPrice: 0,
        avgSellPrice: 0,
        netQty: 0,
        remainingAvgBuyPrice: 0,
        currentInvestment: 0,
        remainingBuyValue: 0,
        realizedPnL: 0
      }
    }

    const buyTransactions = summaryData.filter((t) => t.action === 'Buy')
    const sellTransactions = summaryData.filter((t) => t.action === 'Sell')

    const buyTotal = buyTransactions.reduce((sum, t) => sum + t.tradeValue + t.brokerage, 0)
    const sellTotal = sellTransactions.reduce((sum, t) => sum + t.tradeValue - t.brokerage, 0)
    const buyQty = buyTransactions.reduce((sum, t) => sum + t.quantity, 0)
    const sellQty = sellTransactions.reduce((sum, t) => sum + t.quantity, 0)
    const netQty = buyQty - sellQty
    
    // Calculate weighted average prices
    const totalBuyValue = buyTransactions.reduce((sum, t) => sum + t.tradeValue, 0)
    const totalSellValue = sellTransactions.reduce((sum, t) => sum + t.tradeValue, 0)
    const avgBuyPrice = buyQty > 0 ? totalBuyValue / buyQty : 0
    const avgSellPrice = sellQty > 0 ? totalSellValue / sellQty : 0
    
    // Calculate current investment (buy total - sell total)
    const currentInvestment = buyTotal - sellTotal
    
    // Calculate realized P/L = sell total - (avg buy price * sold quantity)
    const realizedPnL = sellTotal - (avgBuyPrice * sellQty)
    
    // Calculate remaining average buy price using FIFO
    let remainingAvgBuyPrice = 0
    let remainingBuyValue = 0;
    if (netQty > 0 && buyTransactions.length > 0) {
      // Sort buy transactions by date (oldest first for FIFO)
      const sortedBuyTransactions = [...buyTransactions].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      // Track how many shares have been "used up" by sales
      let sharesAccountedFor = 0
      let remainingShares = []
      
      // Go through each buy transaction
      for (const buyTx of sortedBuyTransactions) {
        if (sharesAccountedFor >= sellQty) {
          // All sold shares have been accounted for, this entire transaction remains
          remainingShares.push({
            quantity: buyTx.quantity,
            price: buyTx.price,
            value: buyTx.quantity * buyTx.price
          })
        } else if (sharesAccountedFor + buyTx.quantity <= sellQty) {
          // This entire transaction was sold
          sharesAccountedFor += buyTx.quantity
        } else {
          // This transaction was partially sold
          const remainingQty = buyTx.quantity - (sellQty - sharesAccountedFor)
          remainingShares.push({
            quantity: remainingQty,
            price: buyTx.price,
            value: remainingQty * buyTx.price
          })
          sharesAccountedFor = sellQty
        }
      }
      
      // Calculate weighted average of remaining shares
      const totalRemainingValue = remainingShares.reduce((sum, s) => sum + s.value, 0)
      const totalRemainingQty = remainingShares.reduce((sum, s) => sum + s.quantity, 0)
      remainingAvgBuyPrice = totalRemainingQty > 0 ? totalRemainingValue / totalRemainingQty : 0
      // Calculate Remaining Buy Value
      remainingBuyValue = totalRemainingQty * remainingAvgBuyPrice;
    }

    return { 
      buyTotal, 
      sellTotal, 
      buyQty, 
      sellQty,
      avgBuyPrice,
      avgSellPrice,
      netQty,
      remainingAvgBuyPrice,
      currentInvestment,
      remainingBuyValue,
      realizedPnL
    }
  }

  const summary = calculateSummary()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Trade Book
            {accountFilter && (
              <span className="text-muted-foreground"> for </span>
            )}
            {accountFilter === 'all' ? (
              <span className="text-primary">all accounts</span>
            ) : accountFilter ? (
              <span className="text-primary">{accountFilter}</span>
            ) : null}
          </h1>
          {accountFilter && (
            <p className="text-sm text-muted-foreground mt-1">
              {accountFilter === 'all' 
                ? `Showing transactions from ${activeAccounts.length} accounts`
                : `Showing transactions for ${activeAccounts.find(acc => acc.userid === accountFilter)?.name || accountFilter}`
              }
            </p>
          )}
        </div>
        <Button onClick={exportToCSV} disabled={!accountFilter || filteredData.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    {activeAccounts.map((account) => (
                      <SelectItem key={account.userid} value={account.userid}>
                        {account.userid} - {account.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="all">All Active Accounts</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
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
                  disabled={loadingStocks}
                >
                  {loadingStocks ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading stocks...
                    </>
                  ) : (
                    stockFilter || "Select stock..."
                  )}
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
                    {allStocks.length === 0 && !loadingStocks ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No stocks available.
                      </div>
                    ) : (
                      allStocks
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
                        ))
                    )}
                    {allStocks.filter(stock => 
                      stock.toLowerCase().includes(stockSearchValue.toLowerCase())
                    ).length === 0 && allStocks.length > 0 && (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No stock found.
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Date Range Filter with Enhanced Date Picker */}
            <div className="flex gap-2">
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
          {(accountFilter || actionFilter !== 'all' || stockFilter || dateFrom || dateTo) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAccountFilter('')
                  setActionFilter('all')
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

      {!accountFilter ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>Please select an account to view transactions</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="h-10">
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} className="py-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="h-8" // Reduced row height
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-1">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {accountFilter && (
        <>
          <div className="space-y-4">
            {/* Show total count and load more button */}
            <div className="flex items-center justify-between">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing {data.length} of {totalCount} total transactions
                {hasMore && ` (Page ${currentPage} of ${totalPages})`}
              </div>
              <div className="flex items-center gap-2">
                {hasMore && (
                  <>
                    <Button
                      onClick={loadMoreData}
                      disabled={loadingMore}
                      variant="outline"
                      size="sm"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        `Load Next ${pageSize}`
                      )}
                    </Button>
                    <Button
                      onClick={async () => {
                        // Cancel any existing request
                        if (abortControllerRef.current) {
                          abortControllerRef.current.abort()
                        }
                        
                        const abortController = new AbortController()
                        abortControllerRef.current = abortController
                        
                        setLoading(true)
                        try {
                          const params = new URLSearchParams({ mode: 'all' })
                          if (accountFilter && accountFilter !== 'all') params.append('userid', accountFilter)
                          if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter)
                          if (stockFilter) params.append('stock', stockFilter)
                          if (dateFrom) params.append('dateFrom', dateFrom.toISOString())
                          if (dateTo) params.append('dateTo', dateTo.toISOString())
                          
                          const response = await fetch(`/api/stocks?${params}`, {
                            signal: abortController.signal
                          })
                          if (response.ok) {
                            const result = await response.json()
                            setData(result)
                            setHasMore(false)
                          }
                        } catch (error: any) {
                          if (error.name !== 'AbortError') {
                            console.error('Failed to load all data:', error)
                          }
                        } finally {
                          if (!abortController.signal.aborted) {
                            setLoading(false)
                          }
                        }
                      }}
                      disabled={loading || loadingMore}
                      variant="secondary"
                      size="sm"
                    >
                      Load All ({totalCount - data.length} remaining)
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Table pagination controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      table.setPageSize(Number.MAX_SAFE_INTEGER)
                    } else {
                      table.setPageSize(Number(value))
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 100, 1000, 2000].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                    <SelectItem value="all">
                      All
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          
      {filteredData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Buy Total</p>
                <p className="text-lg font-bold">{formatCurrency(summary.buyTotal)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Sell Total</p>
                <p className="text-lg font-bold">{formatCurrency(summary.sellTotal)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {summary.netQty > 0 ? 'Current Investment' : 'Realized P/L'}
                </p>
                <p className="text-lg font-bold">
                  {summary.netQty > 0 ? (
                    <PLIDisplay value={summary.remainingBuyValue} type="investment" />
                  ) : (
                    <PLIDisplay 
                      value={summary.realizedPnL} 
                      type={summary.realizedPnL >= 0 ? 'profit' : 'loss'} 
                    />
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Shares Held</p>
                <p className="text-lg font-bold">{summary.netQty.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Average Prices Section */}
            <div className="mt-3 pt-3 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avg Buy Price</p>
                  <p className="text-sm font-semibold">
                    {summary.avgBuyPrice > 0 ? formatCurrency(summary.avgBuyPrice) : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avg Sell Price</p>
                  <p className="text-sm font-semibold">
                    {summary.avgSellPrice > 0 ? formatCurrency(summary.avgSellPrice) : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Buy Quantity</p>
                  <p className="text-sm font-semibold">{summary.buyQty.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Sell Quantity</p>
                  <p className="text-sm font-semibold">{summary.sellQty.toFixed(2)}</p>
                </div>
              </div>
              
              {/* Remaining Investment Section */}
              {summary.netQty > 0 && (
                <div className="mt-3 p-2 rounded-lg bg-muted/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Remaining Shares</p>
                      <p className="text-sm font-semibold">{summary.netQty.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Remaining Avg Buy Price</p>
                      <p className="text-sm font-semibold text-primary">
                        {summary.remainingAvgBuyPrice > 0 ? formatCurrency(summary.remainingAvgBuyPrice) : '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Current Investment</p>
                      <p className="text-sm font-semibold text-amber-600">
                        {formatCurrency(summary.remainingBuyValue)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show both investment and realized P/L if both exist */}
              {summary.netQty > 0 && summary.sellQty > 0 && (
                <div className="mt-3 p-2 rounded-lg bg-muted/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Current Investment</p>
                      <p className="text-sm font-semibold">
                        <PLIDisplay value={summary.remainingBuyValue} type="investment" />
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Realized P/L</p>
                      <p className="text-sm font-semibold">
                        <PLIDisplay 
                          value={summary.realizedPnL} 
                          type={summary.realizedPnL >= 0 ? 'profit' : 'loss'} 
                        />
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}
      
      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        transaction={editingTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          fetchData() // Refresh the data after successful edit
        }}
      />
    </div>
  )
}