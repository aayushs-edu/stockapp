// app/(dashboard)/transactions/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { ArrowUpDown, Download } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

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
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  
  // Add state for manual filters
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <div className="w-16">{row.getValue('id')}</div>,
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

  // Filter data based on manual filters
  const filteredData = useMemo(() => {
    let filtered = [...data]
    
    // Apply account filter
    if (accountFilter !== 'all') {
      filtered = filtered.filter(item => item.userid === accountFilter)
    }
    
    // Apply action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(item => item.action === actionFilter)
    }
    
    return filtered
  }, [data, accountFilter, actionFilter])

  useEffect(() => {
    fetchData()
    fetchAccounts()
  }, [])

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
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
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
      return { buyTotal: 0, sellTotal: 0, buyQty: 0, sellQty: 0 }
    }

    const buyTransactions = summaryData.filter((t) => t.action === 'Buy')
    const sellTransactions = summaryData.filter((t) => t.action === 'Sell')

    const buyTotal = buyTransactions.reduce((sum, t) => sum + t.tradeValue + t.brokerage, 0)
    const sellTotal = sellTransactions.reduce((sum, t) => sum + t.tradeValue - t.brokerage, 0)
    const buyQty = buyTransactions.reduce((sum, t) => sum + t.quantity, 0)
    const sellQty = sellTransactions.reduce((sum, t) => sum + t.quantity, 0)

    return { buyTotal, sellTotal, buyQty, sellQty }
  }

  const summary = calculateSummary()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trade Book</h1>
        <Button onClick={exportToCSV}>
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

            <Input
              placeholder="Search stocks..."
              value={(table.getColumn('stock')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('stock')?.setFilterValue(event.target.value)
              }
            />

            <Input
              placeholder="Search all columns..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
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
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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

      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {table.getFilteredRowModel().rows.length} of{" "}
          {filteredData.length} row(s)
          {(accountFilter !== 'all' || actionFilter !== 'all') && ' (filtered)'}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
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
              <p className="text-xl font-bold">{Math.trunc((summary.buyQty - summary.sellQty) * 100) / 100}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}