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
        <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-15 gap-0.5">
          {sortedStocks.map((stock) => (
            <Button
              key={stock.stock}
              variant="outline"
              className={cn(
                "h-6 px-1 py-0.5 flex items-center justify-center transition-all relative overflow-hidden font-normal text-[10px] leading-tight min-w-0",
                stock.status === 'Closed' && "bg-gray-100 text-gray-400 border-gray-300 opacity-70 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-400",
                stock.status === 'Active' 
                  ? "hover:bg-green-50 hover:border-green-500 dark:hover:bg-green-950/20" 
                  : "hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-950/20",
                "hover:text-inherit focus:text-inherit active:text-inherit"
              )}
              onClick={() => handleStockClick(stock.stock)}
              title={stock.stock} // Tooltip for full text
            >
              <span className="truncate w-full text-center">
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
              <TableRow className="h-6">
                <TableHead className="w-[200px] py-0.5 text-xs">Stock</TableHead>
                <TableHead className="text-right py-0.5 text-xs">P&L / Investment</TableHead>
                <TableHead className="text-center w-[100px] py-0.5 text-xs">Trades</TableHead>
                <TableHead className="text-center w-[120px] py-0.5 text-xs">Last Activity</TableHead>
                <TableHead className="w-[40px] py-0.5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((stock) => (
                <TableRow 
                  key={stock.stock}
                  className="hover:bg-muted/50 cursor-pointer h-6"
                  onClick={() => handleStockClick(stock.stock)}
                >
                  <TableCell className="font-medium py-0.5 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="hover:text-primary transition-colors">
                        {stock.stock}
                      </span>
                      <Badge 
                        variant={stock.status === 'Active' ? 'default' : 'secondary'}
                        className="text-[8px] h-3 px-1"
                      >
                        {stock.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-0.5">
                    {stock.status === 'Closed' ? (
                      // Show realized P&L for closed positions
                      stock.realizedPnL !== 0 ? (
                        <div className="flex items-center justify-end gap-0.5">
                          {stock.realizedPnL > 0 ? (
                            <TrendingUp className="h-2.5 w-2.5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-2.5 w-2.5 text-red-600" />
                          )}
                          <span className={cn(
                            "font-medium text-[10px]",
                            stock.realizedPnL >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCurrency(Math.abs(stock.realizedPnL))}
                          </span>
                          <span className="text-[8px] text-muted-foreground">
                            ({stock.realizedPnLPercent.toFixed(1)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">Break-even</span>
                      )
                    ) : (
                      // Show investment for active positions
                      <div className="flex items-center justify-end">
                        <span className="text-muted-foreground text-[10px]">
                          {formatCurrency(stock.currentValue)}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center py-0.5">
                    <Badge variant="outline" className="text-[8px] h-3 px-1">
                      {stock.totalTransactions}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground py-0.5">
                    <div className="space-y-0">
                      {stock.lastTransaction && (
                        <div className="text-[9px]">
                          {new Date(stock.lastTransaction).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit'
                          })}
                        </div>
                      )}
                      {stock.lastUser && (
                        <div className="text-[8px] flex items-center justify-center gap-0.5">
                          <User className="h-1.5 w-1.5" />
                          {stock.lastUser}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="py-0.5">
                    <Link href={`/summary-book?stock=${encodeURIComponent(stock.stock)}`}>
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0">
                        <ExternalLink className="h-2.5 w-2.5" />
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