// components/charts/portfolio-value-chart.tsx
'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Calendar, CalendarDays, CalendarRange } from 'lucide-react'

interface PortfolioValueChartProps {
  data: Array<{
    date: string
    investment: number
    returns: number
    netValue: number
  }>
}

const timeRanges = [
  { label: '1M', value: 30, icon: Calendar },
  { label: '3M', value: 90, icon: CalendarDays },
  { label: '6M', value: 180, icon: CalendarDays },
  { label: '1Y', value: 365, icon: CalendarRange },
  { label: 'All', value: -1, icon: CalendarRange },
]

export function PortfolioValueChart({ data }: PortfolioValueChartProps) {
  const [selectedRange, setSelectedRange] = useState(365) // Default to 1 year

  const chartData = useMemo(() => {
    let filteredData = data
    
    if (selectedRange > 0) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - selectedRange)
      filteredData = data.filter(item => new Date(item.date) >= cutoffDate)
    }
    
    return filteredData.map(item => ({
      ...item,
      profit: item.netValue > 0 ? item.netValue : 0,
      loss: item.netValue < 0 ? Math.abs(item.netValue) : 0,
    }))
  }, [data, selectedRange])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg shadow-lg p-4">
          <p className="text-sm font-medium mb-2">{new Date(label).toLocaleDateString()}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Investment:</span>{' '}
              <span className="font-medium">{formatCurrency(data.investment)}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Returns:</span>{' '}
              <span className="font-medium">{formatCurrency(data.returns)}</span>
            </p>
            <p className={`text-sm font-bold ${data.netValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              P/L: {formatCurrency(data.netValue)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Calculate summary metrics for the selected period
  const periodMetrics = useMemo(() => {
    if (chartData.length === 0) return null
    
    const first = chartData[0]
    const last = chartData[chartData.length - 1]
    const periodReturn = last.returns - first.returns
    const periodInvestment = last.investment - first.investment
    const periodPnL = last.netValue - first.netValue
    
    return {
      periodReturn,
      periodInvestment,
      periodPnL,
      roi: first.investment > 0 ? (periodPnL / first.investment) * 100 : 0
    }
  }, [chartData])

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>
              Track your investment growth and returns over time
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {timeRanges.map((range) => {
              const Icon = range.icon
              return (
                <Button
                  key={range.value}
                  variant={selectedRange === range.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRange(range.value)}
                  className="px-3"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {range.label}
                </Button>
              )
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {periodMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Period Investment</p>
              <p className="text-lg font-semibold">{formatCurrency(periodMetrics.periodInvestment)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Period Returns</p>
              <p className="text-lg font-semibold">{formatCurrency(periodMetrics.periodReturn)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Period P/L</p>
              <p className={`text-lg font-semibold ${periodMetrics.periodPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(periodMetrics.periodPnL)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Period ROI</p>
              <p className={`text-lg font-semibold ${periodMetrics.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {periodMetrics.roi.toFixed(2)}%
              </p>
            </div>
          </div>
        )}
        
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B7355" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8B7355" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value)
                if (selectedRange <= 90) {
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                } else {
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                }
              }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="investment"
              stroke="#8B7355"
              fillOpacity={1}
              fill="url(#colorInvestment)"
              name="Total Investment"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="returns"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorReturns)"
              name="Total Returns"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}