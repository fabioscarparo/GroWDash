/**
 * HistoricalChart.jsx — Historical solar energy production bar chart.
 *
 * Header: day/month/year selector + total for the period.
 * Period navigation with prev/next arrows.
 *
 * Data source: /energy/aggregate
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { BarChart2, ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { useAggregate } from '../hooks/useGrowatt'

// ── Chart config ───────────────────────────────────────────────────────────────

const chartConfig = {
  energy: { label: 'Energy', color: 'var(--primary)' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthRange(year, month) {
  const start = new Date(year, month, 1)
  const end   = new Date(year, month + 1, 0)
  const fmt   = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(start), end: fmt(end) }
}

function dayLabel(dateStr) {
  return String(new Date(dateStr + 'T12:00:00').getDate())
}

function monthLabel(dateStr) {
  return new Date(dateStr + '-01T12:00:00').toLocaleString('en', { month: 'short' })
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function HistoricalChart() {
  const [timeUnit, setTimeUnit] = useState('day')
  const [refDate, setRefDate]   = useState(new Date())
  const [activeBar, setActiveBar] = useState(null)

  // ── Date range ────────────────────────────────────────────────────────────

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
    startDate   = '2020-01-01'
    endDate     = `${new Date().getFullYear()}-12-31`
    periodLabel = 'All time'
  }

  const { data: aggregate, isLoading } = useAggregate(startDate, endDate, timeUnit)

  // ── Navigation ────────────────────────────────────────────────────────────

  function prev() {
    const d = new Date(refDate)
    if (timeUnit === 'day')   d.setMonth(d.getMonth() - 1)
    if (timeUnit === 'month') d.setFullYear(d.getFullYear() - 1)
    setRefDate(d)
    setActiveBar(null)
  }

  function next() {
    const d = new Date(refDate)
    if (timeUnit === 'day')   d.setMonth(d.getMonth() + 1)
    if (timeUnit === 'month') d.setFullYear(d.getFullYear() + 1)
    setRefDate(d)
    setActiveBar(null)
  }

  const now = new Date()
  const isCurrentPeriod =
    (timeUnit === 'day'   && refDate.getFullYear() === now.getFullYear() && refDate.getMonth() === now.getMonth()) ||
    (timeUnit === 'month' && refDate.getFullYear() === now.getFullYear())

  // ── Chart data ────────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    let data = (aggregate?.data ?? []).map(d => ({
      label: timeUnit === 'day'
        ? dayLabel(d.date)
        : timeUnit === 'month'
          ? monthLabel(d.date)
          : d.date,
      energy: Number(d.energy),
      dateStr: d.date, // Keep original date for filtering
    }))

    // When viewing current month, filter out future days
    if (timeUnit === 'day' && isCurrentPeriod) {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      data = data.filter(d => d.dateStr <= todayStr)
    }

    // Remove the dateStr before returning for chart display
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
          <div className="flex items-center gap-3">
            {/* Unit Selector First */}
            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              {['day', 'month', 'year'].map(u => (
                <button
                  key={u}
                  onClick={() => { setTimeUnit(u); setActiveBar(null) }}
                  className={`px-2.5 py-1 capitalize transition-colors ${
                    timeUnit === u
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="md:hidden">{u.charAt(0).toUpperCase()}</span>
                  <span className="hidden md:inline">{u.charAt(0).toUpperCase() + u.slice(1)}</span>
                </button>
              ))}
            </div>

            {/* Navigation Second */}
            {timeUnit !== 'year' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={prev}
                  className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-muted-foreground font-medium min-w-[70px] text-center">{periodLabel}</span>
                <button
                  onClick={next}
                  disabled={isCurrentPeriod}
                  className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>


      </CardHeader>

      <CardContent className="px-3 pb-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
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