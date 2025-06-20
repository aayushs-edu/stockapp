// components/dashboard/dashboard-charts.tsx
'use client'

import { useState, useEffect } from 'react'
import { PortfolioValueChart } from '@/components/charts/portfolio-value-chart'
import { HoldingsDistributionChart } from '@/components/charts/holdings-distribution-chart'
import { PerformanceComparisonChart } from '@/components/charts/performance-comparison-chart'
import { TradingActivityHeatmap } from '@/components/charts/trading-activity-heatmap'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

export function DashboardCharts() {
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard')
      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!analyticsData) {
    return null
  }

  return (
    <>
      {/* Portfolio Value Chart */}
      {analyticsData.portfolioHistory && (
        <div className="grid gap-6">
          <PortfolioValueChart data={analyticsData.portfolioHistory} />
        </div>
      )}
      
      {/* Performance Comparison */}
      {analyticsData.topPerformers && analyticsData.worstPerformers && (
        <PerformanceComparisonChart 
          topPerformers={analyticsData.topPerformers}
          worstPerformers={analyticsData.worstPerformers}
        />
      )}
      
      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Holdings Distribution */}
        {analyticsData.holdingsBreakdown && (
          <HoldingsDistributionChart data={analyticsData.holdingsBreakdown} />
        )}
        
        {/* Trading Activity Heatmap */}
        {analyticsData.tradeFrequency && (
          <TradingActivityHeatmap data={analyticsData.tradeFrequency} />
        )}
      </div>
    </>
  )
}