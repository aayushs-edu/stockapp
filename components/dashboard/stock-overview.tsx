// components/dashboard/stock-overview.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { prisma } from '@/lib/db'
import { TrendingUp, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

export async function StockOverview() {
  const stockSummary = await prisma.stock.groupBy({
    by: ['stock'],
    _sum: {
      quantity: true,
      tradeValue: true
    },
    where: {
      action: 'Buy'
    },
    take: 6,
    orderBy: {
      _sum: {
        quantity: 'desc'
      }
    }
  })

  // Get sell data to calculate remaining quantities
  const sellSummary = await prisma.stock.groupBy({
    by: ['stock'],
    _sum: {
      quantity: true
    },
    where: {
      action: 'Sell',
      stock: {
        in: stockSummary.map(s => s.stock)
      }
    }
  })

  const sellMap = new Map(sellSummary.map(s => [s.stock, s._sum.quantity || 0]))
  
  const holdings = stockSummary.map(item => {
    const buyQty = item._sum.quantity || 0
    const sellQty = sellMap.get(item.stock) || 0
    const remainingQty = buyQty - sellQty
    const avgPrice = (item._sum.tradeValue || 0) / buyQty
    const currentValue = remainingQty * avgPrice
    
    return {
      stock: item.stock,
      quantity: remainingQty,
      value: currentValue,
      avgPrice
    }
  }).filter(h => h.quantity > 0)

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0)

  return (
    <Card className="col-span-full lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Top Holdings</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Your largest stock positions
          </p>
        </div>
        <Package className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {holdings.map((item, index) => {
            const percentage = (item.value / totalValue) * 100
            const colors = [
              'bg-primary',
              'bg-green-600',
              'bg-blue-600',
              'bg-amber-600',
              'bg-purple-600',
              'bg-pink-600'
            ]
            
            return (
              <div key={item.stock} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className={cn(
                        "w-2 h-2 rounded-full",
                        colors[index % colors.length]
                      )}
                    />
                    <span className="font-medium">{item.stock}</span>
                    <Badge variant="outline" className="text-xs">
                      {percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {item.quantity.toFixed(2)} shares
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{(item.value / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                  style={{
                    '--progress-color': colors[index % colors.length].replace('bg-', '')
                  } as any}
                />
              </div>
            )
          })}
          
          {holdings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No active holdings</p>
            </div>
          )}
        </div>
        
        {holdings.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Portfolio Value</span>
              <span className="text-lg font-bold">₹{(totalValue / 1000).toFixed(1)}k</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}