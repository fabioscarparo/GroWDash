/**
 * SelfSufficiencyChart.jsx — Monthly home consumption breakdown.
 *
 * Stacked bar chart showing for each day how home energy was covered:
 *   - From solar direct (panels → loads, not via battery)
 *   - From battery discharge
 *   - From grid
 *
 * This mirrors the logic of EnergyBreakdownCard on the Overview page,
 * applied to historical daily data instead of today's live totals.
 *
 * Derivation from daily-breakdown fields:
 *   from_solar   = home_kwh - grid_import_kwh - battery_discharged_kwh
 *   from_battery = battery_discharged_kwh
 *   from_grid    = grid_import_kwh
 *   total        = home_kwh  (the three segments always sum to home_kwh)
 *
 * Navigation: prev/next arrows to move between months.
 * Adjacent months are prefetched in the background so navigation
 * feels instant after the first load.
 *
 * Data source: /energy/daily-breakdown
 */

import { useState, useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { BarChart2, ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useDailyBreakdown } from '../hooks/useGrowatt'
import { api } from '../api/growatt'
import { Skeleton } from '@/components/ui/skeleton'
import PeriodPicker from './PeriodPicker'

// ── Chart config ──────────────────────────────────────────────────────────────

const chartConfig = {
  from_solar:   { label: 'From solar',   color: '#f59e0b' },
  from_battery: { label: 'From battery', color: '#8b5cf6' },
  from_grid:    { label: 'From grid',    color: '#ef4444' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthRange(year, month) {
  const start = new Date(year, month, 1)
  const end   = new Date(year, month + 1, 0)
  const fmt   = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(start), end: fmt(end) }
}

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayLabel(dateStr) {
  return String(new Date(dateStr + 'T12:00:00').getDate())
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SelfSufficiencyChart() {
  const [refDate, setRefDate] = useState(new Date())

  // ── Date range ────────────────────────────────────────────────────────────

  const today = new Date()

  const isCurrentMonth =
    refDate.getFullYear() === today.getFullYear() &&
    refDate.getMonth()    === today.getMonth()

  const { start: startDate, end: monthEndDate } = monthRange(
    refDate.getFullYear(),
    refDate.getMonth()
  )

  const endDate     = isCurrentMonth ? fmt(today) : monthEndDate
  const periodLabel = refDate.toLocaleString('en', { month: 'long', year: 'numeric' })

  const { data: breakdown, isLoading, isFetching } = useDailyBreakdown(startDate, endDate)

  // ── Prefetch adjacent months ──────────────────────────────────────────────

  const queryClient = useQueryClient()

  useEffect(() => {
    const now = new Date()

    const prevDate = new Date(refDate)
    prevDate.setMonth(prevDate.getMonth() - 1)
    const { start: prevStart, end: prevEnd } = monthRange(prevDate.getFullYear(), prevDate.getMonth())
    queryClient.prefetchQuery({
      queryKey: ['energy', 'daily-breakdown', prevStart, prevEnd],
      queryFn:  () => api.getDailyBreakdown(prevStart, prevEnd),
    })

    const nextDate = new Date(refDate)
    nextDate.setMonth(nextDate.getMonth() + 1)
    const nextIsNotFuture =
      nextDate.getFullYear() < now.getFullYear() ||
      (nextDate.getFullYear() === now.getFullYear() &&
       nextDate.getMonth()    <= now.getMonth())

    if (nextIsNotFuture) {
      const { start: nextStart, end: nextEnd } = monthRange(nextDate.getFullYear(), nextDate.getMonth())
      queryClient.prefetchQuery({
        queryKey: ['energy', 'daily-breakdown', nextStart, nextEnd],
        queryFn:  () => api.getDailyBreakdown(nextStart, nextEnd),
      })
    }
  }, [refDate])

  // ── Navigation ────────────────────────────────────────────────────────────

  function prev() {
    setRefDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })
  }

  function next() {
    setRefDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })
  }

  // ── Chart data ────────────────────────────────────────────────────────────

  const chartData = useMemo(() =>
    (breakdown?.data ?? []).map(d => {
      const home        = Math.max(0, d.home_kwh)
      const fromGrid    = Math.max(0, d.grid_import_kwh)
      const fromBattery = Math.max(0, d.battery_discharged_kwh)
      const fromSolar   = Math.max(0, home - fromGrid - fromBattery)
      return {
        label:        dayLabel(d.date),
        from_solar:   Math.round(fromSolar   * 100) / 100,
        from_battery: Math.round(fromBattery * 100) / 100,
        from_grid:    Math.round(fromGrid    * 100) / 100,
      }
    }),
    [breakdown]
  )

  // ── Monthly totals ────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const solar   = chartData.reduce((s, d) => s + d.from_solar,   0)
    const battery = chartData.reduce((s, d) => s + d.from_battery, 0)
    const grid    = chartData.reduce((s, d) => s + d.from_grid,    0)
    const home    = solar + battery + grid
    return {
      solar:   solar.toFixed(1),
      battery: battery.toFixed(1),
      grid:    grid.toFixed(1),
      home:    home.toFixed(1),
      selfSufficiency: home > 0 ? Math.round((solar + battery) / home * 100) : 0,
    }
  }, [chartData])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Home Consumption</CardTitle>
          </div>

          <PeriodPicker 
            currentDate={refDate} 
            onDateChange={setRefDate} 
          />

        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 flex flex-col gap-3">

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-[200px] w-full" />
            <div className="flex justify-center gap-4">
               <Skeleton className="h-4 w-20" />
               <Skeleton className="h-4 w-20" />
               <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          <>
            {/* Monthly summary */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Solar</p>
                <p className="text-sm font-bold" style={{ color: chartConfig.from_solar.color }}>
                  {totals.solar}
                  <span className="text-xs font-normal text-muted-foreground ml-1">kWh</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Battery</p>
                <p className="text-sm font-bold" style={{ color: chartConfig.from_battery.color }}>
                  {totals.battery}
                  <span className="text-xs font-normal text-muted-foreground ml-1">kWh</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Grid</p>
                <p className="text-sm font-bold" style={{ color: chartConfig.from_grid.color }}>
                  {totals.grid}
                  <span className="text-xs font-normal text-muted-foreground ml-1">kWh</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Self-suff.</p>
                <p className="text-sm font-bold text-foreground">{totals.selfSufficiency}%</p>
              </div>
            </div>

            {/* Stacked bar chart */}
            <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <ChartContainer config={chartConfig} className="h-50 w-full">
                <BarChart data={chartData} barCategoryGap="25%">
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
                      const solar   = payload.find(p => p.dataKey === 'from_solar')?.value   ?? 0
                      const battery = payload.find(p => p.dataKey === 'from_battery')?.value ?? 0
                      const grid    = payload.find(p => p.dataKey === 'from_grid')?.value    ?? 0
                      const total   = solar + battery + grid
                      const pct     = total > 0 ? Math.round((solar + battery) / total * 100) : 0
                      return (
                        <div className="bg-background border border-border rounded px-3 py-2 text-xs shadow-md">
                          <p className="text-muted-foreground font-medium mb-1.5">{label}</p>
                          {[
                            { key: 'from_solar',   value: solar,   label: 'From solar' },
                            { key: 'from_battery', value: battery, label: 'From battery' },
                            { key: 'from_grid',    value: grid,    label: 'From grid' },
                          ].map(row => (
                            <div key={row.key} className="flex items-center justify-between gap-4 mb-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full" style={{ background: chartConfig[row.key].color }} />
                                <span className="text-muted-foreground">{row.label}</span>
                              </div>
                              <span className="font-bold text-foreground">
                                {Number(row.value).toFixed(2)}
                                <span className="font-normal text-muted-foreground ml-1">kWh</span>
                              </span>
                            </div>
                          ))}
                          <div className="h-px bg-border my-1" />
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Self-sufficiency</span>
                            <span className="font-bold text-foreground">{pct}%</span>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="from_solar"   stackId="home" fill={chartConfig.from_solar.color}   radius={[0, 0, 0, 0]} />
                  <Bar dataKey="from_battery" stackId="home" fill={chartConfig.from_battery.color} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="from_grid"    stackId="home" fill={chartConfig.from_grid.color}    radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4">
              {Object.entries(chartConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: cfg.color }} />
                  <span className="text-xs text-muted-foreground">{cfg.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

      </CardContent>
    </Card>
  )
}