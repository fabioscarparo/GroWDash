/**
 * EnergyBreakdownChart.jsx — Daily energy breakdown bar chart.
 *
 * Grouped bar chart showing all energy flows for each day of a month:
 * solar production, home consumption, grid import/export and
 * battery charge/discharge.
 *
 * For "Home", the chart uses an effective daily total:
 * max(home_kwh, self_consumed_kwh + grid_import_kwh)
 * This avoids understated bars when the raw home counter is lower than
 * the site balance derived from self-consumption + grid import.
 *
 * Navigation: Integrated PeriodPicker for month selection with installation date bounds.
 * Series toggles: Interactive legend to show/hide individual flows.
 *
 * Key features:
 *  - Persistent View: Chart stays visible but dimmed during re-fetches.
 *  - Smart Boundaries: Caps end date to today and respects plant installation date.
 *  - Background Prefetch: Silently loads adjacent months for instant navigation.
 *
 * Data source: /energy/daily-breakdown
 */

import { useState, useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useDailyBreakdown, usePlantInfo } from '../hooks/useGrowatt'
import { api } from '../api/growatt'
import SeriesToggle from './SeriesToggle'
import { Skeleton } from '@/components/ui/skeleton'
import PeriodPicker from './PeriodPicker'

// ── Series config ─────────────────────────────────────────────────────────────

const SERIES = [
  { key: 'solar_kwh',              label: 'Solar',             color: '#f59e0b' },
  { key: 'home_kwh',               label: 'Home',              color: '#9f1239' },
  { key: 'grid_import_kwh',        label: 'Grid import',       color: '#ef4444' },
  { key: 'grid_export_kwh',        label: 'Grid export',       color: '#10b981' },
  { key: 'battery_charged_kwh',    label: 'Battery charge',    color: '#3b82f6' },
  { key: 'battery_discharged_kwh', label: 'Battery discharge', color: '#8b5cf6' },
]

const chartConfig = Object.fromEntries(
  SERIES.map(s => [s.key, { label: s.label, color: s.color }])
)

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the first and last day of the given month as YYYY-MM-DD strings.
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January)
 * @returns {{ start: string, end: string }}
 */
function monthRange(year, month) {
  const start = new Date(year, month, 1)
  const end   = new Date(year, month + 1, 0)
  const fmt   = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(start), end: fmt(end) }
}

/**
 * Formats a Date object as a YYYY-MM-DD string using local time.
 * @param {Date} d
 * @returns {string}
 */
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Returns the day-of-month number from a YYYY-MM-DD string.
 * Uses T12:00:00 to avoid DST-related off-by-one issues.
 * @param {string} dateStr
 * @returns {string}
 */
