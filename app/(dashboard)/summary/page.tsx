// app/(dashboard)/summary/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils'
import { Loader2, TrendingUp, Package, Calendar, BarChart3 } from 'lucide-react'

export default function SummaryPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummaryData()
  }, [])

  const fetchSummaryData = async () => {
    try {
      const response = await fetch('/api/analytics/summary')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch summary data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const COLORS = ['#8B7355', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899']

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Portfolio Summary</h1>
        <p className="text-muted-foreground">
          Comprehensive overview of your trading portfolio and patterns
        </p>
      </div>

      {/* Portfolio Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stocks</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.portfolioMetrics.totalStocks}</div>
            <div className="text-xs text-muted-foreground">
              {data?.portfolioMetrics.activePositions} active, {data?.portfolioMetrics.closedPositions} closed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Holding Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(data?.portfolioMetrics.avgHoldingPeriod || 0)} days
            </div>
            <div className="text-xs text-muted-foreground">
              Across all positions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diversity Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.portfolioMetrics.diversityScore}/100</div>
            <Progress value={data?.portfolioMetrics.diversityScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.portfolioMetrics.totalTransactions}</div>
            <div className="text-xs text-muted-foreground">
              All time trades
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="allocation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="patterns">Trading Patterns</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
        </TabsList>

        <TabsContent value="allocation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sector Allocation</CardTitle>
                <CardDescription>
                  Portfolio distribution across sectors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data?.sectorAllocation || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ sector, value }: any) => `${sector}: ${value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data?.sectorAllocation?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sector Details</CardTitle>
                <CardDescription>
                  Number of stocks per sector
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.sectorAllocation?.map((sector: any, index: number) => (
                    <div key={sector.sector} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{sector.sector}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{sector.count} stocks</span>
                        <Badge variant="secondary">{sector.value}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Yearly Performance</CardTitle>
              <CardDescription>
                Annual trading performance breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data?.yearlyPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="buyValue" name="Buy Value" fill="#8B7355" />
                  <Bar dataKey="sellValue" name="Sell Value" fill="#10b981" />
                  <Bar dataKey="pnl" name="P&L" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Trading by Day of Week</CardTitle>
                <CardDescription>
                  When do you trade the most?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={data?.tradingPatterns?.byDayOfWeek || []}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="day" />
                    <PolarRadiusAxis />
                    <Radar 
                      name="Trades" 
                      dataKey="count" 
                      stroke="#8B7355" 
                      fill="#8B7355" 
                      fillOpacity={0.6} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trading Activity</CardTitle>
                <CardDescription>
                  Trading frequency by month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.tradingPatterns?.byMonth || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8B7355" 
                      strokeWidth={2}
                      dot={{ fill: '#8B7355' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="holdings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Holdings Summary</CardTitle>
              <CardDescription>
                Detailed breakdown of all your stock positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Stock</th>
                      <th className="text-right p-2">Current Qty</th>
                      <th className="text-right p-2">Avg Buy Price</th>
                      <th className="text-right p-2">Holding Days</th>
                      <th className="text-right p-2">ROI %</th>
                      <th className="text-right p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.stockSummary?.map((stock: any) => (
                      <tr key={stock.stock} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{stock.stock}</td>
                        <td className="text-right p-2">{stock.currentQty.toFixed(2)}</td>
                        <td className="text-right p-2">{formatCurrency(stock.avgBuyPrice)}</td>
                        <td className="text-right p-2">{stock.holdingPeriodDays}</td>
                        <td className={`text-right p-2 font-medium ${stock.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stock.roi ? stock.roi.toFixed(2) : '0.00'}%
                        </td>
                        <td className="text-right p-2">
                          <Badge variant={stock.status === 'Active' ? 'default' : 'secondary'}>
                            {stock.status}
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
      </Tabs>
    </div>
  )
}