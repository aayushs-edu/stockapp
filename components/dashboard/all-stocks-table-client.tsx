// components/dashboard/all-stocks-table-client.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react'
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'holding' | 'closed'>('all')

  const sortedAndFilteredStocks = useMemo(() => {
    let filtered = [...stocks]
    
    // Apply status filter
    if (statusFilter === 'holding') {
      filtered = filtered.filter(stock => stock.status === 'Active')
    } else if (statusFilter === 'closed') {
      filtered = filtered.filter(stock => stock.status === 'Closed')
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      return filtered.sort((a, b) => a.stock.localeCompare(b.stock))
    } else {
      return filtered.sort((a, b) => {
        if (!a.lastTransaction && !b.lastTransaction) return 0
        if (!a.lastTransaction) return 1
        if (!b.lastTransaction) return -1
        return new Date(b.lastTransaction).getTime() - new Date(a.lastTransaction).getTime()
      })
    }
  }, [stocks, sortBy, statusFilter])

  const handleStockClick = (stock: string) => {
    // Navigate to summary-book and let it handle setting "all accounts" automatically
    router.push(`/summary-book?stock=${encodeURIComponent(stock)}`)
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4">
        <Select value={sortBy} onValueChange={(value: 'name' | 'lastActivity') => setSortBy(value)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3 w-3" />
                Sort by Name
              </div>
            </SelectItem>
            <SelectItem value="lastActivity">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3 w-3" />
                Sort by Last Activity
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value: 'all' | 'holding' | 'closed') => setStatusFilter(value)}>
          <SelectTrigger className="w-[112px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stocks</SelectItem>
            <SelectItem value="holding">Holdings Only</SelectItem>
            <SelectItem value="closed">Closed Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-11 xl:grid-cols-14 gap-1">
        {sortedAndFilteredStocks.map((stock) => (
          <Button
            key={stock.stock}
            variant="outline"
            className={cn(
              "h-6 px-1.5 py-0.5 flex items-center justify-center transition-all relative overflow-hidden font-normal text-[10px] leading-none min-w-0",
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
      
      {sortedAndFilteredStocks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No stocks found</p>
        </div>
      )}
    </div>
  )
}