// components/charts/holdings-distribution-chart.tsx
'use client'

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface HoldingsDistributionChartProps {
  data: Array<{
    stock: string
    quantity: number
    value: number
    avgPrice: number
  }>
}

const COLORS = [
  '#8B7355', // Primary color
  '#10b981', // Green
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6b7280', // Gray for "Other"
]

export function HoldingsDistributionChart({ data }: HoldingsDistributionChartProps) {
  const chartData = useMemo(() => {
    const totalValue = data.reduce((sum, item) => sum + item.value, 0)
    
    // Sort by value descending
    const sortedData = [...data].sort((a, b) => b.value - a.value)
    
    // Separate into main holdings and small holdings
    const mainHoldings: any[] = []
    let otherValue = 0
    let otherCount = 0
    const otherStocks: string[] = []
    
    sortedData.forEach(item => {
      const percentage = (item.value / totalValue) * 100
      
      if (percentage >= 1 && mainHoldings.length < 9) { // Keep top 9 if they're >= 1%
        mainHoldings.push({
          ...item,
          percentage: percentage.toFixed(1)
        })
      } else {
        otherValue += item.value
        otherCount++
        otherStocks.push(item.stock)
      }
    })
    
    // Add "Other" category if there are small holdings
    if (otherCount > 0) {
      mainHoldings.push({
        stock: 'Other',
        value: otherValue,
        quantity: 0,
        avgPrice: 0,
        percentage: ((otherValue / totalValue) * 100).toFixed(1),
        count: otherCount,
        stocks: otherStocks
      })
    }
    
    return mainHoldings
  }, [data])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg shadow-lg p-4 max-w-xs">
          <p className="text-sm font-medium mb-2">{data.stock}</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Value:</span>{' '}
              <span className="font-medium">{formatCurrency(data.value)}</span>
            </p>
            {data.stock !== 'Other' ? (
              <>
                <p>
                  <span className="text-muted-foreground">Quantity:</span>{' '}
                  <span className="font-medium">{data.quantity.toFixed(2)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Avg Price:</span>{' '}
                  <span className="font-medium">{formatCurrency(data.avgPrice)}</span>
                </p>
              </>
            ) : (
              <div>
                <p>
                  <span className="text-muted-foreground">Includes:</span>{' '}
                  <span className="font-medium">{data.count} stocks</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.stocks.slice(0, 5).join(', ')}
                  {data.stocks.length > 5 && ` and ${data.stocks.length - 5} more...`}
                </p>
              </div>
            )}
            <p>
              <span className="text-muted-foreground">Portfolio:</span>{' '}
              <span className="font-bold text-primary">{data.percentage}%</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 3) return null // Don't show label for very small slices
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${percentage}%`}
      </text>
    )
  }

  const totalValue = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Distribution</CardTitle>
        <CardDescription>
          Holdings allocation by value (stocks under 1% grouped as "Other")
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value: any, entry: any) => (
                <span className="text-sm">
                  {entry.payload.stock === 'Other' 
                    ? `Other (${entry.payload.count} stocks)` 
                    : entry.payload.stock} ({entry.payload.percentage}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Portfolio Value</span>
            <span className="font-bold">{formatCurrency(totalValue)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Number of Holdings</span>
            <span className="font-bold">{data.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}