function dayLabel(dateStr) {
  return String(new Date(dateStr + 'T12:00:00').getDate())
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EnergyBreakdownChart() {
  const [refDate, setRefDate] = useState(new Date())
  
  const { data: plantInfo } = usePlantInfo()
  const minDate = plantInfo?.plant_installation_date ? new Date(plantInfo.plant_installation_date) : null

  // All series visible by default
  const [activeSeries, setActiveSeries] = useState(
    () => Object.fromEntries(SERIES.map(s => [s.key, true]))
  )

  function toggleSeries(key) {
    setActiveSeries(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Date range ────────────────────────────────────────────────────────────

  const today = new Date()

  const isCurrentMonth =
    refDate.getFullYear() === today.getFullYear() &&
    refDate.getMonth()    === today.getMonth()

  const { start: startDate, end: monthEndDate } = monthRange(
    refDate.getFullYear(),
    refDate.getMonth()
  )

  // Cap end date to today for the current month — no point fetching
  // future days that the API has no data for yet.
  const endDate = isCurrentMonth ? fmt(today) : monthEndDate

  const { data: breakdown, isLoading, isFetching } = useDailyBreakdown(startDate, endDate)

  // ── Prefetch adjacent months ──────────────────────────────────────────────
  // While the user views the current month, silently fetch the previous
  // and next months in the background so navigation feels instant.

  const queryClient = useQueryClient()

  useEffect(() => {
    const now = new Date()

    // Prefetch previous month — always available
    const prevDate = new Date(refDate)
    prevDate.setMonth(prevDate.getMonth() - 1)
    const { start: prevStart, end: prevEnd } = monthRange(
      prevDate.getFullYear(),
      prevDate.getMonth()
    )
    queryClient.prefetchQuery({
      queryKey: ['energy', 'daily-breakdown', prevStart, prevEnd],
      queryFn:  () => api.getDailyBreakdown(prevStart, prevEnd),
    })

    // Prefetch next month only if it is not in the future
    const nextDate = new Date(refDate)
    nextDate.setMonth(nextDate.getMonth() + 1)
    const nextIsNotFuture =
      nextDate.getFullYear() < now.getFullYear() ||
      (nextDate.getFullYear() === now.getFullYear() &&
       nextDate.getMonth()    <= now.getMonth())

    if (nextIsNotFuture) {
      const { start: nextStart, end: nextEnd } = monthRange(
        nextDate.getFullYear(),
        nextDate.getMonth()
      )
      queryClient.prefetchQuery({
        queryKey: ['energy', 'daily-breakdown', nextStart, nextEnd],
        queryFn:  () => api.getDailyBreakdown(nextStart, nextEnd),
      })
    }
  }, [refDate])


  // ── Chart data ────────────────────────────────────────────────────────────

  const chartData = useMemo(() =>
    (breakdown?.data ?? []).map(d => {
      const homeRaw = Number(d.home_kwh) || 0
      const fromGrid = Number(d.grid_import_kwh) || 0
      const selfConsumed = Number(d.self_consumed_kwh) || 0
      const homeEffective = Math.max(homeRaw, selfConsumed + fromGrid)

      return {
        label:                  dayLabel(d.date),
        solar_kwh:              Number(d.solar_kwh) || 0,
        home_kwh:               homeEffective,
        grid_import_kwh:        fromGrid,
        grid_export_kwh:        Number(d.grid_export_kwh) || 0,
        battery_charged_kwh:    Number(d.battery_charged_kwh) || 0,
        battery_discharged_kwh: Number(d.battery_discharged_kwh) || 0,
      }
    }),
    [breakdown]
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">

          {/* Title */}
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Energy Breakdown</CardTitle>
          </div>

          {/* Month navigation */}
          <PeriodPicker 
            currentDate={refDate} 
            onDateChange={setRefDate} 
            minDate={minDate}
          />

        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 flex flex-col gap-3">

        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          // Dim the chart while re-fetching (e.g. navigating months) instead
          // of replacing it with a spinner — less jarring UX.
          <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <ChartContainer config={chartConfig} className="h-50 w-full">
              <BarChart data={chartData} barCategoryGap="20%" barGap={1}>
                <CartesianGrid
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
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
                        <p className="text-muted-foreground font-medium mb-1.5">{label}</p>
                        {payload
                          .filter(p => p.value > 0)
                          .map(p => {
                            const series = SERIES.find(s => s.key === p.dataKey)
                            return (
                              <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="inline-block w-2 h-2 rounded-full"
                                    style={{ background: series?.color }}
                                  />
                                  <span className="text-muted-foreground">{series?.label}</span>
                                </div>
                                <span className="font-bold text-foreground">
                                  {Number(p.value).toFixed(2)}
                                  <span className="font-normal text-muted-foreground ml-1">kWh</span>
                                </span>
                              </div>
                            )
                          })}
                      </div>
                    )
                  }}
                />
                {SERIES.map(s => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    fill={s.color}
                    radius={[3, 3, 0, 0]}
                    hide={!activeSeries[s.key]}
                    maxBarSize={8}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </div>
        )}

        {/* Series toggles */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {SERIES.map(s => (
            <SeriesToggle
              key={s.key}
              label={s.label}
              color={s.color}
              active={activeSeries[s.key]}
              onClick={() => toggleSeries(s.key)}
            />
          ))}
        </div>

      </CardContent>
    </Card>
  )
}