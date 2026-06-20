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
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, ArrowUpDown, Search } from 'lucide-react'
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
  const [searchValue, setSearchValue] = useState('')

  const sortedAndFilteredStocks = useMemo(() => {
    let filtered = [...stocks]

    // Apply status filter
    if (statusFilter === 'holding') {
      filtered = filtered.filter(stock => stock.status === 'Active')
    } else if (statusFilter === 'closed') {
      filtered = filtered.filter(stock => stock.status === 'Closed')
    }

    // Apply search term (live-filters the grid as you type)
    const term = searchValue.trim().toLowerCase()
    if (term) {
      filtered = filtered.filter(stock => stock.stock.toLowerCase().startsWith(term))
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
  }, [stocks, sortBy, statusFilter, searchValue])

  const handleStockClick = (stock: string) => {
    // Navigate to summary-book with "all-accounts" filter and specific stock
    const searchParams = new URLSearchParams({
      stock: stock
    })
    router.push(`/summary-book?${searchParams.toString()}`)
  }

  // Smart Enter: jump straight to a stock when the typed text is an exact
  // symbol match, or when it has narrowed the grid to a single candidate.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const term = searchValue.trim()
    if (!term) return
    const symbols = stocks.map(s => s.stock)
    const matches = symbols.filter(s => s.toLowerCase().startsWith(term.toLowerCase()))
    const chosen =
      symbols.find(s => s.toLowerCase() === term.toLowerCase()) ??
      (matches.length === 1 ? matches[0] : undefined)
    if (chosen) handleStockClick(chosen)
  }

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
        <div className="flex items-center gap-4 md:justify-self-start">
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

        <div className="relative w-full max-w-xs md:justify-self-center">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search stock..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="hidden md:block" />
      </div>

      <div className="flex flex-wrap gap-1">
        {sortedAndFilteredStocks.map((stock) => (
          <Button
            key={stock.stock}
            variant="outline"
            className={cn(
              "h-6 w-24 px-1.5 py-0.5 flex items-center justify-center transition-all relative overflow-hidden font-normal text-[10px] leading-none shrink-0",
              stock.status === 'Closed' && "bg-gray-100 text-gray-400 border-gray-300 opacity-70 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-400",
              stock.status === 'Active' 
                ? "hover:bg-green-50 hover:border-green-500 dark:hover:bg-green-950/20" 
                : "hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-950/20",
              "hover:text-inherit focus:text-inherit active:text-inherit"
            )}
            onClick={() => handleStockClick(stock.stock)}
            title={stock.stock} // Tooltip for full text
          >
            <span className="truncate w-full text-center font-bold">
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