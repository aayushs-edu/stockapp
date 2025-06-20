// components/dashboard/all-stocks-table-client.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ExternalLink, TrendingUp, TrendingDown, Grid3X3, TableIcon, ArrowUpDown, User } from 'lucide-react'
import Link from 'next/link'

interface StockData {
  stock: string
  buyQty: number
  sellQty: number
  remainingQty: number
  avgBuyPrice: number
  avgSellPrice: number
  buyValue: number
  sellValue: number
  realizedPnL: number
  realizedPnLPercent: number
  currentValue: number
  totalTransactions: number
  lastTransaction: Date | null
  lastUser: string | null
  status: 'Active' | 'Closed'
}

interface AllStocksTableClientProps {
  stocks: StockData[]
  totalCurrentValue: number
  totalRealizedPnL: number
  activeStocks: number
  closedStocks: number
}

export function AllStocksTableClient({
  stocks,
  totalCurrentValue,
  totalRealizedPnL,
  activeStocks,
  closedStocks
}: AllStocksTableClientProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<'name' | 'lastActivity'>('name')

  const sortedStocks = useMemo(() => {
    const sorted = [...stocks]
    if (sortBy === 'name') {
      return sorted.sort((a, b) => a.stock.localeCompare(b.stock))
    } else {
      return sorted.sort((a, b) => {
        if (!a.lastTransaction && !b.lastTransaction) return 0
        if (!a.lastTransaction) return 1
        if (!b.lastTransaction) return -1
        return new Date(b.lastTransaction).getTime() - new Date(a.lastTransaction).getTime()
      })
    }
  }, [stocks, sortBy])

  const handleStockClick = (stock: string) => {
    router.push(`/summary-book?stock=${encodeURIComponent(stock)}`)
  }

  return (
    <Tabs defaultValue="grid" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="grid" className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4" />
          Grid View
        </TabsTrigger>
        <TabsTrigger value="table" className="flex items-center gap-2">
          <TableIcon className="h-4 w-4" />
          Table View
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="grid" className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <Select value={sortBy} onValueChange={(value: 'name' | 'lastActivity') => setSortBy(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort by Name
                </div>
              </SelectItem>
              <SelectItem value="lastActivity">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort by Last Activity
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {sortedStocks.map((stock) => (
            <Button
              key={stock.stock}
              variant="outline"
              className={cn(
                "h-auto py-3 px-4 flex items-center justify-center transition-all relative overflow-hidden font-semibold text-sm",
                stock.status === 'Closed' && "bg-gray-100 text-gray-400 border-gray-300 opacity-70 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-400",
                stock.status === 'Active' 
                  ? "hover:bg-green-50 hover:border-green-500 dark:hover:bg-green-950/20" 
                  : "hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-950/20",
                "hover:text-inherit focus:text-inherit active:text-inherit"
              )}
              onClick={() => handleStockClick(stock.stock)}
            >
              <span className="flex items-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  stock.status === 'Active' ? "bg-green-500" : "bg-gray-400"
                )} />
                {stock.stock}
              </span>
            </Button>
          ))}
        </div>
        
        {stocks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No stocks found</p>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="table" className="mt-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Stock</TableHead>
                <TableHead className="text-right">P&L / Investment</TableHead>
                <TableHead className="text-center w-[120px]">Transactions</TableHead>
                <TableHead className="text-center w-[140px]">Last Activity</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((stock) => (
                <TableRow 
                  key={stock.stock}
                  className="hover:bg-muted/50 cursor-pointer h-12"
                  onClick={() => handleStockClick(stock.stock)}
                >
                  <TableCell className="font-medium py-2">
                    <div className="flex items-center gap-2">
                      <span className="hover:text-primary transition-colors">
                        {stock.stock}
                      </span>
                      <Badge 
                        variant={stock.status === 'Active' ? 'default' : 'secondary'}
                        className="text-xs h-5"
                      >
                        {stock.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    {stock.status === 'Closed' ? (
                      // Show realized P&L for closed positions
                      stock.realizedPnL !== 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          {stock.realizedPnL > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={cn(
                            "font-medium",
                            stock.realizedPnL >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {stock.realizedPnL >= 0 ? 'Profit: ' : 'Loss: '}
                            {formatCurrency(Math.abs(stock.realizedPnL))}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({stock.realizedPnLPercent.toFixed(1)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Break-even</span>
                      )
                    ) : (
                      // Show investment for active positions
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-muted-foreground">
                          Investment: {formatCurrency(stock.currentValue)}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <Badge variant="outline" className="text-xs">
                      {stock.totalTransactions}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground py-2">
                    <div className="space-y-0.5">
                      {stock.lastTransaction && (
                        <div>
                          {new Date(stock.lastTransaction).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit'
                          })}
                        </div>
                      )}
                      {stock.lastUser && (
                        <div className="text-xs flex items-center justify-center gap-1">
                          <User className="h-3 w-3" />
                          {stock.lastUser}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="py-2">
                    <Link href={`/summary-book?stock=${encodeURIComponent(stock.stock)}`}>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">View details</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              
              {stocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="text-muted-foreground">
                      <p>No stocks found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}