// app/(dashboard)/profit-loss/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  Area,
  AreaChart,
  ComposedChart,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, Target, BarChart3, Calendar, CalendarDays, CalendarRange, DollarSign, Percent, Activity, Trophy } from 'lucide-react'

const monthRanges = [
  { label: '3M', value: 3, icon: Calendar },
  { label: '6M', value: 6, icon: CalendarDays },
  { label: '12M', value: 12, icon: CalendarRange },
  { label: '24M', value: 24, icon: CalendarRange },
  { label: 'All', value: -1, icon: CalendarRange },
]

export default function ProfitLossPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonths, setSelectedMonths] = useState(12)

  useEffect(() => {
    fetchPnLData()
  }, [])

  const fetchPnLData = async () => {
    try {
      const response = await fetch('/api/analytics/profit-loss')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch P&L data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter monthly data based on selected range
  const filteredMonthlyData = useMemo(() => {
    if (!data?.monthlyPnL) return []
    
    if (selectedMonths === -1) return data.monthlyPnL
    
    // Get the last N months
    return data.monthlyPnL.slice(-selectedMonths)
  }, [data?.monthlyPnL, selectedMonths])

  // Calculate metrics for the selected period
  const periodMetrics = useMemo(() => {
    const periodData = filteredMonthlyData
    const totalRealized = periodData.reduce((sum: number, m: any) => sum + (m.realized || 0), 0)
    const profitableMonths = periodData.filter((m: any) => m.realized > 0).length
    const lossMonths = periodData.filter((m: any) => m.realized < 0).length
    
    return {
      totalRealized,
      profitableMonths,
      lossMonths,
      winRate: periodData.length > 0 ? (profitableMonths / periodData.length) * 100 : 0
    }
  }, [filteredMonthlyData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-4">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm">
              <span className="text-muted-foreground">{entry.name}:</span>{' '}
              <span className={`font-medium ${entry.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(entry.value))}
              </span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Enhanced metrics visualization data
  const metricsData = [
    {
      name: 'Win Rate',
      value: data?.summary.winRate || 0,
      icon: Trophy,
      color: '#10b981',
      description: 'Percentage of profitable trades'
    },
    {
      name: 'Avg Win',
      value: data?.summary.avgWin || 0,
      icon: TrendingUp,
      color: '#3b82f6',
      description: 'Average profit per winning trade',
      format: 'currency'
    },
    {
      name: 'Avg Loss',
      value: data?.summary.avgLoss || 0,
      icon: TrendingDown,
      color: '#ef4444',
      description: 'Average loss per losing trade',
      format: 'currency'
    },
    {
      name: 'Profit Factor',
      value: data?.summary.profitFactor || 0,
      icon: Activity,
      color: '#8B7355',
      description: 'Ratio of gross profit to gross loss',
      format: 'decimal'
    }
  ]

  const winLossData = [
    { 
      name: 'Wins', 
      value: data?.summary.winRate || 0, 
      count: Math.round((data?.summary.totalTrades || 0) * (data?.summary.winRate || 0) / 100),
      fill: '#10b981' 
    },
    { 
      name: 'Losses', 
      value: 100 - (data?.summary.winRate || 0), 
      count: Math.round((data?.summary.totalTrades || 0) * (100 - (data?.summary.winRate || 0)) / 100),
      fill: '#ef4444' 
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Profit & Loss Analysis</h1>
        <p className="text-muted-foreground">
          Comprehensive analysis of your trading performance and profitability
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realized P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data?.summary.totalRealized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(data?.summary.totalRealized || 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              From {data?.summary.totalTrades || 0} closed positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data?.summary.winRate || 0).toFixed(1)}%
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-green-600">Wins</span>
                <span className="text-red-600">Losses</span>
              </div>
              <div className="w-full bg-red-600/20 rounded-full h-2 mt-1">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${data?.summary.winRate || 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk/Reward Ratio</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              1:{(data?.summary.avgWin / data?.summary.avgLoss || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg Win vs Avg Loss
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data?.summary.profitFactor >= 1 ? 'text-green-600' : 'text-red-600'}`}>
              {(data?.summary.profitFactor || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.summary.profitFactor >= 1.5 ? 'Excellent' : 
               data?.summary.profitFactor >= 1 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">Monthly P&L</TabsTrigger>
          <TabsTrigger value="stocks">Stock Performance</TabsTrigger>
          <TabsTrigger value="metrics">Trading Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Monthly Profit & Loss Trend</CardTitle>
                  <CardDescription>
                    Track your monthly trading performance over time
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  {monthRanges.map((range) => {
                    const Icon = range.icon
                    return (
                      <Button
                        key={range.value}
                        variant={selectedMonths === range.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedMonths(range.value)}
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
              {/* Period Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Period P&L</p>
                  <p className={`text-lg font-semibold ${periodMetrics.totalRealized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(periodMetrics.totalRealized)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Profitable Months</p>
                  <p className="text-lg font-semibold text-green-600">{periodMetrics.profitableMonths}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Loss Months</p>
                  <p className="text-lg font-semibold text-red-600">{periodMetrics.lossMonths}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Monthly Win Rate</p>
                  <p className="text-lg font-semibold">{periodMetrics.winRate.toFixed(1)}%</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={filteredMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(value) => {
                      const date = new Date(value + '-01')
                      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                    }}
                  />
                  <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="realized" name="Realized P&L" radius={[4, 4, 0, 0]}>
                    {filteredMonthlyData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.realized >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                  <Line 
                    type="monotone" 
                    dataKey="realized" 
                    name="Trend" 
                    stroke="#8B7355" 
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stocks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock-wise Performance</CardTitle>
              <CardDescription>
                Detailed P&L breakdown by individual stocks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Stock</th>
                      <th className="text-right p-2">Buy Qty</th>
                      <th className="text-right p-2">Sell Qty</th>
                      <th className="text-right p-2">Avg Buy</th>
                      <th className="text-right p-2">Avg Sell</th>
                      <th className="text-right p-2">Realized P&L</th>
                      <th className="text-right p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.stockPnL?.map((stock: any) => (
                      <tr key={stock.stock} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{stock.stock}</td>
                        <td className="text-right p-2">{stock.buyQty.toFixed(2)}</td>
                        <td className="text-right p-2">{stock.sellQty.toFixed(2)}</td>
                        <td className="text-right p-2">{formatCurrency(stock.avgBuyPrice)}</td>
                        <td className="text-right p-2">
                          {stock.avgSellPrice > 0 ? formatCurrency(stock.avgSellPrice) : '-'}
                        </td>
                        <td className={`text-right p-2 font-medium ${stock.realized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(stock.realized))}
                        </td>
                        <td className="text-right p-2">
                          <Badge variant={stock.currentQty > 0 ? 'default' : 'secondary'}>
                            {stock.currentQty > 0 ? 'Holding' : 'Closed'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {/* Enhanced Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {metricsData.map((metric, index) => {
              const Icon = metric.icon
              return (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{metric.name}</CardTitle>
                      <Icon className="h-5 w-5" style={{ color: metric.color }} />
                    </div>
                    <CardDescription className="text-xs">
                      {metric.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" style={{ color: metric.color }}>
                      {metric.format === 'currency' 
                        ? formatCurrency(metric.value)
                        : metric.format === 'decimal'
                        ? metric.value.toFixed(2)
                        : `${metric.value.toFixed(1)}%`
                      }
                    </div>
                    
                    {/* Visual representation */}
                    {metric.name === 'Win Rate' && (
                      <ResponsiveContainer width="100%" height={100}>
                        <PieChart>
                          <Pie
                            data={winLossData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={40}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {winLossData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    
                    {metric.name === 'Profit Factor' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Target: 1.5+</span>
                          <span>{metric.value.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              width: `${Math.min((metric.value / 2) * 100, 100)}%`,
                              backgroundColor: metric.value >= 1.5 ? '#10b981' : metric.value >= 1 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Win/Loss Distribution Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Win/Loss Analysis</CardTitle>
              <CardDescription>
                Distribution of winning vs losing trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Win/Loss Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">
                      Wins: {winLossData[0].count} trades ({winLossData[0].value.toFixed(1)}%)
                    </span>
                    <span className="text-red-600 font-medium">
                      Losses: {winLossData[1].count} trades ({winLossData[1].value.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex h-8 overflow-hidden rounded-lg">
                    <div 
                      className="bg-green-600 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${winLossData[0].value}%` }}
                    >
                      {winLossData[0].value >= 20 && `${winLossData[0].value.toFixed(0)}%`}
                    </div>
                    <div 
                      className="bg-red-600 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${winLossData[1].value}%` }}
                    >
                      {winLossData[1].value >= 20 && `${winLossData[1].value.toFixed(0)}%`}
                    </div>
                  </div>
                </div>

                {/* Key Insights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Expected Value</p>
                    <p className={`text-lg font-semibold ${
                      (data?.summary.winRate / 100 * data?.summary.avgWin - (1 - data?.summary.winRate / 100) * data?.summary.avgLoss) > 0
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(
                        data?.summary.winRate / 100 * data?.summary.avgWin - 
                        (1 - data?.summary.winRate / 100) * data?.summary.avgLoss
                      )}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Break-even Win Rate</p>
                    <p className="text-lg font-semibold">
                      {(data?.summary.avgLoss / (data?.summary.avgWin + data?.summary.avgLoss) * 100 || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Kelly Criterion</p>
                    <p className="text-lg font-semibold text-primary">
                      {Math.max(0, (
                        (data?.summary.winRate / 100) - 
                        ((1 - data?.summary.winRate / 100) / (data?.summary.avgWin / data?.summary.avgLoss))
                      ) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}