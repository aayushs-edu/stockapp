// app/(dashboard)/transactions/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
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
import { ArrowUpDown, Download, CalendarIcon, Edit2 } from 'lucide-react'
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

// Custom filter function for account filtering
const accountFilter: FilterFn<Transaction> = (row, columnId, filterValue) => {
  return row.original.userid === filterValue
}

export default function TransactionsPage() {
  const [data, setData] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(false) // Changed from true
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const router = useRouter()
  
  // Add state for manual filters
  const [accountFilter, setAccountFilter] = useState<string>('') // Changed from 'all'
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('')
  const [stockSearchOpen, setStockSearchOpen] = useState(false)
  const [stockSearchValue, setStockSearchValue] = useState('')
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [dateFromInput, setDateFromInput] = useState('')
  const [dateToInput, setDateToInput] = useState('')

  // Get unique stocks for autocomplete
  const uniqueStocks = useMemo(() => {
    const stocks = new Set(data.map(t => t.stock))
    return Array.from(stocks).sort()
  }, [data])

  const handleEditTransaction = (id: number) => {
    router.push(`/modify/${id}`)
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
            onClick={() => handleEditTransaction(row.original.id)}
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
      cell: ({ row }) => format(new Date(row.getValue('date')), 'dd-MMM-yy'),
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

  // Helper function to parse date input
  const parseDateInput = (value: string): Date | undefined => {
    if (!value) return undefined
    
    // Try different date formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // D/M/YYYY
    ]
    
    for (const format of formats) {
      const match = value.match(format)
      if (match) {
        if (format === formats[0]) {
          // YYYY-MM-DD
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
        } else {
          // DD/MM/YYYY or DD-MM-YYYY
          return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
        }
      }
    }
    
    // Try to parse as a natural date
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? undefined : parsed
  }

  // Update dates when input changes
  useEffect(() => {
    const parsed = parseDateInput(dateFromInput)
    if (parsed) setDateFrom(parsed)
    else if (dateFromInput === '') setDateFrom(undefined)
  }, [dateFromInput])

  useEffect(() => {
    const parsed = parseDateInput(dateToInput)
    if (parsed) setDateTo(parsed)
    else if (dateToInput === '') setDateTo(undefined)
  }, [dateToInput])

  // Filter data based on manual filters
  const filteredData = useMemo(() => {
    let filtered = [...data]
    
    // Apply account filter
    if (accountFilter && accountFilter !== 'all') {
      filtered = filtered.filter(item => item.userid === accountFilter)
    }
    
    // Apply action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(item => item.action === actionFilter)
    }
    
    // Apply stock filter
    if (stockFilter) {
      filtered = filtered.filter(item => item.stock === stockFilter)
    }
    
    // Apply date filters
    if (dateFrom) {
      filtered = filtered.filter(item => new Date(item.date) >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter(item => new Date(item.date) <= dateTo)
    }
    
    return filtered
  }, [data, accountFilter, actionFilter, stockFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchAccounts()
  }, [])

  // Only fetch data when account is selected
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
      console.log('API Response:', result)
      
      if (Array.isArray(result)) {
        setData(result)
      } else {
        console.error('Unexpected response format:', result)
        setData([])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (!response.ok) {
        console.error('Failed to fetch accounts:', response.status)
        setAccounts([])
        return
      }
      const result = await response.json()
      if (Array.isArray(result)) {
        setAccounts(result)
      } else {
        setAccounts([])
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      setAccounts([])
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
      format(new Date(row.date), 'dd-MMM-yy'),
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
    a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`
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
        remainingBuyValue: 0
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
      remainingBuyValue
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
                ? `Showing transactions from ${accounts.length} accounts`
                : `Showing transactions for ${accounts.find(acc => acc.userid === accountFilter)?.name || accountFilter}`
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
                <SelectValue placeholder="Select Account" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.userid} value={account.userid}>
                    {account.userid} - {account.name}
                  </SelectItem>
                ))}
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

            {/* Date Range Filter with typed input */}
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
                  <div className="p-3 border-b">
                    <Input
                      placeholder="YYYY-MM-DD or DD/MM/YYYY"
                      value={dateFromInput}
                      onChange={(e) => setDateFromInput(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date)
                      if (date) {
                        setDateFromInput(format(date, 'yyyy-MM-dd'))
                      }
                    }}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
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
                  <div className="p-3 border-b">
                    <Input
                      placeholder="YYYY-MM-DD or DD/MM/YYYY"
                      value={dateToInput}
                      onChange={(e) => setDateToInput(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date)
                      if (date) {
                        setDateToInput(format(date, 'yyyy-MM-dd'))
                      }
                    }}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
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
                  setDateFromInput('')
                  setDateToInput('')
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
          <div className="flex items-center justify-between">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing {table.getFilteredRowModel().rows.length} of{" "}
              {filteredData.length} row(s)
              {(accountFilter !== 'all' || actionFilter !== 'all' || stockFilter || dateFrom || dateTo) && ' (filtered)'}
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
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
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Buy Total</p>
                    <p className="text-xl font-bold">{formatCurrency(summary.buyTotal)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Sell Total</p>
                    <p className="text-xl font-bold">{formatCurrency(summary.sellTotal)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Net P/L</p>
                    <p className={`text-xl font-bold ${summary.sellTotal - summary.buyTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.sellTotal - summary.buyTotal)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Shares Held</p>
                    <p className="text-xl font-bold">{summary.netQty.toFixed(2)}</p>
                  </div>
                </div>
                
                {/* Average Prices Section */}
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Avg Buy Price</p>
                      <p className="text-lg font-semibold">
                        {summary.avgBuyPrice > 0 ? formatCurrency(summary.avgBuyPrice) : '-'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Avg Sell Price</p>
                      <p className="text-lg font-semibold">
                        {summary.avgSellPrice > 0 ? formatCurrency(summary.avgSellPrice) : '-'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Buy Quantity</p>
                      <p className="text-lg font-semibold">{summary.buyQty.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Sell Quantity</p>
                      <p className="text-lg font-semibold">{summary.sellQty.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Remaining Investment Section */}
                  {summary.netQty > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Remaining Shares</p>
                          <p className="text-lg font-semibold">{summary.netQty.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Remaining Avg Buy Price</p>
                          <p className="text-lg font-semibold text-primary">
                            {summary.remainingAvgBuyPrice > 0 ? formatCurrency(summary.remainingAvgBuyPrice) : '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Remaining Buy Value</p>
                          <p className="text-lg font-semibold">{formatCurrency(summary.remainingBuyValue)}</p>
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
    </div>
  )
}