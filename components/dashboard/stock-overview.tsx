import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/db'

export async function StockOverview() {
  const stockSummary = await prisma.stock.groupBy({
    by: ['stock'],
    _sum: {
      quantity: true
    },
    where: {
      action: 'Buy'
    },
    take: 5,
    orderBy: {
      _sum: {
        quantity: 'desc'
      }
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stockSummary.map((item) => (
            <div key={item.stock} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{item.stock}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {item._sum.quantity} shares
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}