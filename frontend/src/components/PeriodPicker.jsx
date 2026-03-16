import * as React from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"

/**
 * PeriodPicker component provides a responsive date and granularity selector.
 * Uses a Popover on desktop and a Drawer on mobile.
 * 
 * @param {Object} props
 * @param {Date} props.currentDate - The currently selected date.
 * @param {Function} props.onDateChange - Callback when a new date is selected.
 * @param {string} [props.timeUnit] - Current time unit (day, month, year).
 * @param {Function} [props.onTimeUnitChange] - Callback to change time unit.
 * @param {string} [props.className] - Optional CSS classes.
 */
export default function PeriodPicker({ 
  currentDate, 
  onDateChange, 
  timeUnit = 'day', 
  onTimeUnitChange,
  minDate,
  className 
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  
  // Internal state for the year currently being viewed in the picker
  const [viewYear, setViewYear] = React.useState(currentDate.getFullYear())

  React.useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]

  const today = new Date()
  
  const isFutureMonth = (monthIndex) => {
    return viewYear > today.getFullYear() || 
           (viewYear === today.getFullYear() && monthIndex > today.getMonth())
  }

  const isPastMonth = (monthIndex) => {
    if (!minDate) return false
    return viewYear < minDate.getFullYear() ||
           (viewYear === minDate.getFullYear() && monthIndex < minDate.getMonth())
  }

  const handleMonthSelect = (monthIndex) => {
    const newDate = new Date(currentDate)
    newDate.setFullYear(viewYear)
    newDate.setMonth(monthIndex)
    onDateChange(newDate)
    setOpen(false)
  }

  const handleYearChange = (offset) => {
    const newYear = viewYear + offset
    setViewYear(newYear)
    
    // If we're in month or year mode, changing the year effectively "selects" it
    if (timeUnit !== 'day') {
      const newDate = new Date(currentDate)
      newDate.setFullYear(newYear)
      
      // Safety check: don't let the selected date go before minDate
      if (minDate && newDate < minDate) {
        newDate.setFullYear(minDate.getFullYear())
        newDate.setMonth(minDate.getMonth())
      }
      
      onDateChange(newDate)
    }
  }

  const handleSetOpen = (isOpen) => {
    setOpen(isOpen)
    if (isOpen) {
      setViewYear(currentDate.getFullYear())
    }
  }

  const PickerContent = (
    <div className="p-3">
      {/* Unit Selector inside the picker if onTimeUnitChange is provided */}
      {onTimeUnitChange && (
        <div className="flex rounded-md border border-border overflow-hidden text-xs mb-4">
          {['day', 'month', 'year'].map(u => (
            <button
              key={u}
              type="button"
              onClick={() => onTimeUnitChange(u)}
              className={cn(
                "flex-1 py-2 capitalize transition-colors font-medium",
                timeUnit === u
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              {u}
            </button>
          ))}
        </div>
      )}

      {/* Year Navigation */}
      <div className="flex items-center justify-between mb-4 px-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7" 
          onClick={() => handleYearChange(-1)}
          disabled={minDate && viewYear <= minDate.getFullYear()}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div 
          className="flex flex-col items-center outline-none"
          tabIndex={0}
          autoFocus={true}
        >
          <span className="text-sm font-semibold">{viewYear}</span>
          {timeUnit !== 'day' && (
            <span className="text-[9px] text-primary font-bold uppercase tracking-tighter">Selected</span>
          )}
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7" 
          onClick={() => handleYearChange(1)}
          disabled={viewYear >= today.getFullYear()}
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Month Grid - only shown for 'day' unit */}
      {timeUnit === 'day' ? (
        <div className="grid grid-cols-3 gap-2">
          {months.map((month, index) => {
            const isSelected = 
              currentDate.getMonth() === index && 
              currentDate.getFullYear() === viewYear
            const isDisabled = isFutureMonth(index) || isPastMonth(index)

            return (
              <Button
                key={month}
                variant={isSelected ? "default" : "ghost"}
                className={cn(
                  "h-9 px-0 text-xs font-normal",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary font-semibold",
                  !isSelected && "hover:bg-muted"
                )}
                onClick={() => handleMonthSelect(index)}
                disabled={isDisabled}
                type="button"
              >
                {month}
              </Button>
            )
          })}
        </div>
      ) : (
        <div className="pb-2">
          <p className="text-[10px] text-center text-muted-foreground">
            Viewing {timeUnit === 'month' ? 'monthly' : 'annual'} total for {viewYear}
          </p>
        </div>
      )}
    </div>
  )

  const getTriggerLabel = () => {
    if (timeUnit === 'year') return 'All time'
    if (timeUnit === 'month') return `Year ${currentDate.getFullYear()}`
    return currentDate.toLocaleString('en', { month: 'long', year: 'numeric' })
  }

  const TriggerButton = (
    <Button
      variant={"outline"}
      type="button"
      className={cn(
        "h-8 px-2.5 text-xs font-medium gap-2 justify-start items-center transition-all hover:bg-muted border-muted-foreground/20",
        className
      )}
      onPointerDown={(e) => {
        e.preventDefault();
      }}
    >
      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex flex-col items-start leading-tight">
        {onTimeUnitChange && (
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            {timeUnit}
          </span>
        )}
        <span>{getTriggerLabel()}</span>
      </div>
    </Button>
  )

  // Avoid hydration mismatch and flip-flop between Popover/Drawer during mount
  if (!isMounted) return TriggerButton;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleSetOpen}>
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left border-b pb-4">
            <DrawerTitle className="text-sm font-medium">Select Month</DrawerTitle>
            <DrawerDescription className="sr-only">
              Pick a month and year to update the chart data.
            </DrawerDescription>
          </DrawerHeader>
          <div className="mx-auto w-full max-w-sm pb-8">
            {PickerContent}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleSetOpen}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64" align="end">
        <PopoverDescription className="sr-only">
          Select a month to filter data.
        </PopoverDescription>
        {PickerContent}
      </PopoverContent>
    </Popover>
  )
}
