/**
 * DailyCurveCard.jsx — Today's energy flow curve.
 *
 * Area chart with gradient fill using shadcn ChartContainer.
 * Toggleable series for all 6 energy flows.
 *
 * Data source: /energy/history (default: today)
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useHistory } from '../hooks/useGrowatt'
import SeriesToggle from './SeriesToggle'

// ── Series config ─────────────────────────────────────────────────────────────

const SERIES = [
  { key: 'solar_w',             label: 'Solar',             color: '#f59e0b' },
  { key: 'home_w',              label: 'Home',              color: '#9f1239' },
  { key: 'battery_charge_w',    label: 'Battery charge',    color: '#3b82f6' },
  { key: 'battery_discharge_w', label: 'Battery discharge', color: '#8b5cf6' },
  { key: 'grid_import_w',       label: 'Grid import',       color: '#ef4444' },
  { key: 'grid_export_w',       label: 'Grid export',       color: '#10b981' },
]

// chartConfig required by ChartContainer for tooltips and theming
const chartConfig = Object.fromEntries(
  SERIES.map(s => [s.key, { label: s.label, color: s.color }])
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function timeLabel(timeStr) {
  return timeStr?.slice(11, 16) ?? ''
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function DailyCurveCard() {
  const today = localToday()
  const { data: history, isLoading } = useHistory(today, today)

  const [active, setActive] = useState(
    () => Object.fromEntries(SERIES.map(s => [s.key, true]))
  )

  function toggle(key) {
    setActive(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const chartData = (history?.data ?? [])
    .filter(d => d.solar_w >= 0)
    .map(d => ({
      time:                 timeLabel(d.time),
      solar_w:              d.solar_w ?? 0,
      home_w:               d.home_w ?? 0,
      battery_charge_w:     d.battery_charge_w ?? 0,
      battery_discharge_w:  d.battery_discharge_w ?? 0,
      grid_import_w:        d.grid_import_w ?? 0,
      grid_export_w:        d.grid_export_w ?? 0,
    }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Today's energy flow</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 flex flex-col gap-3">

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet for today.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-55 w-full">
            <AreaChart data={chartData} margin={{ left: 0, right: 0 }}>

              {/* Gradient definitions — one per series */}
              <defs>
                {SERIES.map(s => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={s.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />

              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                tickFormatter={v => `${(v / 1000).toFixed(1)}`}
                unit=" kW"
                width={48}
              />

              <ChartTooltip
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
                                <span className="inline-block w-2 h-2 rounded-full" style={{ background: series?.color }} />
                                <span className="text-muted-foreground">{series?.label}</span>
                                </div>
                                <span className="font-bold text-foreground">
                                {(p.value / 1000).toFixed(2)} kW
                                </span>
                            </div>
                            )
                        })}
                    </div>
                    )
                }}
                />

              {SERIES.map(s => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.key}
                  stroke={s.color}
                  strokeWidth={active[s.key] ? 2 : 0}
                  fill={`url(#grad-${s.key})`}
                  fillOpacity={active[s.key] ? 1 : 0}
                  dot={false}
                  activeDot={active[s.key] ? { r: 3 } : false}
                />
              ))}

            </AreaChart>
          </ChartContainer>
        )}

        {/* Series toggles */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {SERIES.map(s => (
            <SeriesToggle
              key={s.key}
              label={s.label}
              color={s.color}
              active={active[s.key]}
              onClick={() => toggle(s.key)}
            />
          ))}
        </div>

      </CardContent>
    </Card>
  )
}