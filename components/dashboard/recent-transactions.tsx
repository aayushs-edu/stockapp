import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'

export async function RecentTransactions() {
  const transactions = await prisma.stock.findMany({
    take: 10,
    orderBy: { date: 'desc' },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {transaction.stock}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transaction.userid} • {formatDate(transaction.date)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={transaction.action === 'Buy' ? 'default' : 'secondary'}>
                  {transaction.action}
                </Badge>
                <span className="text-sm font-medium">
                  {formatCurrency(transaction.tradeValue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}