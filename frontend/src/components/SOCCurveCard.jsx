/**
 * SocCurveCard.jsx — Battery state of charge curve for today.
 *
 * Area chart showing SOC (%) over the course of the day.
 * Data source: /energy/history → soc_pct
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { BatteryCharging } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useHistory } from '../hooks/useGrowatt'

const chartConfig = {
  soc_pct: { label: 'SOC', color: '#22c55e' },
}

/**
 * Resolves the localized "YYYY-MM-DD" short date string strictly anchored to the host device's active timezone.
 *
 * @function localToday
 * @returns {string} The localized short-date string constraint.
 */
function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Extracts and formats the 24-hour localized short time from an API ISO string.
 *
 * @function timeLabel
 * @param {string} timeStr - Unprocessed API datetime string.
 * @returns {string} Truncated string representation strictly containing "HH:MM".
 */
function timeLabel(timeStr) {
  return timeStr?.slice(11, 16) ?? ''
}

/**
 * SocCurveCard visually maps the continuous progression of the battery's energy density 
 * (State of Charge %) across the active calendar day using an Area charting topology.
 *
 * It dynamically tracks and connects non-zero recorded indices filtering out extraneous low-load states 
 * mapping them into a localized spline format.
 *
 * @component
 * @returns {JSX.Element} The enclosed tracking visualization Card element.
 */
export default function SocCurveCard() {
  const today = localToday()
  
  /** 
   * Fetches historical 5-minute interval data for today.
   */
  const { data: history, isLoading } = useHistory(today, today)

  const chartData = (history?.data ?? [])
    .filter(d => d.soc_pct > 0)
    .map(d => ({
      time: timeLabel(d.time),
      soc_pct: d.soc_pct,
    }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BatteryCharging size={16} className="text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Battery State of Charge</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet for today.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-40 w-full">
            <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10 }}>
              <defs>
                <linearGradient id="grad-soc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
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
                domain={[0, 100]}
                unit="%"
                width={36}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-background border border-border rounded px-3 py-2 text-xs shadow-md">
                      <p className="text-muted-foreground font-medium mb-1">{label}</p>
                      <p className="font-bold text-foreground">
                        {payload[0].value}
                        <span className="font-normal text-muted-foreground ml-1">%</span>
                      </p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="soc_pct"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#grad-soc)"
                dot={false}
                activeDot={{ r: 3 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}