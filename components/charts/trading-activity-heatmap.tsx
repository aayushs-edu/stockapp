// components/charts/trading-activity-heatmap.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TradingActivityHeatmapProps {
  data: Array<{
    date: string
    count: number
  }>
}

export function TradingActivityHeatmap({ data }: TradingActivityHeatmapProps) {
  const { weeks, maxCount } = useMemo(() => {
    // Get the last 12 weeks of data
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 84) // 12 weeks

    // Create a map of dates to counts
    const dateMap = new Map(data.map(d => [d.date, d.count]))
    const maxCount = Math.max(...data.map(d => d.count), 1)

    // Group by weeks
    const weeks: Array<Array<{ date: Date; count: number; level: number }>> = []
    let currentWeek: Array<{ date: Date; count: number; level: number }> = []
    
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const count = dateMap.get(dateStr) || 0
      const level = count === 0 ? 0 : Math.ceil((count / maxCount) * 4)
      
      currentWeek.push({
        date: new Date(currentDate),
        count,
        level
      })

      if (currentDate.getDay() === 6 || currentDate >= endDate) {
        weeks.push(currentWeek)
        currentWeek = []
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return { weeks, maxCount }
  }, [data])

  const getColorClass = (level: number) => {
    switch (level) {
      case 0: return 'bg-muted'
      case 1: return 'bg-primary/20'
      case 2: return 'bg-primary/40'
      case 3: return 'bg-primary/60'
      case 4: return 'bg-primary/80'
      default: return 'bg-primary'
    }
  }

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading Activity</CardTitle>
        <CardDescription>
          Your trading frequency over the last 12 weeks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Day labels */}
          <div className="flex gap-1">
            <div className="w-8" /> {/* Spacer for alignment */}
            {days.map((day, i) => (
              <div key={i} className="w-3 text-xs text-muted-foreground">
                {i % 2 === 1 ? day : ''}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-1">
            {/* Week labels */}
            <div className="flex flex-col justify-between text-xs text-muted-foreground pr-2">
              {weeks.map((week, i) => {
                const month = week[0]?.date.getMonth()
                const showMonth = i === 0 || (i > 0 && weeks[i - 1][0]?.date.getMonth() !== month)
                return (
                  <div key={i} className="h-3 leading-3">
                    {showMonth ? months[month].substring(0, 3) : ''}
                  </div>
                )
              })}
            </div>

            {/* Activity squares */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const day = week[dayIndex]
                    if (!day) return <div key={dayIndex} className="w-3 h-3" />
                    
                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "w-3 h-3 rounded-sm transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer",
                          getColorClass(day.level)
                        )}
                        title={`${day.date.toLocaleDateString()}: ${day.count} trades`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 justify-end text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className={cn(
                    "w-3 h-3 rounded-sm",
                    getColorClass(level)
                  )}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}