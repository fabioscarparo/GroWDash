/**
 * HistoricalChart.jsx — Historical energy production bar chart.
 *
 * Shows aggregated energy production with three granularities:
 *   day   → one bar per day of the selected month, navigate by month
 *   month → one bar per month of the selected year, navigate by year
 *   year  → one bar per year (all time), no navigation
 *
 * Data source: /energy/aggregate
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react'
import {
  BarChart, Bar,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useAggregate } from '../hooks/useGrowatt'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns start and end date strings for a given month.
 * @param {number} year
 * @param {number} month - 0-indexed
 */
function monthRange(year, month) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(start), end: fmt(end) }
}

/**
 * Extracts the day number from a YYYY-MM-DD string (e.g. "6").
 */
function dayLabel(dateStr) {
  return String(new Date(dateStr + 'T12:00:00').getDate())
}

/**
 * Returns a short month name from a YYYY-MM string (e.g. "Mar").
 */
function monthLabel(dateStr) {
  return new Date(dateStr + '-01T12:00:00').toLocaleString('en', { month: 'short' })
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded px-2 py-1 text-xs shadow">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-foreground">
        {Number(payload[0].value).toFixed(2)} kWh
      </p>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function HistoricalChart() {
  const [timeUnit, setTimeUnit] = useState('month')
  const [refDate, setRefDate] = useState(new Date())

  // ── Date range based on selected time unit ────────────────────────────────

  let startDate, endDate, periodLabel

  if (timeUnit === 'day') {
    const { start, end } = monthRange(refDate.getFullYear(), refDate.getMonth())
    startDate = start
    endDate = end
    periodLabel = refDate.toLocaleString('en', { month: 'long', year: 'numeric' })
  } else if (timeUnit === 'month') {
    startDate = `${refDate.getFullYear()}-01-01`
    endDate = `${refDate.getFullYear()}-12-31`
    periodLabel = String(refDate.getFullYear())
  } else {
    startDate = '2020-01-01'
    endDate = `${new Date().getFullYear()}-12-31`
    periodLabel = 'All time'
  }

  const { data: aggregate, isLoading } = useAggregate(startDate, endDate, timeUnit)

  // ── Navigation ────────────────────────────────────────────────────────────

  function prev() {
    const d = new Date(refDate)
    if (timeUnit === 'day') d.setMonth(d.getMonth() - 1)
    else if (timeUnit === 'month') d.setFullYear(d.getFullYear() - 1)
    setRefDate(d)
  }

  function next() {
    const d = new Date(refDate)
    if (timeUnit === 'day') d.setMonth(d.getMonth() + 1)
    else if (timeUnit === 'month') d.setFullYear(d.getFullYear() + 1)
    setRefDate(d)
  }

  // Disable next button if already at current period
  const now = new Date()
  const isCurrentPeriod =
    (timeUnit === 'day' &&
      refDate.getFullYear() === now.getFullYear() &&
      refDate.getMonth() === now.getMonth()) ||
    (timeUnit === 'month' && refDate.getFullYear() === now.getFullYear())

  // ── Chart data ────────────────────────────────────────────────────────────

  const chartData = (aggregate?.data ?? []).map(d => ({
    label: timeUnit === 'day'
      ? dayLabel(d.date)
      : timeUnit === 'month'
        ? monthLabel(d.date)
        : d.date,
    energy: Number(d.energy),
  }))

  return (
    <Card>
      <CardHeader>

        {/* Title + time unit selector */}
        <div className="flex items-center justify-between">
          <BarChart2 size={16} className="text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Production</CardTitle>
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            {['day', 'month', 'year'].map(u => (
              <button
                key={u}
                onClick={() => setTimeUnit(u)}
                className={`px-2.5 py-1 capitalize transition-colors ${
                  timeUnit === u
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Period navigation — hidden for "year" */}
        {timeUnit !== 'year' && (
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={prev}
              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium text-foreground">{periodLabel}</span>
            <button
              onClick={next}
              disabled={isCurrentPeriod}
              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                unit=" kWh"
                width={50}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="energy"
                fill="#006fff"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}