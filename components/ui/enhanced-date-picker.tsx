// components/ui/enhanced-date-picker.tsx
import * as React from "react"
import { useState, useEffect } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface EnhancedDatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

type ViewMode = 'year' | 'month' | 'day'

export function EnhancedDatePicker({
  value,
  onChange,
  placeholder = "Select date...",
  disabled = false,
  className
}: EnhancedDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('year')
  const [selectedYear, setSelectedYear] = useState<number>()
  const [selectedMonth, setSelectedMonth] = useState<number>()
  const [viewYear, setViewYear] = useState(new Date().getFullYear())

  // Update input value when value prop changes
  useEffect(() => {
    if (value) {
      setInputValue(formatDate(value))
    } else {
      setInputValue('')
    }
  }, [value])

  // Parse date input in various formats
  const parseDateInput = (input: string): Date | undefined => {
    if (!input.trim()) return undefined
    
    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD or YYYY-M-D
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or D/M/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY or D-M-YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY or D.M.YYYY
    ]
    
    for (const format of formats) {
      const match = input.match(format)
      if (match) {
        let year: number, month: number, day: number
        
        if (format === formats[0]) {
          // YYYY-MM-DD
          year = parseInt(match[1])
          month = parseInt(match[2])
          day = parseInt(match[3])
        } else {
          // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
          day = parseInt(match[1])
          month = parseInt(match[2])
          year = parseInt(match[3])
        }
        
        // Validate date components
        if (year >= 2000 && year <= new Date().getFullYear() + 10 &&
            month >= 1 && month <= 12 &&
            day >= 1 && day <= 31) {
          const date = new Date(year, month - 1, day)
          // Check if the date is valid (handles leap years, etc.)
          if (date.getFullYear() === year && 
              date.getMonth() === month - 1 && 
              date.getDate() === day) {
            return date
          }
        }
      }
    }
    
    // Try natural language parsing
    const parsed = new Date(input)
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000) {
      return parsed
    }
    
    return undefined
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Only clear the date if input is completely empty
    if (newValue === '') {
      onChange?.(undefined)
    }
    // Don't auto-parse while typing - only on blur or Enter
  }

  const handleInputBlur = () => {
    // Try to parse the date when user finishes typing
    const parsedDate = parseDateInput(inputValue)
    if (parsedDate) {
      onChange?.(parsedDate)
      setInputValue(formatDate(parsedDate)) // Format the input
    } else if (inputValue && inputValue.trim() !== '') {
      // If there's text but it's not a valid date, keep the text as-is
      // Don't clear it or change it
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Parse date on Enter key
      const parsedDate = parseDateInput(inputValue)
      if (parsedDate) {
        onChange?.(parsedDate)
        setInputValue(formatDate(parsedDate))
      }
    }
  }

  const handleDateSelect = (date: Date) => {
    onChange?.(date)
    setOpen(false)
    setViewMode('year') // Reset view mode for next time
  }

  // Generate years from 2000 to current year + 10
  const generateYears = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear + 10; year >= 2000; year--) {
      years.push(year)
    }
    return years
  }

  // Generate months
  const generateMonths = () => {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
  }

  // Generate days for selected month/year
  const generateDays = () => {
    if (!selectedYear || selectedMonth === undefined) return []
    
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const days = []
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    return days
  }

  const handleYearSelect = (year: number) => {
    setSelectedYear(year)
    setViewMode('month')
  }

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex)
    setViewMode('day')
  }

  const handleDaySelect = (day: number) => {
    if (selectedYear && selectedMonth !== undefined) {
      const newDate = new Date(selectedYear, selectedMonth, day)
      handleDateSelect(newDate)
    }
  }

  const resetToYearView = () => {
    setViewMode('year')
    setSelectedYear(undefined)
    setSelectedMonth(undefined)
  }

  const goBackToMonth = () => {
    setViewMode('month')
    setSelectedMonth(undefined)
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10"
            autoComplete="off"
          />
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              disabled={disabled}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4">
            {/* Header with navigation */}
            <div className="flex items-center justify-between mb-4">
              {viewMode !== 'year' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={viewMode === 'month' ? resetToYearView : goBackToMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              
              <div className="text-sm font-medium">
                {viewMode === 'year' && 'Select Year'}
                {viewMode === 'month' && selectedYear && `Select Month (${selectedYear})`}
                {viewMode === 'day' && selectedYear && selectedMonth !== undefined && 
                  `Select Day (${generateMonths()[selectedMonth]} ${selectedYear})`}
              </div>
              
              {viewMode === 'year' && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewYear(prev => Math.max(2000, prev - 12))}
                    disabled={viewYear <= 2000}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewYear(prev => Math.min(new Date().getFullYear() + 10, prev + 12))}
                    disabled={viewYear >= new Date().getFullYear() + 10}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Year Selection */}
            {viewMode === 'year' && (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {Array.from({ length: 12 }, (_, i) => viewYear - i).map(year => (
                  <Button
                    key={year}
                    variant={year === new Date().getFullYear() ? "default" : "outline"}
                    className="h-12"
                    onClick={() => handleYearSelect(year)}
                    disabled={year < 2000}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            )}

            {/* Month Selection */}
            {viewMode === 'month' && (
              <div className="grid grid-cols-3 gap-2">
                {generateMonths().map((month, index) => (
                  <Button
                    key={month}
                    variant="outline"
                    className="h-12 text-xs"
                    onClick={() => handleMonthSelect(index)}
                  >
                    {month.slice(0, 3)}
                  </Button>
                ))}
              </div>
            )}

            {/* Day Selection */}
            {viewMode === 'day' && (
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for start of month */}
                {selectedYear && selectedMonth !== undefined && 
                  Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }, (_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))
                }
                
                {/* Day buttons */}
                {generateDays().map(day => {
                  const isToday = selectedYear === new Date().getFullYear() && 
                                 selectedMonth === new Date().getMonth() && 
                                 day === new Date().getDate()
                  const isSelected = value && 
                                   value.getFullYear() === selectedYear && 
                                   value.getMonth() === selectedMonth && 
                                   value.getDate() === day
                  
                  return (
                    <Button
                      key={day}
                      variant={isSelected ? "default" : isToday ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDaySelect(day)}
                    >
                      {day}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Helper text */}
      <div className="text-xs text-muted-foreground mt-1">
        Format: DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD
      </div>
    </div>
  )
}