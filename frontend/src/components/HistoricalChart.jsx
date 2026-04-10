/**
 * HistoricalChart.jsx — Multi-scale solar production analytics.
 *
 * This component provides a deep-dive into historical solar generation, 
 * allowing users to toggle between Daily, Monthly, and Yearly (All Time) views.
 *
 * Key features:
 *  - Unified Navigation: Centralized date and unit management via PeriodPicker.
 *  - Smart Boundaries: Respects plant installation date to prevent navigating to empty periods.
 *  - Real-time Filtering: Automatically hides future timestamps in the current period.
 *
 * Data source:
 *  - useAggregate hook: Fetches historical production for the computed range and unit.
 *  - usePlantInfo hook: Retrieves installation date for boundary enforcement.
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { useAggregate, usePlantInfo } from '../hooks/useGrowatt'
import { Skeleton } from '@/components/ui/skeleton'
import PeriodPicker from './PeriodPicker'

// ── Chart config ───────────────────────────────────────────────────────────────

const chartConfig = {
  energy: { label: 'Energy', color: 'var(--primary)' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calculates the bounding dates (first and last day) for a given calendar month.
 * Extensively used within the 'day' view mode logic to frame API aggregate requests.
 *
 * @function monthRange
 * @param {number} year - The 4-digit calendar year targeted.
 * @param {number} month - The 0-indexed calendar month targeted (0 = Jan, 11 = Dec).
 * @returns {{ start: string, end: string }} Object encompassing the localized "YYYY-MM-DD" boundary strings.
 */
function monthRange(year, month) {
  const start = new Date(year, month, 1)
  const end   = new Date(year, month + 1, 0)
  const fmt   = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(start), end: fmt(end) }
}

/**
 * Parses a precise datetime string to extract the raw numeric day of the month for labeling.
 * By anchoring to T12:00:00 (noon), this neutralizes edge-case timezone shifts where an automated Date parse 
 * might slide backwards across midnight into the preceding day.
 *
 * @function dayLabel
 * @param {string} dateStr - Exact "YYYY-MM-DD" target date string.
 * @returns {string} The localized representation of the day of the month.
 */
function dayLabel(dateStr) {
  return String(new Date(dateStr + 'T12:00:00').getDate())
}

/**
 * Resolves a human-readable abbreviated month label from an ISO year-month string (e.g., '2026-04').
 * Uses T12:00:00 anchoring to guarantee month stability.
 *
 * @function monthLabel
 * @param {string} dateStr - Evaluated string referencing a specific month, commonly formatted as "YYYY-MM".
 * @returns {string} The resulting localized short text label (e.g., "Jan" or "Apr").
 */
function monthLabel(dateStr) {
  return new Date(dateStr + '-01T12:00:00').toLocaleString('en', { month: 'short' })
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * HistoricalChart component functions as a multi-scale analytical dashboard for temporal solar production.
 * Enables shifting between 'day' (daily breakdown over a month), 'month' (monthly breakdown over a year), 
 * and 'year' (annual breakdown from system inception to present day).
 *
 * Intercepts impossible navigational states via `plant_installation_date` enforcement and intelligently filters 
 * out future unfilled data indices when viewing the current aggregate period.
 *
 * @component
 * @returns {JSX.Element} The completely interactive Recharts composition wrapped in a structured Shadcn card.
 */
export default function HistoricalChart() {
  /** 
   * Current time unit for aggregation.
   * @type {('day'|'month'|'year')}
   */
  const [timeUnit, setTimeUnit] = useState('day')
  
  /** 
   * Current reference date for period navigation.
   */
  const [refDate, setRefDate]   = useState(new Date())
  
  /** 
   * Tracks the currently interacted bar for highlight effects.
   */
  const [activeBar, setActiveBar] = useState(null)

  /** 
   * Fetches plant metadata for boundary clamping.
   */
  const { data: plantInfo } = usePlantInfo()
  const minDate = plantInfo?.plant_installation_date ? new Date(plantInfo.plant_installation_date) : null

  // ── Date range Calculation ──────────────────────────────────────────────────
  // Based on the selected timeUnit, we compute the API request window:
  // - day:   Full month containing refDate
  // - month: Full year containing refDate
  // - year:  'All time' starting from installation date to current year end

  let startDate, endDate, periodLabel

  if (timeUnit === 'day') {
    const { start, end } = monthRange(refDate.getFullYear(), refDate.getMonth())
    startDate   = start
    endDate     = end
    periodLabel = refDate.toLocaleString('en', { month: 'long', year: 'numeric' })
  } else if (timeUnit === 'month') {
    startDate   = `${refDate.getFullYear()}-01-01`
    endDate     = `${refDate.getFullYear()}-12-31`
    periodLabel = String(refDate.getFullYear())
  } else {
    // History starts from the plant's birth (installation date)
    startDate   = plantInfo?.plant_installation_date || '2020-01-01'
    endDate     = `${new Date().getFullYear()}-12-31`
    periodLabel = 'All time'
  }

  const { data: aggregate, isLoading } = useAggregate(startDate, endDate, timeUnit)

  const now = new Date()
  const isCurrentPeriod =
    (timeUnit === 'day'   && refDate.getFullYear() === now.getFullYear() && refDate.getMonth() === now.getMonth()) ||
    (timeUnit === 'month' && refDate.getFullYear() === now.getFullYear())

  // ── Chart data Processing ──────────────────────────────────────────────────

  const chartData = useMemo(() => {
    let data = (aggregate?.data ?? []).map(d => ({
      label: timeUnit === 'day'
        ? dayLabel(d.date)
        : timeUnit === 'month'
          ? monthLabel(d.date)
          : d.date,
      energy: Number(d.energy),
      dateStr: d.date, // Retained for filtering logic
    }))

    // Safeguard: Do not plot future days when viewing the current month
    if (timeUnit === 'day' && isCurrentPeriod) {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      data = data.filter(d => d.dateStr <= todayStr)
    }

    return data.map(({ dateStr, ...rest }) => rest)
  }, [aggregate, timeUnit, isCurrentPeriod])

  const total = useMemo(() =>
    chartData.reduce((sum, d) => sum + d.energy, 0).toFixed(1),
    [chartData]
  )



  return (
    <Card>
      <CardHeader>

        {/* Row 1: title + time unit selector + navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Solar Production</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <PeriodPicker 
              currentDate={refDate} 
              onDateChange={(d) => { setRefDate(d); setActiveBar(null) }}
              timeUnit={timeUnit}
              onTimeUnitChange={(u) => { setTimeUnit(u); setActiveBar(null) }}
              minDate={minDate}
            />
          </div>
        </div>


      </CardHeader>

      <CardContent className="px-3 pb-3">
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-50 w-full">
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                unit=" kWh"
                width={50}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-background border border-border rounded px-3 py-2 text-xs shadow-md">
                      <p className="text-muted-foreground font-medium mb-1">{label}</p>
                      <p className="font-bold text-foreground">
                        {Number(payload[0].value).toFixed(2)}
                        <span className="font-normal text-muted-foreground ml-1">kWh</span>
                      </p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="energy"
                radius={[4, 4, 0, 0]}
                onClick={(_, index) => setActiveBar(index === activeBar ? null : index)}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={index}
                    fill="var(--primary)"
                    opacity={activeBar === null || activeBar === index ? 1 : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}