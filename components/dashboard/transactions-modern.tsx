// components/dashboard/transactions-modern.tsx
'use client'

import { useState, useMemo } from 'react'
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
import { ArrowUpDown, Download, Edit2, Loader2, Trash2 } from 'lucide-react'
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
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker'
import { useAccounts } from '@/components/providers/accounts-provider'
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

export function TransactionsModern() {
  const { activeAccounts, loading: accountsLoading, selectedAccount, setSelectedAccount, stocks, stocksLoading, refreshStocks } = useAccounts()
  const loading = stocksLoading
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const accountFilter = selectedAccount
  const setAccountFilter = setSelectedAccount
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('')
  const [stockSearchOpen, setStockSearchOpen] = useState(false)
  const [stockSearchValue, setStockSearchValue] = useState('')
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()

  const allStocks = useMemo(() => Array.from(new Set(stocks.map(t => t.stock))).sort(), [stocks])

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

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 w-24">
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
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-60 hover:opacity-100 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950"
            onClick={() => handleDeleteTransaction(row.original)}
            title="Delete transaction"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: 'userid',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          User ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue('userid')}</div>,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => format(new Date(row.getValue('date')), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'stock',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Stock
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const action = row.getValue('action') as string
        return <Badge variant={action === 'Buy' ? 'default' : 'secondary'}>{action}</Badge>
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => row.getValue('source') || '-',
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Quantity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
          <div className="max-w-[200px] truncate" title={remarks}>{remarks}</div>
        ) : '-'
      },
    },
  ]

  const filteredData = useMemo(() => {
    let result = stocks as Transaction[]
    if (accountFilter && accountFilter !== 'all-accounts') {
      result = result.filter(t => t.userid === accountFilter)
    }
    if (actionFilter && actionFilter !== 'all') {
      result = result.filter(t => t.action === actionFilter)
    }
    if (stockFilter) {
      result = result.filter(t => t.stock === stockFilter)
    }
    if (dateFrom) {
      result = result.filter(t => new Date(t.date) >= dateFrom)
    }
    if (dateTo) {
      result = result.filter(t => new Date(t.date) <= dateTo)
    }
    return result
  }, [stocks, accountFilter, actionFilter, stockFilter, dateFrom, dateTo])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    initialState: { pagination: { pageSize: 100 } },
    state: { sorting, columnFilters },
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

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
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
        buyTotal: 0, sellTotal: 0, buyQty: 0, sellQty: 0,
        avgBuyPrice: 0, avgSellPrice: 0, netQty: 0,
        remainingAvgBuyPrice: 0, currentInvestment: 0,
        remainingBuyValue: 0, realizedPnL: 0
      }
    }
    const buyTransactions = summaryData.filter((t) => t.action === 'Buy')
    const sellTransactions = summaryData.filter((t) => t.action === 'Sell')
    const buyTotal = buyTransactions.reduce((sum, t) => sum + t.tradeValue + t.brokerage, 0)
    const sellTotal = sellTransactions.reduce((sum, t) => sum + t.tradeValue - t.brokerage, 0)
    const buyQty = buyTransactions.reduce((sum, t) => sum + t.quantity, 0)
    const sellQty = sellTransactions.reduce((sum, t) => sum + t.quantity, 0)
    const netQty = buyQty - sellQty
    const totalBuyValue = buyTransactions.reduce((sum, t) => sum + t.tradeValue, 0)
    const totalSellValue = sellTransactions.reduce((sum, t) => sum + t.tradeValue, 0)
    const avgBuyPrice = buyQty > 0 ? totalBuyValue / buyQty : 0
    const avgSellPrice = sellQty > 0 ? totalSellValue / sellQty : 0
    const currentInvestment = buyTotal - sellTotal
    const realizedPnL = sellTotal - (avgBuyPrice * sellQty)
    let remainingAvgBuyPrice = 0
    let remainingBuyValue = 0
    if (netQty > 0 && buyTransactions.length > 0) {
      const sortedBuyTransactions = [...buyTransactions].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      let sharesAccountedFor = 0
      let remainingShares: { quantity: number; price: number; value: number }[] = []
      for (const buyTx of sortedBuyTransactions) {
        if (sharesAccountedFor >= sellQty) {
          remainingShares.push({ quantity: buyTx.quantity, price: buyTx.price, value: buyTx.quantity * buyTx.price })
        } else if (sharesAccountedFor + buyTx.quantity <= sellQty) {
          sharesAccountedFor += buyTx.quantity
        } else {
          const remainingQty = buyTx.quantity - (sellQty - sharesAccountedFor)
          remainingShares.push({ quantity: remainingQty, price: buyTx.price, value: remainingQty * buyTx.price })
          sharesAccountedFor = sellQty
        }
      }
      const totalRemainingValue = remainingShares.reduce((sum, s) => sum + s.value, 0)
      const totalRemainingQty = remainingShares.reduce((sum, s) => sum + s.quantity, 0)
      remainingAvgBuyPrice = totalRemainingQty > 0 ? totalRemainingValue / totalRemainingQty : 0
      remainingBuyValue = totalRemainingQty * remainingAvgBuyPrice
    }
    return { buyTotal, sellTotal, buyQty, sellQty, avgBuyPrice, avgSellPrice, netQty, remainingAvgBuyPrice, currentInvestment, remainingBuyValue, realizedPnL }
  }

  const summary = calculateSummary()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Trade Book
            {accountFilter && <span className="text-muted-foreground"> for </span>}
            {accountFilter === 'all-accounts' ? (
              <span className="text-primary">all accounts</span>
            ) : accountFilter ? (
              <span className="text-primary">{accountFilter}</span>
            ) : null}
          </h1>
          {accountFilter && (
            <p className="text-sm text-muted-foreground mt-1">
              {accountFilter === 'all-accounts'
                ? `Showing transactions from ${activeAccounts.length} accounts`
                : `Showing transactions for ${activeAccounts.find(acc => acc.userid === accountFilter)?.name || accountFilter}`}
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
                  <div className="py-4 text-center text-sm text-muted-foreground">No active accounts found</div>
                ) : (
                  <>
                    {activeAccounts.map((account) => (
                      <SelectItem key={account.userid} value={account.userid}>
                        {account.userid} - {account.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="all-accounts">All Active Accounts</SelectItem>
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

            <Popover open={stockSearchOpen} onOpenChange={setStockSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={stockSearchOpen}
                  className="justify-between"
                  disabled={stocksLoading}
                >
                  {stocksLoading ? (
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
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      const term = stockSearchValue.trim()
                      if (!term) return
                      const matches = allStocks.filter(s =>
                        s.toLowerCase().includes(term.toLowerCase())
                      )
                      // Prefer an exact symbol match; otherwise accept a lone candidate.
                      const chosen =
                        allStocks.find(s => s.toLowerCase() === term.toLowerCase()) ??
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
                      onClick={() => { setStockFilter(''); setStockSearchOpen(false); setStockSearchValue('') }}
                    >
                      All Stocks
                    </Button>
                    {allStocks.length === 0 && !stocksLoading ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">No stocks available.</div>
                    ) : (
                      allStocks
                        .filter(stock => stock.toLowerCase().includes(stockSearchValue.toLowerCase()))
                        .map((stock) => (
                          <Button
                            key={stock}
                            variant="ghost"
                            className="w-full justify-start px-2 py-1.5 text-sm hover:bg-accent"
                            onClick={() => { setStockFilter(stock); setStockSearchOpen(false); setStockSearchValue('') }}
                          >
                            {stock}
                          </Button>
                        ))
                    )}
                    {allStocks.filter(stock => stock.toLowerCase().includes(stockSearchValue.toLowerCase())).length === 0 && allStocks.length > 0 && (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">No stock found.</div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex gap-2">
              <EnhancedDatePicker value={dateFrom} onChange={setDateFrom} placeholder="From date" className="flex-1" />
              <EnhancedDatePicker value={dateTo} onChange={setDateTo} placeholder="To date" className="flex-1" />
            </div>
          </div>

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
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="py-2">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="h-8">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-1">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell>
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
            <div className="flex-1 text-sm text-muted-foreground">
              Showing {filteredData.length} transactions
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    if (value === 'all') table.setPageSize(Number.MAX_SAFE_INTEGER)
                    else table.setPageSize(Number(value))
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 100, 1000, 2000].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
                    ))}
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                <div className="text-sm text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
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
                        <PLIDisplay value={summary.realizedPnL} type={summary.realizedPnL >= 0 ? 'profit' : 'loss'} />
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Shares Held</p>
                    <p className="text-lg font-bold">{summary.netQty.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg Buy Price</p>
                      <p className="text-sm font-semibold">{summary.avgBuyPrice > 0 ? formatCurrency(summary.avgBuyPrice) : '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg Sell Price</p>
                      <p className="text-sm font-semibold">{summary.avgSellPrice > 0 ? formatCurrency(summary.avgSellPrice) : '-'}</p>
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
                            {summary.remainingAvgBuyPrice > 0 ? formatCurrency(summary.remainingAvgBuyPrice) : '-'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Current Investment</p>
                          <p className="text-sm font-semibold text-amber-600">{formatCurrency(summary.remainingBuyValue)}</p>
                        </div>
                      </div>
                    </div>
                  )}

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
                            <PLIDisplay value={summary.realizedPnL} type={summary.realizedPnL >= 0 ? 'profit' : 'loss'} />
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
