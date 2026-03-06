/**
 * DailyCurveCard.jsx — Today's energy flow curve.
 *
 * Line chart showing 5-minute snapshots for today with toggleable series:
 *   - Solar production (ppv)
 *   - Home consumption (pacToLocalLoad)
 *   - Battery charge (bdc1ChargePower)
 *   - Battery discharge (bdc1DischargePower)
 *   - Grid import (pacToUserTotal)
 *   - Grid export (pacToGridTotal)
 *
 * Data source: /energy/history (default: today)
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import {
  LineChart, Line,
  XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns today's date as YYYY-MM-DD using local timezone.
 */
function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Extracts HH:MM from a "YYYY-MM-DD HH:MM:SS" string.
 */
function timeLabel(timeStr) {
  return timeStr?.slice(11, 16) ?? ''
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground font-medium mb-1.5">{label}</p>
      {payload.map(p => (
        p.value > 0 && (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-muted-foreground">{p.name}</span>
            </div>
            <span className="font-bold text-foreground">
              {(p.value / 1000).toFixed(2)} kW
            </span>
          </div>
        )
      ))}
    </div>
  )
}


// ── Component ──────────────────────────────────────────────────────────────────

export default function DailyCurveCard() {
  const today = localToday()
  const { data: history, isLoading } = useHistory(today, today)

  // All series active by default
  const [active, setActive] = useState(
    () => Object.fromEntries(SERIES.map(s => [s.key, true]))
  )

  function toggle(key) {
    setActive(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Map history data to chart format — filter out negative values
  const chartData = (history?.data ?? [])
    .filter(d => d.solar_w >= 0)
    .map(d => ({
      time: timeLabel(d.time),
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

        

        {/* Chart */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet for today.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(1)}`}
                unit=" kW"
                width={48}
              />
              <Tooltip content={<ChartTooltip />} />
              {SERIES.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={active[s.key] ? 2 : 0}
                  dot={false}
                  activeDot={active[s.key] ? { r: 3 } : false}
                  hide={!active[s.key]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
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