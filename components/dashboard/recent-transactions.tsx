// components/dashboard/recent-transactions.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'

export async function RecentTransactions() {
  const transactions = await prisma.stock.findMany({
    take: 10,
    orderBy: { date: 'desc' }
  })

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Your latest trading activity
          </p>
        </div>
        <Clock className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => {
            const isBuy = transaction.action === 'Buy'
            const netValue = isBuy 
              ? transaction.tradeValue + transaction.brokerage 
              : transaction.tradeValue - transaction.brokerage

            return (
              <div 
                key={transaction.id} 
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${isBuy ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    {isBuy ? (
                      <ArrowDownRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{transaction.stock}</p>
                      <Badge variant={isBuy ? 'default' : 'secondary'} className="text-xs">
                        {transaction.action}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span>{transaction.userid}</span>
                      <span>•</span>
                      <span>{formatDate(transaction.date)}</span>
                      <span>•</span>
                      <span>{transaction.quantity} shares @ {formatCurrency(transaction.price)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${isBuy ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {isBuy ? '-' : '+'}{formatCurrency(netValue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Trade ID: #{transaction.id}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}