// components/charts/performance-comparison-chart.tsx
'use client'

import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ComposedChart,
  Line,
  Scatter,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from 'lucide-react'

interface PerformanceData {
  stock: string
  profitLoss: number
  roi: number
}

interface PerformanceComparisonChartProps {
  topPerformers: PerformanceData[]
  worstPerformers: PerformanceData[]
}

export function PerformanceComparisonChart({ 
  topPerformers = [], 
  worstPerformers = [] 
}: PerformanceComparisonChartProps) {
  const [viewMode, setViewMode] = useState<'split' | 'combined' | 'scatter'>('split')
  
  // Combine and process data
  const { allData, stats } = useMemo(() => {
    const combined = [...topPerformers, ...worstPerformers]
      .filter(item => item && typeof item.profitLoss === 'number' && typeof item.roi === 'number')
      .sort((a, b) => b.profitLoss - a.profitLoss)
    
    const profitable = combined.filter(s => s.profitLoss > 0)
    const losses = combined.filter(s => s.profitLoss < 0)
    
    const totalProfit = profitable.reduce((sum, s) => sum + s.profitLoss, 0)
    const totalLoss = Math.abs(losses.reduce((sum, s) => sum + s.profitLoss, 0))
    const avgROI = combined.length > 0 
      ? combined.reduce((sum, s) => sum + s.roi, 0) / combined.length 
      : 0
    
    return {
      allData: combined,
      stats: {
        totalStocks: combined.length,
        profitableCount: profitable.length,
        lossCount: losses.length,
        totalProfit,
        totalLoss,
        netPnL: totalProfit - totalLoss,
        avgROI,
        bestPerformer: combined[0],
        worstPerformer: combined[combined.length - 1]
      }
    }
  }, [topPerformers, worstPerformers])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isProfit = data.profitLoss > 0
      
      return (
        <div className="bg-background border rounded-lg shadow-lg p-4">
          <p className="text-sm font-medium mb-2">{data.stock}</p>
          <div className="space-y-1">
            <p className={`text-sm font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              P/L: {formatCurrency(Math.abs(data.profitLoss))}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">ROI:</span>{' '}
              <span className={`font-medium ${data.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.roi.toFixed(2)}%
              </span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Summary Stats Cards
  const StatCard = ({ title, value, icon: Icon, trend, subtitle }: any) => (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : ''}`}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Icon className={`h-8 w-8 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'} opacity-20`} />
      </div>
    </div>
  )

  if (allData.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Stock Performance Analysis</CardTitle>
          <CardDescription>No performance data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No closed positions to analyze</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Stock Performance Analysis</CardTitle>
        <CardDescription>
          Comprehensive analysis of your trading performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Net P/L"
            value={formatCurrency(stats.netPnL)}
            icon={DollarSign}
            trend={stats.netPnL >= 0 ? 'up' : 'down'}
          />
          <StatCard
            title="Win Rate"
            value={`${((stats.profitableCount / stats.totalStocks) * 100).toFixed(1)}%`}
            icon={TrendingUp}
            subtitle={`${stats.profitableCount}/${stats.totalStocks} trades`}
          />
          <StatCard
            title="Average ROI"
            value={`${stats.avgROI.toFixed(2)}%`}
            icon={Percent}
            trend={stats.avgROI >= 0 ? 'up' : 'down'}
          />
          <StatCard
            title="Best Performer"
            value={stats.bestPerformer?.stock || '-'}
            icon={TrendingUp}
            subtitle={stats.bestPerformer ? `+${formatCurrency(stats.bestPerformer.profitLoss)}` : ''}
          />
        </div>

        {/* View Tabs */}
        <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="split">Split View</TabsTrigger>
            <TabsTrigger value="combined">Combined View</TabsTrigger>
            <TabsTrigger value="scatter">ROI Analysis</TabsTrigger>
          </TabsList>

          {/* Split View */}
          <TabsContent value="split" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-600">Top Gainers</h3>
                  <Badge variant="outline" className="text-green-600">
                    {topPerformers.length} stocks
                  </Badge>
                </div>
                
                {topPerformers.length > 0 ? (
                  <div className="space-y-3">
                    {topPerformers.slice(0, 5).map((stock, index) => (
                      <div key={stock.stock} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium w-6">{index + 1}.</span>
                            <span className="font-medium">{stock.stock}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              +{formatCurrency(stock.profitLoss)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {stock.roi.toFixed(1)}% ROI
                            </p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="h-6 bg-green-100 dark:bg-green-900/20 rounded-md overflow-hidden">
                            <div 
                              className="h-full bg-green-600 rounded-md transition-all duration-500"
                              style={{ 
                                width: `${Math.min((stock.profitLoss / topPerformers[0].profitLoss) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                            ₹{(stock.profitLoss / 1000).toFixed(1)}k
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] border-2 border-dashed rounded-lg">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-muted-foreground">No profitable trades yet</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Worst Performers */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-600">Top Losers</h3>
                  <Badge variant="outline" className="text-red-600">
                    {worstPerformers.length} stocks
                  </Badge>
                </div>
                
                {worstPerformers.length > 0 ? (
                  <div className="space-y-3">
                    {worstPerformers.slice(0, 5).map((stock, index) => {
                      const maxLoss = Math.abs(worstPerformers[0].profitLoss)
                      return (
                        <div key={stock.stock} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium w-6">{index + 1}.</span>
                              <span className="font-medium">{stock.stock}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-red-600">
                                -{formatCurrency(Math.abs(stock.profitLoss))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {stock.roi.toFixed(1)}% ROI
                              </p>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="h-6 bg-red-100 dark:bg-red-900/20 rounded-md overflow-hidden">
                              <div 
                                className="h-full bg-red-600 rounded-md transition-all duration-500"
                                style={{ 
                                  width: `${Math.min((Math.abs(stock.profitLoss) / maxLoss) * 100, 100)}%` 
                                }}
                              />
                            </div>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                              ₹{(Math.abs(stock.profitLoss) / 1000).toFixed(1)}k
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] border-2 border-dashed rounded-lg">
                    <div className="text-center">
                      <TrendingDown className="h-12 w-12 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-muted-foreground">No loss-making trades yet</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Gains</p>
                <p className="text-xl font-bold text-green-600">
                  +{formatCurrency(topPerformers.reduce((sum, s) => sum + s.profitLoss, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Losses</p>
                <p className="text-xl font-bold text-red-600">
                  -{formatCurrency(Math.abs(worstPerformers.reduce((sum, s) => sum + s.profitLoss, 0)))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Net Result</p>
                <p className={`text-xl font-bold ${stats.netPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.netPnL >= 0 ? '+' : ''}{formatCurrency(stats.netPnL)}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Combined View */}
          <TabsContent value="combined">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={allData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="stock" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="pnl" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="roi" orientation="right" tickFormatter={(value) => `${value}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine yAxisId="pnl" y={0} stroke="#666" strokeDasharray="3 3" />
                <Bar yAxisId="pnl" dataKey="profitLoss" name="P&L" radius={[4, 4, 0, 0]}>
                  {allData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.profitLoss >= 0 ? '#10b981' : '#ef4444'} 
                    />
                  ))}
                </Bar>
                <Line 
                  yAxisId="roi" 
                  type="monotone" 
                  dataKey="roi" 
                  name="ROI %" 
                  stroke="#8B7355" 
                  strokeWidth={2}
                  dot={{ fill: '#8B7355', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* ROI Scatter Plot */}
          <TabsContent value="scatter">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart 
                data={allData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="roi" 
                  type="number"
                  domain={['dataMin - 10', 'dataMax + 10']}
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: 'Return on Investment (%)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  dataKey="profitLoss"
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  label={{ value: 'Profit/Loss (₹)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={0} stroke="#666" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                <Scatter name="Stocks" dataKey="profitLoss">
                  {allData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.profitLoss >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Scatter>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded-full" />
                <span>Profitable trades (positive P&L)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full" />
                <span>Loss-making trades (negative P&L)</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}